// Shared helpers + MERCH CONFIG (single source of truth: prices are decided HERE, never trusted from the browser)
const crypto = require('crypto');

/* ===================== EDIT HERE ===================== */
const MERCH = {
  moq: 50,                                   // minimum pieces before the bulk order is placed
  deadline: '2026-10-31T23:59:59+05:30',     // pre-order closes (IST)
  advancePercent: 100,                       // 50..100 -> % of total collected online now
  nameMax: 14,                               // max characters printed as the name
  maxQtyPerLine: 5,
  // PRICES BELOW ARE PLACEHOLDERS. Replace with: (vendor cost + print + packing + gateway fee) / (1 - margin)
  products: [
    { sku: 'council-hoodie', title: 'Council Hoodie', edition: 'Council Edition', type: 'hoodie', price: 1050, color: '#111827', ink: '#FFFFFF', spot: 'Name on sleeve', sizes: ['S','M','L','XL','XXL'] },
    { sku: 'nss-tee',        title: 'NSS Tee',        edition: 'NSS Edition',     type: 'tee',    price: 550,  color: '#FFFFFF', ink: '#004BFE', spot: 'Name on back',   sizes: ['S','M','L','XL','XXL'] },
    { sku: 'media-tee',      title: 'Media Team Tee', edition: 'Media Team',      type: 'tee',    price: 550,  color: '#FFD60A', ink: '#004BFE', spot: 'Name on back',   sizes: ['S','M','L','XL','XXL'] },
    { sku: 'student-tee',    title: 'Student Tee',    edition: 'Students',        type: 'tee',    price: 550,  color: '#002DAA', ink: '#FFD60A', spot: 'Name on back',   sizes: ['S','M','L','XL','XXL'] }
  ]
};
/* ===================================================== */

const env = (k) => String(process.env[k] || '').trim().replace(/^["']|["']$/g, '');
const RZP_BASE = 'https://api.razorpay.com/v1';

function send(res, code, obj, headers = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function rzp(path, method = 'GET', body) {
  const keyId = env('RAZORPAY_KEY_ID');
  const keySecret = env('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) {
    const e = new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in Vercel environment variables.');
    e.status = 500;
    throw e;
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const r = await fetch(RZP_BASE + path, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data.error?.description || data.error?.message || data.message || `Razorpay API error (${r.status})`;
    const e = new Error(msg);
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    const e = new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL is not configured in Vercel environment variables.');
    e.status = 500;
    throw e;
  }
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) { const e = new Error((data && data.message) || 'Database error'); e.status = r.status; throw e; }
  return data;
}

/* Catalog + settings now live in Supabase (editable from /admin). MERCH above is only the fallback. */
async function getCatalog() {
  const fb = { settings: { moq: MERCH.moq, deadline: MERCH.deadline, advancePercent: MERCH.advancePercent, nameMax: MERCH.nameMax, maxQty: MERCH.maxQtyPerLine, open: true, announcement: '' },
               products: MERCH.products.map((p, i) => ({ ...p, images: [], description: '', active: true, soldout: false, sort: i })) };
  try {
    const [p, st] = await Promise.all([sb('merch_products?select=*&order=sort.asc,created_at.asc'), sb('merch_settings?select=*&id=eq.1')]);
    if (!Array.isArray(p)) return fb;
    const x = (st && st[0]) || {};
    return {
      settings: {
        moq: x.moq ?? fb.settings.moq, deadline: x.deadline || fb.settings.deadline, advancePercent: x.advance_percent ?? fb.settings.advancePercent,
        nameMax: x.name_max ?? fb.settings.nameMax, maxQty: x.max_qty ?? fb.settings.maxQty, open: x.is_open !== false, announcement: x.announcement || ''
      },
      products: p.map(r => ({ sku: r.sku, title: r.title, edition: r.edition || '', type: r.type, price: r.price, color: r.color, ink: r.ink, spot: r.spot || '',
        sizes: Array.isArray(r.sizes) ? r.sizes : ['S', 'M', 'L', 'XL', 'XXL'], images: Array.isArray(r.images) ? r.images : [], description: r.description || '',
        active: r.active !== false, soldout: !!r.soldout, sort: r.sort || 0 }))
    };
  } catch (e) { return fb; }
}
const closedReason = (st) => !st.open ? 'Store is paused for now.' : (Date.now() > new Date(st.deadline).getTime() ? 'Pre-orders are closed.' : '');
const siteUrl = (req) => (env('SITE_URL') || `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '');

function verifyPaymentSignature({ order_id, payment_id, signature }) {
  if (!order_id || !payment_id || !signature) return false;
  const secret = env('RAZORPAY_KEY_SECRET');
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${order_id}|${payment_id}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = env('RAZORPAY_WEBHOOK_SECRET');
  if (!secret || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  MERCH,
  send,
  readBody,
  rzp,
  sb,
  getCatalog,
  closedReason,
  siteUrl,
  verifyPaymentSignature,
  verifyWebhookSignature,
  env
};
