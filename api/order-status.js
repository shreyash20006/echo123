const { send, cf, sb } = require('./_lib');

module.exports = async (req, res) => {
  const id = String((req.query && req.query.order_id) || new URL(req.url, 'http://x').searchParams.get('order_id') || '');
  if (!/^[A-Za-z0-9_-]{6,50}$/.test(id)) return send(res, 400, { error: 'Bad order id' });
  try {
    const rows = await sb(`merch_orders?select=order_id,items,qty,total,amount_due,status&order_id=eq.${encodeURIComponent(id)}`);
    const o = rows && rows[0];
    if (!o) return send(res, 404, { error: 'Order not found' });
    let status = o.status;
    if (status !== 'PAID') {
      // Don't trust the browser: ask Cashfree directly.
      const c = await cf('/orders/' + encodeURIComponent(id));
      if (c.order_status === 'PAID' && Number(c.order_amount) === Number(o.amount_due)) {
        await sb(`merch_orders?order_id=eq.${encodeURIComponent(id)}&status=in.(PENDING,FAILED)`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'PAID', paid_at: new Date().toISOString() } });
        status = 'PAID';
      } else if (['EXPIRED', 'TERMINATED', 'TERMINATION_REQUESTED'].includes(c.order_status)) status = 'FAILED';
    }
    send(res, 200, { order_id: o.order_id, status, qty: o.qty, total: o.total, due: o.amount_due, items: o.items }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('order-status', e.message);
    send(res, 500, { error: 'Could not check the order.' });
  }
};
