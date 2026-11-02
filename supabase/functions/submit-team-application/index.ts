import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://www.echotgpcopmedia.site',
  'https://echotgpcopmedia.site',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])
const departments = ['Photography','Videography','Video Editing','Reels & Content Creation','Cinematography','Graphic Designing','Poster & Banner Designing','Social Media Management','Content Writing','Script Writing','Anchoring / Hosting','Public Relations','Event Management','Event Coordination','Marketing & Promotions','Sponsorship & Outreach','Website / Technology','Other']
const skills = ['Photography','Videography','Editing','Graphic design','Writing','Hosting','Organisation','Communication','Marketing','Technology']
const software = ['Canva','Photoshop','Lightroom','Premiere Pro','DaVinci Resolve','CapCut','VN Editor','Other','None']
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

function json(body: unknown, status: number, origin: string | null) {
  const allow = origin && allowedOrigins.has(origin) ? origin : 'https://www.echotgpcopmedia.site'
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json', 'access-control-allow-origin': allow,
    'access-control-allow-headers': 'authorization, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS', 'vary': 'Origin',
  } })
}
const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length <= max ? v.trim() : ''
const arr = (v: unknown, allowed: string[], maxCount: number) => Array.isArray(v) && v.length <= maxCount && v.every(x => typeof x === 'string' && allowed.includes(x)) ? [...new Set(v)] : null
function validUrl(v: unknown): boolean {
  if (v === '' || v == null) return true
  if (typeof v !== 'string' || v.length > 500) return false
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' } catch { return false }
}
function validInstagram(v: string): boolean {
  try { const u = new URL(v); return u.protocol === 'https:' && ['instagram.com','www.instagram.com'].includes(u.hostname) && u.pathname.length > 1 } catch { return false }
}
async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: {
    'access-control-allow-origin': origin && allowedOrigins.has(origin) ? origin : 'https://www.echotgpcopmedia.site',
    'access-control-allow-headers': 'authorization, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS', 'vary': 'Origin',
  } })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)
  if (!origin || !allowedOrigins.has(origin)) return json({ error: 'Request origin is not allowed.' }, 403, origin)
  if (!supabaseUrl || !serviceKey) return json({ error: 'Application service is not configured yet.' }, 503, origin)
  const length = Number(req.headers.get('content-length') || 0)
  if (length > 4_500_000) return json({ error: 'Application is too large.' }, 413, origin)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid application data.' }, 400, origin) }
  // Honeypot. A filled field is rejected without attempting to store anything.
  if (str(body.website, 300)) return json({ error: 'Please refresh the form and try again.' }, 400, origin)

  const full_name = str(body.full_name, 120), email = str(body.email, 254).toLowerCase()
  const phone = str(body.phone, 25), college = str(body.college, 180)
  const instagram = str(body.instagram, 500)
  const chosenDepartments = arr(body.departments, departments, departments.length)
  const chosenSkills = arr(body.skills, skills, skills.length)
  const chosenSoftware = arr(body.software_tools, software, software.length)
  const links = body.portfolio_links && typeof body.portfolio_links === 'object' && !Array.isArray(body.portfolio_links) ? body.portfolio_links as Record<string, unknown> : {}
  if (full_name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 7 || !/^[+0-9() .-]{7,25}$/.test(phone) || college.length < 2 || !validInstagram(instagram) || !chosenDepartments?.length || !chosenSkills || !chosenSoftware) return json({ error: 'Please check the required fields and selections.' }, 422, origin)
  if (!['Beginner','Intermediate','Advanced','Professional',''].includes(str(body.experience_level, 30)) || !['1–3 hours','3–5 hours','5–8 hours','8+ hours',''].includes(str(body.weekly_availability, 30))) return json({ error: 'Please choose valid experience and availability options.' }, 422, origin)
  if (![body.declaration_accurate, body.declaration_selection, body.declaration_contact, body.declaration_work_permission, body.declaration_accepted].every(x => x === true)) return json({ error: 'All declaration checkboxes are required.' }, 422, origin)
  if (!Object.values(links).every(validUrl)) return json({ error: 'Please enter valid portfolio URLs beginning with http:// or https://.' }, 422, origin)

  const forwarded = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim()
  const ipHash = await sha256(forwarded)
  const { data: allowed, error: rateError } = await admin.rpc('consume_team_application_rate_limit', { p_ip_hash: ipHash })
  if (rateError) { console.error('Rate limit check failed:', rateError.message); return json({ error: 'Application service is temporarily unavailable.' }, 503, origin) }
  if (!allowed) return json({ error: 'Too many attempts. Please try again in about an hour.' }, 429, origin)

  let photoPath: string | null = null
  const photo = body.profile_photo as { name?: unknown; type?: unknown; data?: unknown } | null
  if (photo) {
    if (!['image/jpeg','image/png','image/webp'].includes(String(photo.type)) || typeof photo.data !== 'string' || photo.data.length > 4_200_000) return json({ error: 'Profile photo must be JPG, PNG or WebP and at most 3 MB.' }, 422, origin)
    try {
      const bytes = Uint8Array.from(atob(photo.data), c => c.charCodeAt(0))
      if (bytes.length > 3 * 1024 * 1024) return json({ error: 'Profile photo must be at most 3 MB.' }, 422, origin)
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
      const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
      if (!(photo.type === 'image/jpeg' ? isJpeg : photo.type === 'image/png' ? isPng : isWebp)) return json({ error: 'The selected file does not match its image type.' }, 422, origin)
      const ext = photo.type === 'image/jpeg' ? 'jpg' : photo.type === 'image/png' ? 'png' : 'webp'
      photoPath = `${crypto.randomUUID()}.${ext}`
      const { error } = await admin.storage.from('team-applications').upload(photoPath, bytes, { contentType: photo.type as string, upsert: false })
      if (error) throw error
    } catch (e) { console.error('Photo upload failed:', e); return json({ error: 'Photo upload failed. Remove the photo or try another image.' }, 500, origin) }
  }

  const row = {
    full_name, email, phone, college,
    course: str(body.course, 120) || null, academic_year: str(body.academic_year, 50) || null,
    instagram, profile_photo_path: photoPath,
    departments: chosenDepartments, other_department: str(body.other_department, 120) || null,
    skills: chosenSkills, experience_level: str(body.experience_level, 30) || null,
    worked_projects: ['Yes','No'].includes(str(body.worked_projects, 10)) ? str(body.worked_projects, 10) : null,
    previous_experience: str(body.previous_experience, 2000) || null,
    worked_organisation: ['Yes','No'].includes(str(body.worked_organisation, 10)) ? str(body.worked_organisation, 10) : null,
    previous_organisation: str(body.previous_organisation, 250) || null, software_tools: chosenSoftware,
    portfolio_links: { ...links, instagram }, weekly_availability: str(body.weekly_availability, 30) || null,
    event_availability: ['Yes','No','Depends'].includes(str(body.event_availability, 20)) ? str(body.event_availability, 20) : null,
    smartphone_available: ['Yes','No'].includes(str(body.smartphone_available, 10)) ? str(body.smartphone_available, 10) : null,
    team_comfort: ['Yes','No','Need to learn'].includes(str(body.team_comfort, 20)) ? str(body.team_comfort, 20) : null,
    preferred_role: ['Creative','Production','Management','Both','Open to any role'].includes(str(body.preferred_role, 30)) ? str(body.preferred_role, 30) : null,
    motivation: null, suitability: null, ideas: null,
    learning_goals: str(body.learning_goals, 2000) || null,
    declaration_accepted: true, declaration_accurate: true, declaration_selection: true,
    declaration_contact: true, declaration_work_permission: true,
  }
  const { data, error } = await admin.from('echo_team_applications').insert(row).select('id').single()
  if (error) {
    if (photoPath) await admin.storage.from('team-applications').remove([photoPath])
    if (error.code === '23505') return json({ error: 'An application already exists for this email address. Contact Echo if you need help.' }, 409, origin)
    console.error('Application insert failed:', error.message)
    return json({ error: 'We could not save your application. Please try again.' }, 500, origin)
  }
  return json({ id: data.id }, 201, origin)
})
