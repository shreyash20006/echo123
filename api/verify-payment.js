const { send, readBody, sb, verifyPaymentSignature } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    let b;
    try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Bad request' }); }

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b || {};
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return send(res, 400, { error: 'Missing payment details for verification.' });
    }

    const valid = verifyPaymentSignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!valid) {
      return send(res, 400, { error: 'Invalid payment signature. Verification failed.' });
    }

    // Mark order as PAID in Supabase
    await sb(`merch_orders?order_id=eq.${encodeURIComponent(order_id)}&status=in.(PENDING,FAILED)`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        status: 'PAID',
        payment_id: razorpay_payment_id,
        cf_payment_id: razorpay_payment_id, // keep for backward compatibility
        rzp_order_id: razorpay_order_id,
        paid_at: new Date().toISOString()
      }
    });

    send(res, 200, {
      ok: true,
      order_id,
      payment_id: razorpay_payment_id,
      status: 'PAID'
    });
  } catch (e) {
    console.error('verify-payment error:', e.message);
    send(res, 500, { error: e.message || 'Payment verification failed' });
  }
};
