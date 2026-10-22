/* ===== ECHO.TGPCOP shared script: navbar, footer, animations, Supabase Google login, Wall of Love, Instagram strip ===== */
const ENV = (typeof window !== 'undefined' && window.__ENV__) || {};
const C={
  URL: ENV.SUPABASE_URL || '',
  KEY: ENV.SUPABASE_ANON_KEY || '',
  LOGO: ENV.CLOUDINARY_LOGO_URL || 'echo_logo_white_transparent.png',
  IG: 'https://instagram.com/echo.tgpcop',
  MAIL: 'Media@tgpcop.site'
};
const IGP=[/* {i:'IMAGE_URL',u:'https://instagram.com/p/POST_ID'} */];
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sb=null,io;
function shell(){
 document.body.insertAdjacentHTML('afterbegin','<div id="fl"></div>');
 if(!$('#lb'))document.body.insertAdjacentHTML('beforeend','<div id="lb"></div>');
 const n=$('#nav');if(n)n.innerHTML=`<div class="marq"><div id="mq"></div></div><nav><div class="wrap"><a href="index.html"><img src="${C.LOGO}" alt="Echo TGPCOP Media"></a><button id="menu" aria-label="Menu">☰</button><div class="links" id="links"><a href="index.html">Home</a><a href="index.html#about">About</a><a href="events.html">Events</a><a href="index.html#work">Work</a><a href="team.html">Team</a><a href="collab.html">Collab</a><span id="auth"></span><a class="btn" href="${C.IG}" target="_blank" rel="noopener">Follow Us</a></div></div></nav>`;
 const f=$('#foot');if(f)f.innerHTML=`<footer><div class="wrap"><img src="${C.LOGO}" alt=""><p><b>Capturing Campus. Creating Memories.</b></p><p>Events • Reels • Photography • Creatives</p><p class="soc"><a href="mailto:${C.MAIL}">${C.MAIL}</a> | <a href="${C.IG}" target="_blank" rel="noopener">@echo.tgpcop</a></p><p style="opacity:.7;font-size:13px">© 2026 Echo.TGPCOP | Campus Media</p></div></footer>`;
 const m=$('#mq');if(m)m.innerHTML='<span>ECHO.TGPCOP</span><span>•</span><span>CAMPUS MEDIA</span><span>•</span>'.repeat(16);
 const L=$('#links');$('#menu')?.addEventListener('click',()=>L.classList.toggle('on'));L?.addEventListener('click',e=>{if(e.target.tagName=='A')L.classList.remove('on')});
}
function cnt(el){const to=+el.dataset.n,s=el.dataset.s||'+';let t0;const f=ts=>{t0=t0||ts;const p=Math.min((ts-t0)/1400,1);el.textContent=Math.round(to*p).toLocaleString()+(p==1?s:'');if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function rv(root=document){$$('.rv:not(.in)',root).forEach(e=>io.observe(e));$$('.tilt',root).forEach(c=>{c.onmousemove=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(700px) rotateY(${x*16}deg) rotateX(${-y*16}deg) scale(1.03)`};c.onmouseleave=()=>c.style.transform=''})}
function fx(){io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);$$('[data-n]',x.target).forEach(cnt)}}),{threshold:.15});rv()}
window.LB=h=>{const l=$('#lb');l.innerHTML=h;l.classList.add('on')};
document.addEventListener('click',e=>{const l=$('#lb');if(l&&l.classList.contains('on')&&e.target===l){l.classList.remove('on');l.innerHTML=''}});
/* ---- Supabase + Google login ---- */
function paint(u){window.USER=u||null;const a=$('#auth');
 if(a)a.innerHTML=u?`<img class="av" src="${esc(u.user_metadata?.avatar_url||'')}" alt=""><button class="btn o sm" id="out">Logout</button>`:`<a class="btn o sm" href="login.html">Login</a>`;
 $('#out')?.addEventListener('click',()=>sb.auth.signOut());document.dispatchEvent(new Event('echo-auth'))}
window.signIn=()=>sb?sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('index.html',location.href).href}}):alert('Setup pending: add Supabase keys in Vercel Environment Variables');
window.getSB=()=>sb;
window.ready=new Promise(res=>{
 if(!C.URL.startsWith('http')){paint(null);return res()}
 const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
 s.onload=async()=>{sb=supabase.createClient(C.URL,C.KEY);const{data}=await sb.auth.getSession();paint(data.session?.user);sb.auth.onAuthStateChange((_,x)=>paint(x?.user));res()};
 s.onerror=()=>{paint(null);res()};document.head.appendChild(s)});
/* ---- Wall of Love ---- */
const SAMPLE=[{name:'Campus Student',role:'Student',text:'Echo captures every fest so perfectly. The photos are always the best part of the day!'},{name:'Faculty Member',role:'Teacher',text:'Professional, creative and always on time. Proud of this student team.'},{name:'Club Member',role:'Student',text:'Their reels make our events go viral on campus. Love the Echo style!'}];
async function love(){const g=$('#lv');if(!g)return;await ready;let d=[];
 if(sb){const r=await sb.from('reviews').select('name,avatar,role,text').eq('approved',true).order('created_at',{ascending:false}).limit(12);d=r.data||[]}
 if(!d.length)d=SAMPLE;
 g.innerHTML=d.map((r,i)=>`<div class="lv rv" style="--r:${i%2?2:-2}deg"><p>“${esc(r.text)}”</p><div class="who">${r.avatar?`<img class="av" src="${esc(r.avatar)}" alt="">`:'<span class="av">💙</span>'}<div><b>${esc(r.name)}</b><small>${esc(r.role||'')}</small></div></div></div>`).join('');rv(g);
 const f=$('#lf');if(!f)return;
 const draw=()=>{f.innerHTML=window.USER?`<select id="lr"><option>Student</option><option>Teacher</option><option>Alumni</option><option>Other</option></select><textarea id="lt" maxlength="240" placeholder="Write a short review (max 240 characters)"></textarea><button class="btn" id="ls">Post Review</button><small id="lm"></small>`:`<a class="btn" href="login.html">Login with Google to write a review</a>`;
  $('#ls')?.addEventListener('click',async()=>{const t=$('#lt').value.trim();if(t.length<5||!sb)return;const u=window.USER,{error}=await sb.from('reviews').insert({user_id:u.id,name:u.user_metadata.full_name,avatar:u.user_metadata.avatar_url,role:$('#lr').value,text:t});$('#lm').textContent=error?'Could not post. Try again.':'Thanks! Your review will appear after approval.';if(!error)$('#lt').value=''})};
 draw();document.addEventListener('echo-auth',draw)}
/* ---- Instagram strip (manual posts, edit IGP above) ---- */
function ig(){const g=$('#igs');if(!g)return;const d=IGP.length?IGP:Array.from({length:6},()=>({}));
 const h=d.map(p=>`<a class="igt" href="${esc(p.u||C.IG)}" target="_blank" rel="noopener" ${p.i?`style="background-image:url('${esc(p.i)}')"`:''}>${p.i?'':'@echo.tgpcop'}</a>`).join('');g.innerHTML=`<div class="igr">${h+h}</div>`}
shell();fx();love();ig();
