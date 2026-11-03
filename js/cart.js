/* Luxora cart page. Cart lives in localStorage ('luxora.cart'), shared with the assistant page. */
(() => {
  const $ = s => document.querySelector(s);
  const money = n => '$' + Number(n).toFixed(2);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = () => { try { return JSON.parse(localStorage.getItem('luxora.cart')) || []; } catch { return []; } };
  const save = () => { try { localStorage.setItem('luxora.cart', JSON.stringify(cart)); } catch {} };
  const catalog = Object.fromEntries((window.LuxoraOffline?.products || []).map(p => [p.id, p]));
  let cart = load();

  // shipping: free over $150, otherwise a flat sample rate
  const FREE_OVER = 150, FLAT = 9.99;
  const info = i => { const c = catalog[i.id] || {}; return { name: i.name || c.name || 'Product', store: i.store || c.store || 'Luxora', price: i.price ?? c.price ?? 0, p: { id: i.id, name: i.name || c.name } }; };
  const count = () => cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = () => cart.reduce((s, i) => s + info(i).price * i.qty, 0);
  const shipping = () => (cart.length === 0 || subtotal() >= FREE_OVER ? 0 : FLAT);

  function render() {
    const badge = $('#cartBadge'); badge.textContent = count(); badge.hidden = count() === 0;
    const lines = $('#lines'), sum = $('#summary'), grid = $('#grid');
    if (!cart.length) {
      grid.innerHTML = `<section class="empty"><span data-logo class="logo__mark"></span><h2>Your cart is empty</h2><p>Ask the Luxora assistant for a recommendation and tap + to add products here.</p><a class="btn" href="app.html">Continue shopping</a></section>`;
      LuxoraArt.hydrate(grid); return;
    }
    if (!lines || !lines.isConnected) { grid.innerHTML = '<section class="lines" id="lines" aria-label="Cart items"></section><aside class="summary" id="summary" aria-label="Order summary"></aside>'; return render(); }
    lines.innerHTML = cart.map((i, idx) => {
      const d = info(i);
      return `<article class="line">
        <div class="line__img">${LuxoraArt.product(d.p)}</div>
        <div><div class="line__store">${esc(d.store)}</div><h2 class="line__name">${esc(d.name)}</h2>
          <div class="line__opts"><span>Size: ${esc(i.size)}</span><span><i class="dot c-${esc(i.color)}"></i>${esc(i.color[0].toUpperCase() + i.color.slice(1))}</span></div>
          <div class="line__ctl"><div class="qty"><button data-dec="${idx}" aria-label="Decrease quantity of ${esc(d.name)}">&minus;</button><span aria-live="polite">${i.qty}</span><button data-inc="${idx}" aria-label="Increase quantity of ${esc(d.name)}">+</button></div>
          <button class="rm" data-rm="${idx}">Remove</button></div></div>
        <div class="line__price">${money(d.price * i.qty)}${i.qty > 1 ? `<small>${money(d.price)} each</small>` : ''}</div></article>`;
    }).join('');
    const sub = subtotal(), ship = shipping();
    sum.innerHTML = `<h2>Order summary</h2>
      <div class="row"><span>Subtotal (${count()} item${count() > 1 ? 's' : ''})</span><b>${money(sub)}</b></div>
      <div class="row"><span>Shipping</span><b>${ship === 0 ? 'Free' : money(ship)}</b></div>
      ${ship > 0 ? `<p class="ship-hint">Add <b>${money(FREE_OVER - sub)}</b> more for free shipping.</p>` : ''}
      <div class="row total"><span>Total</span><b>${money(sub + ship)}</b></div>
      <button class="btn" id="checkout">Checkout (demo)</button>
      <a class="btn btn--ghost" href="app.html">Continue shopping</a>`;
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.inc != null) { const i = cart[+t.dataset.inc]; i.qty = Math.min(9, i.qty + 1); save(); render(); }
    else if (t.dataset.dec != null) { const i = cart[+t.dataset.dec]; i.qty = Math.max(1, i.qty - 1); save(); render(); }
    else if (t.dataset.rm != null) { cart.splice(+t.dataset.rm, 1); save(); render(); }
    else if (t.id === 'checkout') demo();
    else if (t.id === 'demoClose') { $('#demo').close(); render(); }
  });

  function demo() {
    const sub = subtotal(), ship = shipping();
    $('#demoId').textContent = 'Reference DEMO-' + Math.floor(100000 + Math.random() * 900000) + ' (not a real order)';
    $('#demoList').innerHTML = cart.map(i => { const d = info(i); return `<div><span>${i.qty} × ${esc(d.name)}</span><span>${money(d.price * i.qty)}</span></div>`; }).join('')
      + `<div><span>Shipping</span><span>${ship === 0 ? 'Free' : money(ship)}</span></div><div><span>Total</span><span>${money(sub + ship)}</span></div>`;
    cart = []; save();   // demo order "placed": empty the cart
    $('#demo').showModal();
  }
  $('#demo').addEventListener('close', render);
  window.addEventListener('storage', e => { if (e.key === 'luxora.cart') { cart = load(); render(); } });
  render();
})();
