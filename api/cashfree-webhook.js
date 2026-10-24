const { send, readBody, sb, verifyWebhook } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const raw = await readBody(req);
  if (!verifyWebhook(raw, req.headers['x-webhook-signature'], req.headers['x-webhook-timestamp'])) return send(res, 401, { error: 'Bad signature' });
  try {
    const ev = JSON.parse(raw), d = ev.data || {}, id = d.order && d.order.order_id, pay = d.payment || {};
    if (id && /^[A-Za-z0-9_-]{6,50}$/.test(id)) {
      if (ev.type === 'PAYMENT_SUCCESS_WEBHOOK' && pay.payment_status === 'SUCCESS') {
        const rows = await sb(`merch_orders?select=amount_due&order_id=eq.${encodeURIComponent(id)}`);
        if (rows && rows[0] && Number(d.order.order_amount) === Number(rows[0].amount_due)) {
          await sb(`merch_orders?order_id=eq.${encodeURIComponent(id)}&status=in.(PENDING,FAILED)`, { method: 'PATCH', prefer: 'return=minimal',
            body: { status: 'PAID', cf_payment_id: String(pay.cf_payment_id || ''), paid_at: new Date().toISOString() } });
        }
      } else if (ev.type === 'PAYMENT_FAILED_WEBHOOK' || ev.type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
        await sb(`merch_orders?order_id=eq.${encodeURIComponent(id)}&status=eq.PENDING`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'FAILED' } });
      }
    }
  } catch (e) { console.error('webhook', e.message); }
  send(res, 200, { ok: true });
};

module.exports.config = { api: { bodyParser: false } }; // raw body needed for the signature
