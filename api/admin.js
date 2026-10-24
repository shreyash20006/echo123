// ONE endpoint for the whole admin panel. Every call is checked against the Google account (Supabase JWT) + ADMIN_EMAILS.
const crypto = require('crypto');
const { send, readBody, sb, getCatalog, env } = require('./_lib');

const STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'];
const adminList = () => (env('ADMIN_EMAILS') || 'sb108750@gmail.com').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

async function whoIsAdmin(req) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tok) return null;
  const r = await fetch(env('SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY'), Authorization: 'Bearer ' + tok } });
  if (!r.ok) return null;
  const u = await r.json();
  const email = String(u.email || '').toLowerCase();
  return u.email_confirmed_at && adminList().includes(email) ? email : null;
}

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const int = (v, lo, hi, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const hex = (v, d) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : d;
const PUB = () => env('SUPABASE_URL') + '/storage/v1/object/public/merch/';

const actions = {
  async load() {
    const [orders, cat, st] = await Promise.all([sb('merch_orders?select=*&order=created_at.desc&limit=2000'), getCatalog(), sb('merch_settings?select=*&id=eq.1').catch(() => [])]);
    return { orders: orders || [], products: cat.products, settings: (st && st[0]) || null, admins: adminList() };
  },

  async order_update(b) {
    const id = str(b.order_id, 50);
    if (!/^[A-Za-z0-9_-]{6,50}$/.test(id)) throw bad('Bad order id');
    const patch = {};
    if (b.status !== undefined) { if (!STATUSES.includes(b.status)) throw bad('Bad status'); patch.status = b.status; if (b.status === 'PAID') patch.paid_at = new Date().toISOString(); }
    if (b.delivered !== undefined) patch.delivered = !!b.delivered;
    if (b.admin_note !== undefined) patch.admin_note = str(b.admin_note, 500);
    await sb(`merch_orders?order_id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
    return { ok: true };
  },

  async product_save(b) {
    const p = b.product || {};
    const sku = str(p.sku, 40).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(sku)) throw bad('SKU: only a-z, 0-9 and - (min 2 chars)');
    const title = str(p.title, 60); if (title.length < 2) throw bad('Title is required');
    const price = int(p.price, 1, 50000, 0); if (!price) throw bad('Enter a valid price');
    const sizes = (Array.isArray(p.sizes) ? p.sizes : []).map(s => str(s, 6).toUpperCase()).filter(Boolean).slice(0, 12);
    if (!sizes.length) throw bad('Add at least one size');
    const images = (Array.isArray(p.images) ? p.images : []).filter(u => typeof u === 'string' && u.startsWith(PUB())).slice(0, 8);
    const row = { sku, title, edition: str(p.edition, 40), type: ['tee', 'hoodie', 'other'].includes(p.type) ? p.type : 'tee', price,
      color: hex(p.color, '#FFFFFF'), ink: hex(p.ink, '#004BFE'), spot: str(p.spot, 40), sizes, images, description: str(p.description, 500),
      active: p.active !== false, soldout: !!p.soldout, sort: int(p.sort, 0, 999, 0) };
    await sb('merch_products?on_conflict=sku', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: row });
    return { ok: true, sku };
  },

  async product_delete(b) {
    const sku = str(b.sku, 40);
    await sb(`merch_products?sku=eq.${encodeURIComponent(sku)}`, { method: 'DELETE', prefer: 'return=minimal' });
    return { ok: true };
  },

  async settings_save(b) {
    const s = b.settings || {};
    const d = new Date(s.deadline); if (isNaN(d)) throw bad('Enter a valid deadline');
    const row = { id: 1, moq: int(s.moq, 1, 5000, 50), deadline: d.toISOString(), advance_percent: int(s.advance_percent, 50, 100, 100),
      name_max: int(s.name_max, 3, 30, 14), max_qty: int(s.max_qty, 1, 20, 5), is_open: s.is_open !== false, announcement: str(s.announcement, 160) };
    await sb('merch_settings?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: row });
    return { ok: true };
  },

  async upload(b) {
    const sku = str(b.sku, 40).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'misc';
    const mime = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[b.type];
    if (!mime) throw bad('Only JPG, PNG or WEBP images');
    const buf = Buffer.from(String(b.data || ''), 'base64');
    if (!buf.length || buf.length > 3.5 * 1024 * 1024) throw bad('Image is too large (max ~3 MB after compression)');
    const path = `products/${sku}/${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${mime}`;
    const key = env('SUPABASE_SERVICE_ROLE_KEY');
    const r = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/merch/${path}`, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': b.type, 'x-upsert': 'false' }, body: buf });
    if (!r.ok) { console.error('upload', await r.text()); throw bad('Upload failed. Did you run merch.sql (storage bucket)?', 500); }
    return { url: PUB() + path };
  },

  async image_delete(b) {
    const u = String(b.url || '');
    if (!u.startsWith(PUB())) throw bad('Bad url');
    const key = env('SUPABASE_SERVICE_ROLE_KEY'), path = u.slice(PUB().length);
    await fetch(`${env('SUPABASE_URL')}/storage/v1/object/merch/${path}`, { method: 'DELETE', headers: { apikey: key, Authorization: 'Bearer ' + key } });
    return { ok: true };
  }
};

function bad(msg, code = 400) { const e = new Error(msg); e.status = code; e.expose = true; return e; }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const who = await whoIsAdmin(req);
    if (!who) return send(res, 403, { error: 'Not an admin account.' });
    let b; try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Bad request' }); }
    const fn = actions[b.action];
    if (!fn) return send(res, 400, { error: 'Unknown action' });
    send(res, 200, await fn(b), { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('admin', e.message);
    send(res, e.expose ? e.status : 500, { error: e.expose ? e.message : 'Server error' });
  }
};
