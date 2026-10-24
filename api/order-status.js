const { send, rzp, sb } = require('./_lib');

module.exports = async (req, res) => {
  const id = String((req.query && req.query.order_id) || new URL(req.url, 'http://x').searchParams.get('order_id') || '');
  if (!/^[A-Za-z0-9_-]{6,50}$/.test(id)) return send(res, 400, { error: 'Bad order id' });
  try {
    const rows = await sb(`merch_orders?select=order_id,rzp_order_id,items,qty,total,amount_due,status&order_id=eq.${encodeURIComponent(id)}`);
    const o = rows && rows[0];
    if (!o) return send(res, 404, { error: 'Order not found' });
    let status = o.status;
    if (status !== 'PAID' && o.rzp_order_id) {
      try {
        const c = await rzp('/orders/' + encodeURIComponent(o.rzp_order_id));
        if (c.status === 'paid' || (Number(c.amount_paid) >= Number(o.amount_due) * 100)) {
          await sb(`merch_orders?order_id=eq.${encodeURIComponent(id)}&status=in.(PENDING,FAILED)`, {
            method: 'PATCH',
            prefer: 'return=minimal',
            body: { status: 'PAID', paid_at: new Date().toISOString() }
          });
          status = 'PAID';
        }
      } catch (err) {
        console.warn('rzp check order status:', err.message);
      }
    }
    send(res, 200, { order_id: o.order_id, status, qty: o.qty, total: o.total, due: o.amount_due, items: o.items }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('order-status', e.message);
    send(res, 500, { error: 'Could not check the order.' });
  }
};
