const { send, readBody, sb, verifyWebhookSignature } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const raw = await readBody(req);
  const sig = req.headers['x-razorpay-signature'];

  if (!verifyWebhookSignature(raw, sig)) {
    return send(res, 401, { error: 'Bad signature' });
  }

  try {
    const ev = JSON.parse(raw);
    const event = ev.event;
    const payload = ev.payload || {};

    if (event === 'payment.captured' || event === 'order.paid') {
      const p = (payload.payment && payload.payment.entity) || {};
      const o = (payload.order && payload.order.entity) || {};
      const rzpOrderId = o.id || p.order_id;
      const orderId = (o.notes && o.notes.order_id) || (p.notes && p.notes.order_id);
      const paymentId = p.id;

      if (orderId) {
        await sb(`merch_orders?order_id=eq.${encodeURIComponent(orderId)}&status=in.(PENDING,FAILED)`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: {
            status: 'PAID',
            payment_id: String(paymentId || ''),
            cf_payment_id: String(paymentId || ''),
            rzp_order_id: String(rzpOrderId || ''),
            paid_at: new Date().toISOString()
          }
        });
      } else if (rzpOrderId) {
        await sb(`merch_orders?rzp_order_id=eq.${encodeURIComponent(rzpOrderId)}&status=in.(PENDING,FAILED)`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: {
            status: 'PAID',
            payment_id: String(paymentId || ''),
            cf_payment_id: String(paymentId || ''),
            paid_at: new Date().toISOString()
          }
        });
      }
    } else if (event === 'payment.failed') {
      const p = (payload.payment && payload.payment.entity) || {};
      const orderId = p.notes && p.notes.order_id;
      if (orderId) {
        await sb(`merch_orders?order_id=eq.${encodeURIComponent(orderId)}&status=eq.PENDING`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: { status: 'FAILED' }
        });
      }
    }
  } catch (e) {
    console.error('razorpay-webhook error:', e.message);
  }

  send(res, 200, { ok: true });
};

module.exports.config = { api: { bodyParser: false } };
