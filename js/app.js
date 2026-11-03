/* Luxora assistant UI. All chat goes through POST /api/chat {message} -> {reply, products}. */
(() => {
  const $ = s => document.querySelector(s);
  const S = window.LuxoraStore, money = S.money, esc = S.esc;
  const feed = $('#feed'), panel = $('#panel'), toastEl = $('#toast');
  let current = null, sel = { size: '', kit: true, color: '', qty: 1, view: 0 };
  S.bind();
  // Static hosting (GitHub Pages) has no backend: answer in the browser via js/offline.js. Anywhere else, try the server first
  // and fall back to the same offline responder if /api/chat is unreachable. Relative URLs so it works under /<repo>/.
  const STATIC = window.LUXORA_STATIC || /\.github\.io$/.test(location.hostname);
  async function chat(message) {
    if (!STATIC) {
      try {
        const res = await fetch('api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }) });
        if (res.ok) return await res.json();
      } catch (e) { /* fall through to offline */ }
    }
    return window.LuxoraOffline.respond(message);
  }
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function toast(t, link) {
    toastEl.textContent = t;
    if (link) toastEl.insertAdjacentHTML('beforeend', ` &middot; <a href="${link[1]}">${link[0]}</a>`);
    toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.hidden = true, 3500);
  }
  const addToCart = (p, o) => { const l = S.addToCart(p, o); toast(`Added ${l.qty} × ${p.name} to cart`, ['View cart', '#/cart']); };
  const heartSvg = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  function toggleSave(p, o) { const on = S.toggleSaved(p, o); toast(on ? `Saved ${p.name}` : `Removed ${p.name} from saved`, on ? ['View saved', '#/saved'] : null); return on; }

  /* ---------- chat ---------- */
  function userMsg(text) { $('#empty')?.remove(); const m = el('div', 'msg--user'); m.textContent = text; feed.append(m); scroll(); }
  const scroll = () => requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  function botMsg(data) {
    const m = el('div', 'msg--bot');
    const p = el('p'); p.textContent = data.reply; m.append(p);
    if (data.products && data.products.length) {
      const h = el('h3'); h.textContent = data.title || 'Top suggested'; m.append(h);
      const cards = el('div', 'cards');
      data.products.forEach(pr => {
        const c = el('div', 'card'); c.dataset.id = pr.id; c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', `View ${pr.name}`);
        c.innerHTML = `<div class="card__art">${LuxoraArt.product(pr)}</div><div class="card__name">${esc(pr.name)}</div><div class="card__price">${money(pr.price)}</div>`;
        const heart = el('button', 'card__heart' + (S.isSaved(pr.id) ? ' on' : ''), heartSvg); heart.type = 'button'; heart.setAttribute('aria-label', `Save ${pr.name}`); heart.setAttribute('aria-pressed', S.isSaved(pr.id));
        heart.addEventListener('click', e => { e.stopPropagation(); const on = toggleSave(pr); heart.classList.toggle('on', on); heart.setAttribute('aria-pressed', on); if (current && current.id === pr.id) renderPanel(); });
        const add = el('button', 'card__add', '+'); add.setAttribute('aria-label', `Add ${pr.name} to cart`); add.type = 'button';
        add.addEventListener('click', e => { e.stopPropagation(); addToCart(pr); });
        c.append(heart, add);
        const open = () => { show(pr); cards.querySelectorAll('.card').forEach(x => x.classList.toggle('sel', x === c)); };
        c.addEventListener('click', open); c.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
        cards.append(c);
      });
      m.append(cards);
      const f = el('p', 'follow'); f.textContent = data.followUp || 'Would you like me to handle your order from confirmation to delivery?'; m.append(f);
      show(data.products[0]); cards.firstChild.classList.add('sel');
    }
    feed.append(m); scroll();
  }
  async function send(text) {
    text = text.trim(); if (!text) return;
    userMsg(text);
    const t = el('div', 'msg--bot', '<span class="typing"><i></i><i></i><i></i></span>'); feed.append(t); scroll();
    try { const data = await chat(text); t.remove(); botMsg(data); }
    catch (e) { t.remove(); botMsg({ reply: "Sorry, I couldn't reach the assistant just now. Please try again.", products: [] }); }
  }
  $('#composer').addEventListener('submit', e => { e.preventDefault(); const i = $('#msg'); const v = i.value; i.value = ''; send(v); });
  $('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) send(b.dataset.q); });

  /* ---------- recommended panel ---------- */
  function show(p) { current = p; sel = { size: '', kit: true, color: p.colors[0], qty: 1, view: 0 }; renderPanel(); }
  const chosen = () => ({ size: sel.size || (sel.kit ? 'Free sizing kit' : current.sizes[0]), color: sel.color, qty: sel.qty });
  function renderPanel() {
    const p = current; if (!p) return;
    const views = LuxoraArt.VIEWS, isOn = S.isSaved(p.id), hasKit = p.sizes.includes('Free sizing kit');
    panel.innerHTML = `
      <div class="panel__title">Recommended for you</div>
      <div class="car">
        <button class="car__btn car__btn--prev" id="prev" aria-label="Previous image">&#8249;</button>
        <div class="car__art" id="art">${LuxoraArt.product(p, sel.view)}</div>
        <button class="car__btn car__btn--next" id="next" aria-label="Next image">&#8250;</button>
      </div>
      <div class="dots" id="dots">${Array.from({ length: views }, (_, i) => `<i class="${i === sel.view ? 'on' : ''}" data-i="${i}" role="button" aria-label="Image ${i + 1}"></i>`).join('')}</div>
      <div class="prod__top">
        <div class="prod__id"><div class="store">${esc(p.store)}</div><div class="prod__name">${esc(p.name)}</div>
          <div class="stars">${S.stars(p.rating)}<span>${p.rating.toFixed(1)} (${esc(p.reviews)} Reviews)</span></div></div>
        <div class="prod__price"><sup>$</sup>${p.price.toFixed(2)}</div>
      </div>
      <div class="opts">
        <div class="field"><span class="lbl">Size</span>
          ${hasKit ? `<button class="kit" id="kit" type="button" aria-pressed="${sel.kit}"><span>Free sizing kit</span><span class="tick ${sel.kit ? '' : 'off'}">&#10003;</span></button>` : ''}
          <select id="size" aria-label="Select your size"><option value="">Select your size</option>${p.sizes.filter(s => s !== 'Free sizing kit').map(s => `<option ${s === sel.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        <div class="field"><span class="lbl">Select color</span><div class="sw" id="sw">${p.colors.map(c => `<button type="button" class="c-${c} ${c === sel.color ? 'on' : ''}" data-c="${c}" aria-label="${c}" aria-pressed="${c === sel.color}">${c === sel.color ? '&#10003;' : ''}</button>`).join('')}</div></div>
      </div>
      <div class="buy">
        <div class="qty"><button id="minus" aria-label="Decrease">&minus;</button><span id="q">${sel.qty}</span><button id="plus" aria-label="Increase">+</button></div>
        <button class="add" id="add">Add to Cart</button>
        <button class="heart ${isOn ? 'on' : ''}" id="heart" aria-label="Save for later" aria-pressed="${isOn}">${heartSvg}</button>
      </div>
      <button class="confirm" id="confirm">Confirm &amp; Let AI Process</button>`;
    const go = d => { sel.view = (sel.view + d + views) % views; $('#art').innerHTML = LuxoraArt.product(p, sel.view); $('#dots').querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i === sel.view)); };
    $('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
    $('#dots').onclick = e => { const i = e.target.dataset.i; if (i != null) go(Number(i) - sel.view); };
    if ($('#kit')) $('#kit').onclick = () => { sel.kit = !sel.kit; renderPanel(); };
    $('#size').onchange = e => { sel.size = e.target.value; };
    $('#sw').onclick = e => { const b = e.target.closest('button'); if (b) { sel.color = b.dataset.c; renderPanel(); } };
    $('#minus').onclick = () => { sel.qty = Math.max(1, sel.qty - 1); $('#q').textContent = sel.qty; };
    $('#plus').onclick = () => { sel.qty = Math.min(9, sel.qty + 1); $('#q').textContent = sel.qty; };
    $('#add').onclick = () => addToCart(p, chosen());
    $('#heart').onclick = () => { toggleSave(p, chosen()); renderPanel(); document.querySelectorAll('.card').forEach(c => { const hb = c.querySelector('.card__heart'); if (hb && c.getAttribute('aria-label') === `View ${p.name}`) { hb.classList.toggle('on', S.isSaved(p.id)); hb.setAttribute('aria-pressed', S.isSaved(p.id)); } }); };
    $('#confirm').onclick = confirmOrder;
  }
  function confirmOrder() {
    if (!current) return;
    const c = chosen();
    if (!S.cart().some(i => i.id === current.id && i.size === c.size && i.color === c.color)) S.addToCart(current, c);
    const n = S.count(), total = S.subtotal();
    $('#empty')?.remove();
    botMsg({ reply: `Great choice. Your cart now has ${n} item${n > 1 ? 's' : ''} (${money(total)}). Open the shop to review your cart and check out. This is a prototype with sample data, so nothing is actually ordered or charged.`, products: [] });
    const last = feed.lastElementChild; if (last) { const a = el('a', 'btn btn--sm cart-link', 'Go to cart'); a.href = '#/cart'; a.style.alignSelf = 'flex-start'; last.append(a); scroll(); }
  }
  window.LuxoraAssistant = { refresh() { renderPanel(); document.querySelectorAll('.card[data-id]').forEach(c => { const on = S.isSaved(c.dataset.id), hb = c.querySelector('.card__heart'); if (hb) { hb.classList.toggle('on', on); hb.setAttribute('aria-pressed', on); } }); } };
  document.addEventListener('luxora:external', renderPanel);
  document.addEventListener('luxora:deals', () => window.LuxoraAssistant.refresh());

  /* ---------- boot ---------- */
  show(window.LuxoraOffline.products[0]);
  const q = new URLSearchParams(location.search).get('q'); if (q) send(q);
})();
