/* Luxora shop: plain e-commerce store (no assistant). Product list, detail view, cart drawer, demo checkout. */
(() => {
  const $ = s => document.querySelector(s);
  const S = window.LuxoraStore, money = S.money, esc = S.esc, Art = window.LuxoraArt;
  const products = window.LuxoraOffline.products, byId = Object.fromEntries(products.map(p => [p.id, p]));
  const CATS = [['all', 'All'], ['smart-rings', 'Smart rings'], ['smartwatches', 'Smartwatches'], ['earbuds', 'Earbuds'], ['headphones', 'Headphones'], ['tablets', 'Tablets'], ['e-readers', 'E-readers'], ['smart-home', 'Smart home'], ['deals', 'Deals']];
  const D = window.LuxoraDeals, dealKey = p => Object.keys(p.variants || {}).find(k => p.variants[k].deal), inCat = (p, k) => k === 'all' || (k === 'deals' ? !!(p.deal || dealKey(p)) : p.category === k), dealsOn = () => D.list.length > 0;
  const priceHtml = p => p.deal && P().priceDrops ? `<span class="pr"><strong class="pr__now">${money(p.price)}</strong> <s>${money(p.listPrice)}</s></span>` : `<strong>${money(p.price)}</strong>`;
  const P = () => window.LuxoraPrefs.get();
  const st = { cat: 'all', sort: ['price-asc', 'price-desc'].includes(P().sort) ? P().sort : 'featured', q: '' };
  $('#sort').value = st.sort;
  const heart = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  const cname = c => c === 'midnight' ? 'Ceramic Midnight' : c[0].toUpperCase() + c.slice(1);
  const hashColor = () => (location.hash.match(/[?&]c=([\w-]+)/) || [])[1];
  S.bind();
  const goSaved = () => { location.hash = '#/saved'; };
  let returnTo = '#/shop';

  function toast(t, link) {
    const el = $('#toast'); el.textContent = t;
    if (link) { const a = document.createElement('button'); a.className = 'toast__link'; a.textContent = link[0]; a.onclick = link[1]; el.append(' · ', a); }
    el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3500);
  }
  const addToCart = (p, o) => { const l = S.addToCart(p, o); if (!l) return null; toast(`Added ${l.qty} × ${p.name} to cart`, ['View cart', openDrawer]); };

  /* ---------- list ---------- */
  /* search: every word of the query must appear in the product's name/brand/category/tags/variant names (punctuation such as "(A20 Pro)" ignored) */
  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function matches(p, q) {
    if (!q) return true;
    const hay = ' ' + norm([p.name, p.store, p.category.replace('-', ' '), ...(p.tags || []), ...Object.values(p.variants || {}).map(v => v.name + ' ' + (v.label || ''))].join(' ')) + ' ';
    const words = norm(q).split(' ').filter(Boolean);
    return words.length > 0 && words.every(w => hay.includes(' ' + w) || hay.includes(w));
  }
  function filtered() {
    const q = st.q.trim().toLowerCase();
    let list = products.filter(p => inCat(p, st.cat) && matches(p, q));
    if (st.cat === 'deals') list = list.map(p => p.deal || !dealKey(p) ? p : S.variant(p, dealKey(p)));   // Deals tab: show the variant that is on sale
    if (st.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (st.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else { const f = P(), w = p => (f.favCats.includes(p.category) ? 2 : 0) + (f.favBrands.includes(p.store) ? 1 : 0); if (f.favCats.length || f.favBrands.length) list = list.map((p, i) => [p, i]).sort((a, b) => w(b[0]) - w(a[0]) || a[1] - b[1]).map(x => x[0]); }
    return list;
  }
  function cardHtml(p) {
    const on = S.isSaved(p.id);
    return `<article class="pcard">
      <a class="pcard__img" href="#/shop/p/${p.id}${p.variantKey ? '?c=' + p.variantKey : ''}" aria-label="View ${esc(p.name)}">${p.deal && P().priceDrops ? `<span class="dealtag" title="Deal">-${p.deal.discountPercent}%</span>` : ''}<span class="a">${Art.product(p, 0)}</span><span class="b">${Art.product(p, 1)}</span>${Art.illus}</a>
      <button class="pcard__heart ${on ? 'on' : ''}" data-heart="${p.id}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Save'} ${esc(p.name)}">${heart}</button>
      <div class="pcard__body"><div class="pcard__store">${esc(p.store)}${S.preorderTag(p)}${P().budget && p.price > Number(P().budget) ? ' <span class="overtag">Over your budget</span>' : ''}</div>
        <h3><a href="#/shop/p/${p.id}${p.variantKey ? '?c=' + p.variantKey : ''}">${esc(p.name)}</a></h3>
        <div class="rate">${p.priceFrom ? 'From &middot; ' : ''}${S.checked(p).replace('Price checked', 'Checked')} &middot; ${esc(p.retailer.name)}</div>
        <div class="pcard__foot">${priceHtml(p)}<button class="btn btn--sm" data-add="${p.id}"${p.variantKey ? ` data-c="${p.variantKey}"` : ''}>${S.needsSize(p) ? 'Choose size' : 'Add to cart'}</button></div>
       </div></article>`;
  }
  function renderDeals() {
    const box = $('#dealsBox'), q = st.q.trim().toLowerCase();
    const items = P().dealAlerts && dealsOn() && st.cat !== 'deals' ? D.list.filter(d => { const p = byId[d.productId]; return p && inCat(p, st.cat) && matches(p, q); }) : [];
    box.hidden = !items.length; if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="deals__head"><div><h2>Deals</h2><p>Verified lower prices on selected products. <b class="deals__sample">Prices checked Nov 3–4, 2026; they can change at any time. Each price shows its own checked date.</b></p></div><button class="btn btn--ghost btn--sm" data-cat="deals">See all deals</button></div>
      <div class="deals__grid">${items.map(d => { const p = d.color ? S.variant(byId[d.productId], d.color) : byId[d.productId], href = `#/shop/p/${p.id}${d.color ? '?c=' + d.color : ''}`; return `<article class="dealcard">
        <a class="dealcard__img" href="${href}" aria-label="View ${esc(p.name)}">${Art.product(p, 0)}${P().priceDrops ? `<span class="dealtag">-${d.discountPercent}%</span>` : ''}</a>
        <div class="dealcard__body"><span class="dealcard__flag">Deal at ${esc(d.retailer || p.retailer.name)}</span><h3><a href="${href}">${esc(p.name)}</a></h3>
          <p class="dealcard__head">${esc(d.headline)}</p>
          <div class="dealcard__price"><strong>${money(p.price)}</strong> ${P().priceDrops ? `<s>${money(p.listPrice)}</s>` : ''} <small>${esc(D.endsText(d))}</small></div>
          <button class="btn btn--sm" data-add="${p.id}"${d.color ? ` data-c="${d.color}"` : ''}>${S.needsSize(p) ? 'Choose size' : 'Add to cart'}</button> </div></article>`; }).join('')}</div>`;
  }
  const COUNTRIES = { US: 'the United States', CA: 'Canada', GB: 'the United Kingdom', IN: 'India', DE: 'Germany', FR: 'France', ES: 'Spain', AU: 'Australia' };
  function region() { const f = $('#regionNote'); if (f) f.textContent = ` Shipping region: ${COUNTRIES[P().country] || 'the United States'} (shipping is set by the retailer). Prices shown in ${P().currency}${P().currency === 'USD' ? '' : ' at approximate rates, not live exchange rates'}.`; }
  document.addEventListener('luxora:prefs', () => {
    st.sort = ['price-asc', 'price-desc'].includes(P().sort) ? P().sort : 'featured'; $('#sort').value = st.sort; region();
    if (shown) { if (!$('#listView').hidden) renderList(); else { const m = location.hash.match(/^#\/shop\/p\/([\w-]+)/); if (m && byId[m[1]]) renderDetail(byId[m[1]], hashColor()); } } renderDrawer();
  });
  region();
  document.addEventListener('luxora:deals', () => { if (shown) { if (!$('#listView').hidden) renderList(); else { const m = location.hash.match(/^#\/shop\/p\/([\w-]+)/); if (m && byId[m[1]]) renderDetail(byId[m[1]], hashColor()); } } renderDrawer(); });
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
    const a = e.target.closest('[data-add]'); if (a) { const p = a.dataset.c ? S.variant(byId[a.dataset.add], a.dataset.c) : byId[a.dataset.add]; if (S.needsSize(p)) { location.hash = '#/shop/p/' + p.id + (a.dataset.c ? '?c=' + a.dataset.c : ''); toast(`Choose a size for ${p.name} first`); } else addToCart(p); return; }
    const h = e.target.closest('[data-heart]'); if (h) {
      const p = byId[h.dataset.heart], on = S.toggleSaved(p); h.classList.toggle('on', on); h.setAttribute('aria-pressed', on);
      toast(on ? `Saved ${p.name}` : `Removed ${p.name} from saved`, on ? ['View saved', goSaved] : null);
    }
  });

  /* ---------- detail ---------- */
  /* "You may also like": same category first, then related categories (tablets <-> e-readers <-> smart home, rings <-> watches, earbuds <-> headphones) */
  const REL = { 'tablets': ['e-readers', 'smart-home'], 'e-readers': ['tablets', 'smart-home'], 'smart-home': ['tablets', 'e-readers'], 'smart-rings': ['smartwatches'], 'smartwatches': ['smart-rings', 'earbuds'], 'earbuds': ['headphones', 'smartwatches'], 'headphones': ['earbuds'] };
  function relatedFor(p) {
    const order = [p.category, ...(REL[p.category] || [])], rank = x => { const i = order.indexOf(x.category); return i < 0 ? 99 : i; };
    return products.filter(x => x.id !== p.id && rank(x) < 99).sort((a, b) => rank(a) - rank(b)).slice(0, 4);
  }
  function renderDetail(base, color) {
    const d = { size: S.needsSize(base) ? '' : base.sizes[0], color: base.colors.includes(color) ? color : base.colors[0], qty: 1, view: 0 };
    let p = S.variant(base, d.color);
    const root = $('#detailView');
    const draw = () => {
      const on = S.isSaved(p.id), related = relatedFor(p);
      root.innerHTML = `
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a> / <a href="#/shop?cat=${p.category}">${CATS.find(c => c[0] === p.category)[1]}</a> / <span>${esc(p.name)}</span></nav>
        <div class="detail">
          <div class="gallery"><div class="gallery__main">${Art.product(p, d.view)}${Art.illus}</div>
            <div class="gallery__thumbs">${Array.from({ length: Art.VIEWS }, (_, i) => `<button class="${i === d.view ? 'on' : ''}" data-view="${i}" aria-label="Photo ${i + 1}">${Art.product(p, i)}</button>`).join('')}</div></div>
          <div class="info">
            <div class="pcard__store">${esc(p.store)}</div><h1>${esc(p.name)}</h1>
            <div class="rate">${S.checked(p)} &middot; at ${esc(p.retailer.name)}</div>${S.preorderTag(p) ? `<div class="preline">${S.preorderTag(p)}</div>` : ''}
            <div class="price">${p.priceFrom ? '<small class="from">From</small> ' : ''}${priceHtml(p)}</div>${p.deal && P().priceDrops ? `<div class="dealnote"><span class="dealtag dealtag--inline">-${p.deal.discountPercent}%</span> <b>Deal.</b> ${esc(D.endsText(p.deal))}. ${esc(p.deal.headline)} <span class="dealnote__src">Compared with ${esc(p.deal.listPriceSource || 'the listed price')}.${p.deal.sourceUrl ? ` <a href="${esc(p.deal.sourceUrl)}" target="_blank" rel="noopener noreferrer sponsored">Source<span class="sr-only"> (opens in a new tab)</span></a>` : ''}</span></div>` : ''}
            <p class="desc">${esc(p.description || '')}</p>
            <div class="opt"><span class="lbl">Size${S.needsSize(p) ? ' <small class="req">(required)</small>' : ''}</span><select id="dSize" aria-label="Size" ${S.needsSize(p) ? 'aria-required="true" aria-describedby="dSizeErr"' : ''}>${S.needsSize(p) ? '<option value="">Select a size</option>' : ''}${p.sizes.map(s => `<option ${s === d.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><p class="sizeerr" id="dSizeErr" role="alert" hidden>Please select a size before adding this to your cart.</p></div>
            ${base.colors[0] === 'standard' ? '' : `<div class="opt"><span class="lbl">Color: <b>${cname(d.color)}</b></span><div class="sw" id="dSw">${base.colors.map(c => `<button type="button" class="c-${c} ${c === d.color ? 'on' : ''}" data-c="${c}" aria-label="${cname(c)}" aria-pressed="${c === d.color}">${c === d.color ? '&#10003;' : ''}</button>`).join('')}</div></div>`}
            <div class="opt"><span class="lbl">Quantity</span><div class="qty"><button id="dMinus" aria-label="Decrease">&minus;</button><span id="dQ">${d.qty}</span><button id="dPlus" aria-label="Increase">+</button></div></div>
            <div class="buyat buyat--detail"><button type="button" class="btn btn--lg btn--orange" id="dBuyNow">Buy now</button></div>
            <p class="onote amzdisc">${S.DISCLOSURE} Amazon's price and availability can differ from the price shown here.</p>
            ${p.optionsNote ? `<p class="onote">${esc(p.optionsNote)}</p>` : ''}
            <p class="onote">Luxora doesn't sell this. ${S.preorder(p) ? 'Pre-order' : 'Buy now'} opens the product's store page in a new tab, where you buy and where shipping, returns and warranty are handled. The cart below is a demo.</p>
            <div class="buyrow"><button class="btn btn--lg btn--ghost" id="dAdd">Add to demo cart</button><button class="btn btn--lg btn--ghost" id="dBuy">Demo checkout</button>
              <button class="heartbtn ${on ? 'on' : ''}" id="dHeart" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save for later'}">${heart}</button></div>
            <ul class="perks"><li>Real shipping, returns and warranty come from the seller</li><li>Prices can change; always confirm at the retailer</li><li>Luxora's cart and checkout are a demo: no payment, no delivery</li></ul>
          </div></div>
        <h2 class="rel__t">You may also like</h2><div class="grid grid--4">${related.map(cardHtml).join('')}</div>`;
    };
    draw();
    root.onchange = e => { if (e.target.id === 'dSize') { $('#dSizeErr').hidden = true; e.target.removeAttribute('aria-invalid'); } };
    root.onclick = e => {
      const v = e.target.closest('[data-view]'); if (v) { d.view = +v.dataset.view; root.querySelector('.gallery__main').innerHTML = Art.product(p, d.view); root.querySelectorAll('.gallery__thumbs button').forEach((b, i) => b.classList.toggle('on', i === d.view)); }
      const c = e.target.closest('#dSw button'); if (c && base.variants) { const keep = $('#dSize') ? $('#dSize').value : d.size; d.color = c.dataset.c; d.size = keep; p = S.variant(base, d.color); history.replaceState(null, '', '#/shop/p/' + base.id + (p.variantKey ? '?c=' + p.variantKey : '')); draw(); return; }
      if (c) { d.color = c.dataset.c; const s = $('#dSw'); s.querySelectorAll('button').forEach(b => { const on = b.dataset.c === d.color; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = on ? '&#10003;' : ''; }); s.previousElementSibling.innerHTML = `Color: <b>${cname(d.color)}</b>`; }
      if (e.target.closest('#dMinus')) { d.qty = Math.max(1, d.qty - 1); $('#dQ').textContent = d.qty; }
      if (e.target.closest('#dPlus')) { d.qty = Math.min(9, d.qty + 1); $('#dQ').textContent = d.qty; }
      const sizeOk = () => { const sz = $('#dSize'), bad = S.needsSize(p) && !sz.value; $('#dSizeErr').hidden = !bad; bad ? sz.setAttribute('aria-invalid', 'true') : sz.removeAttribute('aria-invalid'); if (bad) sz.focus(); return !bad; };
      if (e.target.closest('#dBuyNow') && sizeOk()) {
  S.addToCart(p, { size: $('#dSize').value, color: d.color, qty: d.qty });
  openCheckout();
}
      if (e.target.closest('#dAdd') && sizeOk()) addToCart(p, { size: $('#dSize').value, color: d.color, qty: d.qty });
      if (e.target.closest('#dBuy') && sizeOk()) { S.addToCart(p, { size: $('#dSize').value, color: d.color, qty: d.qty }); openDrawer(); }
      if (e.target.closest('#dHeart')) { const on = S.toggleSaved(p, { size: $('#dSize').value, color: d.color }); const b = $('#dHeart'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); toast(on ? `Saved ${p.name}` : `Removed ${p.name} from saved`, on ? ['View saved', goSaved] : null); }
    };
  }

  /* ---------- views (the app router in router.js calls these) ---------- */
  let shown = false;
  function show(pid, query = {}) {
    shown = true;
    if (query.cat && CATS.some(c => c[0] === query.cat)) { st.cat = query.cat; st.q = ''; $('#shopQ').value = ''; }
    const p = pid && byId[pid], box = $('#viewShop');
    if (p) { $('#listView').hidden = true; $('#detailView').hidden = false; renderDetail(p, query.c); document.title = `${p.name} - Luxora`; box.scrollTop = 0; }
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
      return `<article class="line"><a class="line__img" href="#/shop/p/${f.id}${f.variantKey ? '?c=' + f.variantKey : ''}" data-close-drawer>${Art.product({ id: f.id, name: f.name, imageId: f.imageId })}</a>
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

  const STRIPE_PUBLISHABLE_KEY = 'pk_test_51UPOleR1DYbWyYrQZemSSGasBAbAVI9chWFiqeOfO6d73RCBpaUL2UPtHtzE7qzEJinqL2ugtvJWKio7uzfUlYHD004r2XwVyp';
const STRIPE_PAYMENT_URL = 'https://luxora-api.keshavnakku7861.workers.dev/api/create-payment-intent';
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY)
  /* ---------- demo checkout (nothing is stored or sent anywhere) ---------- */
  const dlg = $('#checkout');
  let method = 'standard';
  let checkoutData = {};
  function openCheckout() { if (!S.cart().length) return; method = 'standard'; stepDetails(); if (!dlg.open) dlg.showModal(); }
  const summary = () => {
    const sub = S.subtotal(), ship = S.shipping(method);
    return `<div class="sum">${S.cart().map(i => `<div><span>${i.qty} × ${esc(S.info(i).name)} <small>${esc(i.size)}, ${cname(i.color)}</small></span><span>${money(S.info(i).price * i.qty)}</span></div>`).join('')}
      <div><span>Subtotal</span><span>${money(sub)}</span></div><div><span>Shipping</span><span>${ship === 0 ? 'Free' : money(ship)}</span></div><div class="t"><span>Total</span><span>${money(sub + ship)}</span></div></div>`;
  };
function stepDetails() {
  $('#coBody').innerHTML = `<h2 id="coTitle">Checkout</h2>

    <form id="coForm" autocomplete="on">

      <h3>Contact information</h3>

      <label>Full name
        <input name="name" required autocomplete="name" placeholder="Full name">
      </label>

      <label>Email
        <input name="email" type="email" required autocomplete="email" placeholder="you@example.com">
      </label>

      <label>Phone number
        <input name="phone" type="tel" required autocomplete="tel" placeholder="Phone number">
      </label>

      <h3>Shipping address</h3>

      <label>Street address
        <input name="address1" required autocomplete="address-line1" placeholder="Street address">
      </label>

      <label>Apartment, suite, unit (optional)
        <input name="address2" autocomplete="address-line2" placeholder="Apartment, suite, unit">
      </label>

      <label>City
        <input name="city" required autocomplete="address-level2" placeholder="City">
      </label>

      <label>State
        <input name="state" required autocomplete="address-level1" placeholder="State">
      </label>

      <label>ZIP code
        <input name="zip" required autocomplete="postal-code" placeholder="ZIP code">
      </label>

      <label>Country
        <select name="country" required autocomplete="country">
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="IN">India</option>
          <option value="GB">United Kingdom</option>
        </select>
      </label>

      <fieldset>
        <legend>Delivery</legend>

        <label class="radio">
          <input type="radio" name="m" value="standard"
            ${method === 'standard' ? 'checked' : ''}>
          Standard delivery (3–5 days)
          <b>${S.subtotal() >= S.FREE_OVER ? 'Free' : money(S.STANDARD)}</b>
        </label>

        <label class="radio">
          <input type="radio" name="m" value="express"
            ${method === 'express' ? 'checked' : ''}>
          Express delivery (1–2 days)
          <b>${money(S.EXPRESS)}</b>
        </label>
      </fieldset>

      <div class="paybox">
        <b>Payment</b>
        <span>Secure payment will be selected on the next step.</span>
      </div>

      <h3>Order summary</h3>
      <div id="coSum">${summary()}</div>

      <div class="demo__btns">
        <button type="submit" class="btn btn--lg">
          Continue to payment
        </button>

        <button type="button" class="btn btn--lg btn--ghost" id="coCancel">
          Back to cart
        </button>
      </div>

    </form>`;

  $('#coForm').onsubmit = e => {
  e.preventDefault();
  checkoutData = Object.fromEntries(new FormData(e.target).entries());
  stepPayment();
};

  $('#coForm').onchange = e => {
    if (e.target.name === 'm') {
      method = e.target.value;
      $('#coSum').innerHTML = summary();
    }
  };

  $('#coCancel').onclick = () => dlg.close();
}
  
    function stepPayment() {
  $('#coBody').innerHTML = `
    <h2 id="coTitle">Payment & Review</h2>

    <h3>Ship to</h3>
    <div class="paybox">
      <b>${esc(checkoutData.name)}</b>
      <span>
        ${esc(checkoutData.address1)}
        ${checkoutData.address2 ? ', ' + esc(checkoutData.address2) : ''}<br>
        ${esc(checkoutData.city)}, ${esc(checkoutData.state)} ${esc(checkoutData.zip)}<br>
        ${esc(checkoutData.country)}
      </span>
    </div>

    <h3>Contact</h3>
    <div class="paybox">
      <span>${esc(checkoutData.email)}<br>${esc(checkoutData.phone)}</span>
    </div>

    <h3>Payment method</h3>

    <form id="paymentForm">
      <label class="radio">
        <input type="radio" name="payment" value="card" checked>
        Credit or debit card
      </label>

      <label class="radio">
        <input type="radio" name="payment" value="wallet">
        Digital wallet
      </label>

      <p class="fine">
        Secure payment processing will be connected separately.
        Do not enter card numbers directly into Luxora yet.
      </p>

      <h3>Review your order</h3>
      ${summary()}

      <div class="demo__btns">
        <button type="submit" class="btn btn--lg">
          Review order
        </button>

        <button type="button" class="btn btn--lg btn--ghost" id="backDetails">
          Back
        </button>
      </div>
    </form>
  `;

  $('#paymentForm').onsubmit = e => {
    e.preventDefault();
    checkoutData.payment =
      new FormData(e.target).get('payment');
    placeOrder();
  };

  $('#backDetails').onclick = () => stepDetails();
}
  
  function placeOrder() {
  const paymentName =
    checkoutData.payment === 'wallet'
      ? 'Digital wallet'
      : 'Credit or debit card';

  $('#coBody').innerHTML = `
    <h2 id="coTitle">Review your order</h2>

    <h3>Shipping address</h3>
    <div class="paybox">
      <b>${esc(checkoutData.name)}</b>
      <span>
        ${esc(checkoutData.address1)}
        ${checkoutData.address2 ? ', ' + esc(checkoutData.address2) : ''}<br>
        ${esc(checkoutData.city)}, ${esc(checkoutData.state)} ${esc(checkoutData.zip)}<br>
        ${esc(checkoutData.country)}
      </span>
    </div>

    <h3>Contact information</h3>
    <div class="paybox">
      <span>
        ${esc(checkoutData.email)}<br>
        ${esc(checkoutData.phone)}
      </span>
    </div>

    <h3>Delivery</h3>
    <div class="paybox">
      <span>
        ${method === 'express'
          ? 'Express delivery (1–2 days)'
          : 'Standard delivery (3–5 days)'}
      </span>
    </div>

    <h3>Payment method</h3>
    <div class="paybox">
      <span>${paymentName}</span>
    </div>

    <h3>Order total</h3>
    ${summary()}

    <div class="demo__btns">
      <button type="button" class="btn btn--lg" id="finalPayment">
        Continue to secure payment
      </button>

      <button type="button" class="btn btn--lg btn--ghost" id="backPayment">
        Back
      </button>
    </div>
  `;

  $('#backPayment').onclick = () => stepPayment();

  $('#finalPayment').onclick = () => openStripePayment();
}
  async function openStripePayment() {
  const amount = Math.round(
    (S.subtotal() + S.shipping(method)) * 100
  );

  $('#coBody').innerHTML = `
    <h2 id="coTitle">Secure payment</h2>

    <p class="fine">
      Stripe test mode — no real money will be charged.
    </p>

    <div id="stripePaymentElement"></div>

    <p id="stripeError" class="fine" role="alert"></p>

    <div class="demo__btns">
      <button type="button" class="btn btn--lg" id="payWithStripe">
        Pay ${money(amount / 100)}
      </button>

      <button type="button" class="btn btn--lg btn--ghost" id="backReview">
        Back
      </button>
    </div>
  `;

  try {
    const response = await fetch(STRIPE_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount })
    });

    const data = await response.json();

    if (!response.ok || !data.clientSecret) {
      throw new Error(data.error || 'Unable to start payment.');
    }

    const elements = stripe.elements({
      clientSecret: data.clientSecret
    });

    const paymentElement = elements.create('payment');
    paymentElement.mount('#stripePaymentElement');

    $('#payWithStripe').onclick = async () => {
      $('#payWithStripe').disabled = true;
      $('#stripeError').textContent = '';

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href
        },
        redirect: 'if_required'
      });

      if (result.error) {
        $('#stripeError').textContent = result.error.message;
        $('#payWithStripe').disabled = false;
        return;
      }

      $('#coBody').innerHTML = `
        <h2 id="coTitle">Payment successful</h2>
        <div class="paybox">
          <b>Stripe test payment completed.</b>
          <span>No real money was charged.</span>
        </div>
        <button type="button" class="btn btn--lg" id="finishOrder">
          Done
        </button>
      `;

      $('#finishOrder').onclick = () => {
  S.clearCart();
  dlg.close();
};
    };

    $('#backReview').onclick = () => placeOrder();

  } catch (error) {
    $('#stripeError').textContent =
      error.message || 'Unable to load Stripe payment.';
  }
}
})();
