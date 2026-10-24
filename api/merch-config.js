const { CF_MODE, send, sb, getCatalog, closedReason } = require('./_lib');

module.exports = async (req, res) => {
  const cat = await getCatalog(), st = cat.settings;
  let paid = 0;
  try {
    const rows = await sb('merch_orders?select=qty&status=eq.PAID');
    paid = (rows || []).reduce((s, r) => s + (r.qty || 0), 0);
  } catch (e) { /* DB not ready: show 0 instead of breaking the page */ }
  const reason = closedReason(st);
  send(res, 200, {
    mode: CF_MODE, closed: !!reason, closedReason: reason, paid, announcement: st.announcement,
    moq: st.moq, deadline: st.deadline, advancePercent: st.advancePercent, nameMax: st.nameMax, maxQty: st.maxQty,
    products: cat.products.filter(p => p.active)
  }, { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' });
};
