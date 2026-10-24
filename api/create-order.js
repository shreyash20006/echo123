const crypto = require('crypto');
const { CF_MODE, send, readBody, cf, sb, getCatalog, closedReason, siteUrl } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const cat = await getCatalog(), st = cat.settings, why = closedReason(st);
    if (why) return send(res, 400, { error: why });
    let b; try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Bad request' }); }

    const buyer = b.buyer || {};
    const name = String(buyer.name || '').trim().slice(0, 60);
    const phone = String(buyer.phone || '').replace(/\D/g, '').slice(-10);
    const email = String(buyer.email || '').trim().slice(0, 80);
    const batch = String(buyer.batch || '').trim().slice(0, 40);
    if (name.length < 2) return send(res, 400, { error: 'Enter your full name.' });
    if (!/^[6-9]\d{9}$/.test(phone)) return send(res, 400, { error: 'Enter a valid 10-digit mobile number.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Enter a valid email.' });

    const lines = Array.isArray(b.items) ? b.items.slice(0, 12) : [];
    if (!lines.length) return send(res, 400, { error: 'Your order is empty.' });

    const items = []; let qty = 0, total = 0;
    for (const l of lines) {
      const p = cat.products.find(x => x.sku === l.sku && x.active && !x.soldout);
      const q = Math.floor(Number(l.qty));
      const printName = String(l.printName || '').toUpperCase().replace(/[^A-Z .]/g, '').trim();
      if (!p || !p.sizes.includes(l.size) || !(q >= 1 && q <= st.maxQty)) return send(res, 400, { error: 'Invalid item in order.' });
      if (!printName || printName.length > st.nameMax) return send(res, 400, { error: `Name to print is required (max ${st.nameMax} letters).` });
      items.push({ sku: p.sku, title: p.title, size: l.size, printName, qty: q, price: p.price });
      qty += q; total += p.price * q;
    }
    const due = Math.ceil(total * Math.min(100, Math.max(50, st.advancePercent)) / 100);
    const orderId = 'ECHO' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();

    await sb('merch_orders', { method: 'POST', prefer: 'return=minimal', body: {
      order_id: orderId, buyer_name: name, phone, email, batch, items, qty, total, amount_due: due, status: 'PENDING'
    }});

    const site = siteUrl(req);
    const cfo = await cf('/orders', 'POST', {
      order_id: orderId,
      order_amount: due,
      order_currency: 'INR',
      order_note: `Echo Merch pre-order (${qty} pcs)`,
      customer_details: { customer_id: 'c' + phone, customer_name: name, customer_email: email, customer_phone: phone },
      order_meta: { return_url: `${site}/merch.html?order_id={order_id}`, notify_url: `${site}/api/cashfree-webhook` }
    });
    send(res, 200, { order_id: orderId, payment_session_id: cfo.payment_session_id, mode: CF_MODE, total, due });
  } catch (e) {
    console.error('create-order error:', e.message, e.data || '');
    const detail = (e.data && (e.data.message || e.data.sub_code)) || e.message || 'Could not start payment.';
    send(res, e.status || 500, { error: detail });
  }
};
