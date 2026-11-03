/* Luxora shop: plain e-commerce store (no assistant). Product list, detail view, cart drawer, demo checkout. */
(() => {
  const $ = s => document.querySelector(s);
  const S = window.LuxoraStore, money = S.money, esc = S.esc, Art = window.LuxoraArt;
  const products = window.LuxoraOffline.products, byId = Object.fromEntries(products.map(p => [p.id, p]));
  const CATS = [['all', 'All'], ['smart-rings', 'Smart rings'], ['smartwatches', 'Smartwatches'], ['earbuds', 'Earbuds'], ['headphones', 'Headphones'], ['deals', 'Deals']];
  const D = window.LuxoraDeals, inCat = (p, k) => k === 'all' || (k === 'deals' ? !!p.deal : p.category === k), dealsOn = () => D.list.length > 0;
  const priceHtml = p => p.deal ? `<span class="pr"><strong class="pr__now">${money(p.price)}</strong> <s>${money(p.listPrice)}</s></span>` : `<strong>${money(p.price)}</strong>`;
  const st = { cat: 'all', sort: 'featured', q: '' };
  const heart = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  const cname = c => c[0].toUpperCase() + c.slice(1);
  S.bind();
  const goSaved = () => { location.hash = '#/saved'; };
  let returnTo = '#/shop';

  function toast(t, link) {
    const el = $('#toast'); el.textContent = t;
    if (link) { const a = document.createElement('button'); a.className = 'toast__link'; a.textContent = link[0]; a.onclick = link[1]; el.append(' · ', a); }
    el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3500);
  }
  const addToCart = (p, o) => { const l = S.addToCart(p, o); toast(`Added ${l.qty} × ${p.name} to cart`, ['View cart', openDrawer]); };

  /* ---------- list ---------- */
  function filtered() {
    const q = st.q.trim().toLowerCase();
    let list = products.filter(p => inCat(p, st.cat) && (!q || [p.name, p.store, p.category.replace('-', ' '), ...p.tags].join(' ').toLowerCase().includes(q)));
    if (st.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (st.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (st.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }
  function cardHtml(p) {
    const on = S.isSaved(p.id);
    return `<article class="pcard">
      <a class="pcard__img" href="#/shop/p/${p.id}" aria-label="View ${esc(p.name)}">${p.deal ? `<span class="dealtag" title="Sample deal">-${p.deal.discountPercent}%</span>` : ''}<span class="a">${Art.product(p, 0)}</span><span class="b">${Art.product(p, 1)}</span></a>
      <button class="pcard__heart ${on ? 'on' : ''}" data-heart="${p.id}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Save'} ${esc(p.name)}">${heart}</button>
      <div class="pcard__body"><div class="pcard__store">${esc(p.store)}</div>
        <h3><a href="#/shop/p/${p.id}">${esc(p.name)}</a></h3>
        <div class="rate"><span class="stars">${S.stars(p.rating)}</span> <span>${p.rating.toFixed(1)} (${esc(p.reviews)})</span></div>
        <div class="pcard__foot">${priceHtml(p)}<button class="btn btn--sm" data-add="${p.id}">Add to cart</button></div></div></article>`;
  }
  function renderDeals() {
    const box = $('#dealsBox'), show = dealsOn() && st.cat === 'all' && !st.q.trim();
    box.hidden = !show; if (!show) return;
    box.innerHTML = `<div class="deals__head"><div><h2>Deals</h2><p>Limited-time prices on selected products. <b class="deals__sample">Sample deals for this demo.</b></p></div><button class="btn btn--ghost btn--sm" data-cat="deals">See all deals</button></div>
      <div class="deals__grid">${D.list.map(d => { const p = byId[d.productId]; return `<article class="dealcard">
        <a class="dealcard__img" href="#/shop/p/${p.id}" aria-label="View ${esc(p.name)}">${Art.product(p, 0)}<span class="dealtag">-${d.discountPercent}%</span></a>
        <div class="dealcard__body"><span class="dealcard__flag">Sample deal</span><h3><a href="#/shop/p/${p.id}">${esc(p.name)}</a></h3>
          <p class="dealcard__head">${esc(d.headline.replace(/^Sample deal:\s*/i, ''))}</p>
          <div class="dealcard__price"><strong>${money(p.price)}</strong> <s>${money(p.listPrice)}</s> <small>${esc(D.endsText(d.endsAt))}</small></div>
          <button class="btn btn--sm" data-add="${p.id}">Add to cart</button></div></article>`; }).join('')}</div>`;
  }
  document.addEventListener('luxora:deals', () => { if (shown) { if (!$('#listView').hidden) renderList(); else { const m = location.hash.match(/^#\/shop\/p\/([\w-]+)/); if (m && byId[m[1]]) renderDetail(byId[m[1]]); } } renderDrawer(); });
  const leaveDetail = () => { if (/^#\/shop\/p\//.test(location.hash)) location.hash = '#/shop'; };
  function renderList() {
    if (st.cat === 'deals' && !dealsOn()) st.cat = 'all';
    const cats = CATS.filter(c => c[0] !== 'deals' || dealsOn());
    $('#cats').innerHTML = cats.map(([k, label]) => {
      const n = products.filter(p => inCat(p, k)).length;
      return `<button role="tab" class="cat ${st.cat === k ? 'on' : ''}" data-cat="${k}" aria-selected="${st.cat === k}">${label} <small>${n}</small></button>`;
    }).join('');
    const list = filtered();
    renderDeals();
    $('#listTitle').textContent = st.q ? `Results for "${st.q}"` : (CATS.find(c => c[0] === st.cat)[1] === 'All' ? 'All products' : CATS.find(c => c[0] === st.cat)[1]);
    $('#count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    $('#grid').innerHTML = list.length ? list.map(cardHtml).join('') : `<div class="none"><h3>No products found</h3><p>Try another search or category.</p><button class="btn btn--sm" data-cat="all" id="reset">Show all products</button></div>`;
  }
  $('#cats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { st.cat = b.dataset.cat; renderList(); } });
  $('#dealsBox').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { st.cat = b.dataset.cat; renderList(); } });
  $('#sort').addEventListener('change', e => { st.sort = e.target.value; renderList(); });
  $('#shopQ').addEventListener('input', e => { st.q = e.target.value; leaveDetail(); renderList(); });
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); leaveDetail(); });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]'); if (a) { addToCart(byId[a.dataset.add]); return; }
    const h = e.target.closest('[data-heart]'); if (h) {
      const p = byId[h.dataset.heart], on = S.toggleSaved(p); h.classList.toggle('on', on); h.setAttribute('aria-pressed', on);
      toast(on ? `Saved ${p.name}` : `Removed ${p.name} from saved`, on ? ['View saved', goSaved] : null);
    }
  });

  /* ---------- detail ---------- */
  function renderDetail(p) {
    const d = { size: p.sizes[0], color: p.colors[0], qty: 1, view: 0 };
    const root = $('#detailView');
    const draw = () => {
      const on = S.isSaved(p.id), related = products.filter(x => x.category === p.category && x.id !== p.id).concat(products.filter(x => x.category !== p.category)).slice(0, 4);
      root.innerHTML = `
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a> / <a href="#/shop?cat=${p.category}">${CATS.find(c => c[0] === p.category)[1]}</a> / <span>${esc(p.name)}</span></nav>
        <div class="detail">
          <div class="gallery"><div class="gallery__main">${Art.product(p, d.view)}</div>
            <div class="gallery__thumbs">${Array.from({ length: Art.VIEWS }, (_, i) => `<button class="${i === d.view ? 'on' : ''}" data-view="${i}" aria-label="Photo ${i + 1}">${Art.product(p, i)}</button>`).join('')}</div></div>
          <div class="info">
            <div class="pcard__store">${esc(p.store)}</div><h1>${esc(p.name)}</h1>
            <div class="rate"><span class="stars">${S.stars(p.rating)}</span> <span>${p.rating.toFixed(1)} (${esc(p.reviews)} reviews)</span></div>
            <div class="price">${priceHtml(p)}</div>${p.deal ? `<div class="dealnote"><span class="dealtag dealtag--inline">-${p.deal.discountPercent}%</span> <b>Sample deal.</b> ${esc(D.endsText(p.deal.endsAt))}. ${esc(p.deal.headline.replace(/^Sample deal:\s*/i, ''))}</div>` : ''}
            <p class="desc">${esc(p.description || '')}</p>
            <div class="opt"><span class="lbl">Size</span><select id="dSize" aria-label="Size">${p.sizes.map(s => `<option ${s === d.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="opt"><span class="lbl">Color: <b>${cname(d.color)}</b></span><div class="sw" id="dSw">${p.colors.map(c => `<button type="button" class="c-${c} ${c === d.color ? 'on' : ''}" data-c="${c}" aria-label="${c}" aria-pressed="${c === d.color}">${c === d.color ? '&#10003;' : ''}</button>`).join('')}</div></div>
            <div class="opt"><span class="lbl">Quantity</span><div class="qty"><button id="dMinus" aria-label="Decrease">&minus;</button><span id="dQ">${d.qty}</span><button id="dPlus" aria-label="Increase">+</button></div></div>
            <div class="buyrow"><button class="btn btn--lg" id="dAdd">Add to cart</button><button class="btn btn--lg btn--orange" id="dBuy">Buy now</button>
              <button class="heartbtn ${on ? 'on' : ''}" id="dHeart" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save for later'}">${heart}</button></div>
            <ul class="perks"><li>Free standard shipping over ${money(S.FREE_OVER)}</li><li>30-day returns (sample policy)</li><li>Demo store: no real payment or delivery</li></ul>
          </div></div>
        <h2 class="rel__t">You may also like</h2><div class="grid grid--4">${related.map(cardHtml).join('')}</div>`;
    };
    draw();
    root.onclick = e => {
      const v = e.target.closest('[data-view]'); if (v) { d.view = +v.dataset.view; root.querySelector('.gallery__main').innerHTML = Art.product(p, d.view); root.querySelectorAll('.gallery__thumbs button').forEach((b, i) => b.classList.toggle('on', i === d.view)); }
      const c = e.target.closest('#dSw button'); if (c) { d.color = c.dataset.c; const s = $('#dSw'); s.querySelectorAll('button').forEach(b => { const on = b.dataset.c === d.color; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = on ? '&#10003;' : ''; }); s.previousElementSibling.innerHTML = `Color: <b>${cname(d.color)}</b>`; }
      if (e.target.closest('#dMinus')) { d.qty = Math.max(1, d.qty - 1); $('#dQ').textContent = d.qty; }
      if (e.target.closest('#dPlus')) { d.qty = Math.min(9, d.qty + 1); $('#dQ').textContent = d.qty; }
      if (e.target.closest('#dAdd')) addToCart(p, { size: $('#dSize').value, color: d.color, qty: d.qty });
      if (e.target.closest('#dBuy')) { S.addToCart(p, { size: $('#dSize').value, color: d.color, qty: d.qty }); openDrawer(); }
      if (e.target.closest('#dHeart')) { const on = S.toggleSaved(p, { size: $('#dSize').value, color: d.color }); const b = $('#dHeart'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); toast(on ? `Saved ${p.name}` : `Removed ${p.name} from saved`, on ? ['View saved', goSaved] : null); }
    };
  }

  /* ---------- views (the app router in router.js calls these) ---------- */
  let shown = false;
  function show(pid, query = {}) {
    shown = true;
    if (query.cat && CATS.some(c => c[0] === query.cat)) { st.cat = query.cat; st.q = ''; $('#shopQ').value = ''; }
    const p = pid && byId[pid], box = $('#viewShop');
    if (p) { $('#listView').hidden = true; $('#detailView').hidden = false; renderDetail(p); document.title = `${p.name} - Luxora`; box.scrollTop = 0; }
    else { $('#detailView').hidden = true; $('#listView').hidden = false; document.title = 'Shop - Luxora'; renderList(); }
  }
  const drawer = $('#drawer');
  function setDrawer(open) { if (open === !drawer.hidden) return; drawer.hidden = !open; if (open) { renderDrawer(); drawer.querySelector('.x').focus(); } }
  window.LuxoraShop = { show, setDrawer, isShown: () => shown, setReturn: h => { returnTo = h; }, checkout: () => openCheckout() };

  /* ---------- cart drawer ---------- */
  const openDrawer = () => { if (location.hash !== '#/cart') location.hash = '#/cart'; else setDrawer(true); };
  const closeDrawer = () => { if (location.hash === '#/cart') location.hash = returnTo; else setDrawer(false); };
  function renderDrawer() {
    const cart = S.cart(), body = $('#drawerBody'), foot = $('#drawerFoot');
    $('#drawerCount').textContent = cart.length ? `(${S.count()})` : '';
    if (!cart.length) { body.innerHTML = `<div class="none"><h3>Your cart is empty</h3><p>Add something you like from the store.</p><button class="btn btn--sm" data-close-drawer>Continue shopping</button></div>`; foot.innerHTML = ''; return; }
    body.innerHTML = cart.map((i, idx) => {
      const f = S.info(i);
      return `<article class="line"><a class="line__img" href="#/shop/p/${f.id}" data-close-drawer>${Art.product({ id: f.id, name: f.name })}</a>
        <div><div class="pcard__store">${esc(f.store)}</div><div class="line__name">${esc(f.name)}</div>
          <div class="line__opts">${esc(i.size)} &middot; <i class="dot c-${esc(i.color)}"></i>${cname(i.color)}</div>
          <div class="line__ctl"><div class="qty"><button data-dec="${idx}" aria-label="Decrease quantity of ${esc(f.name)}">&minus;</button><span>${i.qty}</span><button data-inc="${idx}" aria-label="Increase quantity of ${esc(f.name)}">+</button></div><button class="rm" data-rm="${idx}">Remove</button></div></div>
        <div class="line__price">${money(f.price * i.qty)}</div></article>`;
    }).join('');
    const sub = S.subtotal(), ship = S.shipping();
    foot.innerHTML = `<div class="row"><span>Subtotal</span><b>${money(sub)}</b></div>
      <div class="row"><span>Shipping</span><b>${ship === 0 ? 'Free' : money(ship)}</b></div>
      ${ship > 0 ? `<p class="hint">Add <b>${money(S.FREE_OVER - sub)}</b> more for free shipping.</p>` : ''}
      <div class="row total"><span>Total</span><b>${money(sub + ship)}</b></div>
      <button class="btn btn--lg" id="goCheckout">Checkout (demo)</button>
      <button class="btn btn--lg btn--ghost" data-close-drawer>Continue shopping</button>`;
  }
  drawer.addEventListener('click', e => {
    const t = e.target, q = a => t.closest(`[${a}]`);
    if (q('data-close-drawer') && !t.closest('a')) closeDrawer();
    let b;
    if ((b = q('data-inc'))) { const i = +b.dataset.inc; S.setQty(i, S.cart()[i].qty + 1); }
    else if ((b = q('data-dec'))) { const i = +b.dataset.dec; S.setQty(i, S.cart()[i].qty - 1); }
    else if ((b = q('data-rm'))) S.removeLine(+b.dataset.rm);
    else if (t.id === 'goCheckout') openCheckout();
  });
  document.addEventListener('luxora:change', () => { if (!drawer.hidden) renderDrawer(); });
  document.addEventListener('luxora:external', () => { if (!drawer.hidden) renderDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden && !dlg.open) closeDrawer(); });

  /* ---------- demo checkout (nothing is stored or sent anywhere) ---------- */
  const dlg = $('#checkout');
  let method = 'standard';
  function openCheckout() { if (!S.cart().length) return; method = 'standard'; stepDetails(); if (!dlg.open) dlg.showModal(); }
  const summary = () => {
    const sub = S.subtotal(), ship = S.shipping(method);
    return `<div class="sum">${S.cart().map(i => `<div><span>${i.qty} × ${esc(S.info(i).name)} <small>${esc(i.size)}, ${cname(i.color)}</small></span><span>${money(S.info(i).price * i.qty)}</span></div>`).join('')}
      <div><span>Subtotal</span><span>${money(sub)}</span></div><div><span>Shipping</span><span>${ship === 0 ? 'Free' : money(ship)}</span></div><div class="t"><span>Total</span><span>${money(sub + ship)}</span></div></div>`;
  };
  function stepDetails() {
    $('#coBody').innerHTML = `<h2 id="coTitle">Checkout</h2>
      <form id="coForm" autocomplete="off">
        <p class="fine">These fields are optional and are <b>never saved or sent anywhere</b>. Do not enter real personal or card details.</p>
        <label>Full name<input name="n" placeholder="Demo Shopper" autocomplete="off"></label>
        <label>Email<input name="e" type="text" inputmode="email" placeholder="demo@example.com" autocomplete="off"></label>
        <label>Shipping address<input name="a" placeholder="123 Sample Street" autocomplete="off"></label>
        <fieldset><legend>Delivery</legend>
          <label class="radio"><input type="radio" name="m" value="standard" ${method === 'standard' ? 'checked' : ''}> Standard (3-5 days) <b>${S.subtotal() >= S.FREE_OVER ? 'Free' : money(S.STANDARD)}</b></label>
          <label class="radio"><input type="radio" name="m" value="express" ${method === 'express' ? 'checked' : ''}> Express (1-2 days) <b>${money(S.EXPRESS)}</b></label></fieldset>
        <div class="paybox"><b>Payment</b><span>Demo payment. No card is requested and nothing is charged.</span></div>
        <div id="coSum">${summary()}</div>
        <div class="demo__btns"><button type="submit" class="btn btn--lg">Place demo order</button><button type="button" class="btn btn--lg btn--ghost" id="coCancel">Back to cart</button></div>
      </form>`;
    $('#coForm').onsubmit = e => { e.preventDefault(); placeOrder(); };
    $('#coForm').onchange = e => { if (e.target.name === 'm') { method = e.target.value; $('#coSum').innerHTML = summary(); } };
    $('#coCancel').onclick = () => dlg.close();
  }
  function placeOrder() {
    const html = summary(), ref = 'DEMO-' + Math.floor(100000 + Math.random() * 900000);
    S.clearCart();
    $('#coBody').innerHTML = `<h2 id="coTitle">Demo order placed</h2><p class="ref">Reference ${ref} &mdash; <b>not a real order</b></p>${html}
      <p class="fine"><b>No payment was taken and nothing will be shipped.</b> This confirmation only demonstrates the Luxora checkout flow with sample data.</p>
      <div class="demo__btns"><button class="btn btn--lg" id="coDone">Continue shopping</button><a class="btn btn--lg btn--ghost" href="#/saved" id="coSaved">View saved items</a></div>`;
    $('#coDone').onclick = () => { dlg.close(); closeDrawer(); }; $('#coSaved').onclick = () => dlg.close();
  }

})();
