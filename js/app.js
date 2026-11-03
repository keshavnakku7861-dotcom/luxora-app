/* Luxora assistant UI. All chat goes through POST /api/chat {message} -> {reply, products}. */
(() => {
  const $ = s => document.querySelector(s);
  const feed = $('#feed'), panel = $('#panel'), badge = $('#cartBadge'), toastEl = $('#toast');
  const money = n => '$' + Number(n).toFixed(2);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('luxora.' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('luxora.' + k, JSON.stringify(v)); } catch {} }
  };
  let cart = store.get('cart', []), saved = store.get('saved', []);
  let current = null, sel = { size: '', kit: true, color: '', qty: 1, view: 0 };
  const known = {}; // id -> product, for cart rendering
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
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.hidden = true, 2200); }

  /* ---------- cart ---------- */
  const count = () => cart.reduce((n, i) => n + i.qty, 0);
  function persist() { store.set('cart', cart); store.set('saved', saved); badge.textContent = count(); badge.hidden = count() === 0; }
  function addToCart(p, opts = {}) {
    known[p.id] = p;
    const line = { id: p.id, size: opts.size || p.sizes[0], color: opts.color || p.colors[0], qty: opts.qty || 1 };
    const hit = cart.find(i => i.id === line.id && i.size === line.size && i.color === line.color);
    if (hit) hit.qty += line.qty; else cart.push(line);
    persist(); toast(`Added ${line.qty} × ${p.name} to cart`);
  }

  /* ---------- chat ---------- */
  function userMsg(text) { $('#empty')?.remove(); const m = el('div', 'msg--user'); m.textContent = text; feed.append(m); scroll(); }
  const scroll = () => requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  function botMsg(data) {
    const m = el('div', 'msg--bot');
    const p = el('p'); p.textContent = data.reply; m.append(p);
    if (data.products && data.products.length) {
      data.products.forEach(pr => known[pr.id] = pr);
      const h = el('h3'); h.textContent = data.title || 'Top suggested'; m.append(h);
      const cards = el('div', 'cards');
      data.products.forEach(pr => {
        const c = el('div', 'card'); c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', `View ${pr.name}`);
        c.innerHTML = `<div class="card__art">${LuxoraArt.product(pr)}</div><div class="card__name">${esc(pr.name)}</div><div class="card__price">${money(pr.price)}</div>`;
        const add = el('button', 'card__add', '+'); add.setAttribute('aria-label', `Add ${pr.name} to cart`); add.type = 'button';
        add.addEventListener('click', e => { e.stopPropagation(); addToCart(pr); });
        c.append(add);
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
    try {
      const data = await chat(text); t.remove(); botMsg(data);
    } catch (e) { t.remove(); botMsg({ reply: "Sorry, I couldn't reach the assistant just now. Please try again.", products: [] }); }
  }
  $('#composer').addEventListener('submit', e => { e.preventDefault(); const i = $('#msg'); const v = i.value; i.value = ''; send(v); });
  $('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) send(b.dataset.q); });

  /* ---------- recommended panel ---------- */
  const STAR = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  function show(p) {
    current = p; known[p.id] = p;
    sel = { size: '', kit: true, color: p.colors[0], qty: 1, view: 0 };
    renderPanel();
  }
  function renderPanel() {
    const p = current; if (!p) return;
    const views = 3, isOn = saved.includes(p.id);
    panel.innerHTML = `
      <div class="panel__title">Recommended for you</div>
      <div class="car"><div class="car__art" id="art">${LuxoraArt.product(p, sel.view)}</div>
        <div class="car__nav"><button class="sq" id="prev" aria-label="Previous image">&#8249;</button><button class="sq sq--dark" id="next" aria-label="Next image">&#8250;</button></div></div>
      <div class="dots" id="dots">${Array.from({ length: views }, (_, i) => `<i class="${i === sel.view ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>
      <div class="prod__top"><div><div class="store">${esc(p.store)}</div><div class="prod__name">${esc(p.name)}</div>
        <div class="stars">${STAR(p.rating)}<span>${p.rating.toFixed(1)} (${esc(p.reviews)} Reviews)</span></div></div>
        <div class="prod__price"><sup>$</sup>${p.price.toFixed(2)}</div></div>
      <div class="cols"><div class="field"><div class="field__row"><span class="lbl">Size</span></div>
          <button class="kit" id="kit" type="button" aria-pressed="${sel.kit}">Free sizing kit<span class="tick ${sel.kit ? '' : 'off'}">&#10003;</span></button>
          <select id="size" aria-label="Select your size"><option value="">Select your size</option>${p.sizes.filter(s => s !== 'Free sizing kit').map(s => `<option ${s === sel.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        <div class="field"><span class="lbl">Select color</span><div class="sw" id="sw">${p.colors.map(c => `<button type="button" class="c-${c} ${c === sel.color ? 'on' : ''}" data-c="${c}" aria-label="${c}" aria-pressed="${c === sel.color}">${c === sel.color ? '&#10003;' : ''}</button>`).join('')}</div></div></div>
      <div class="buy"><div class="qty"><button id="minus" aria-label="Decrease">&minus;</button><span id="q">${sel.qty}</span><button id="plus" aria-label="Increase">+</button></div>
        <button class="add" id="add">Add to Cart</button>
        <button class="heart ${isOn ? 'on' : ''}" id="heart" aria-label="Save for later" aria-pressed="${isOn}"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg></button></div>
      <button class="confirm" id="confirm">Confirm &amp; Let AI Process</button>`;
    const go = d => { sel.view = (sel.view + d + views) % views; $('#art').innerHTML = LuxoraArt.product(p, sel.view); $('#dots').querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i === sel.view)); };
    $('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
    $('#dots').onclick = e => { const i = e.target.dataset.i; if (i != null) go(Number(i) - sel.view); };
    $('#kit').onclick = () => { sel.kit = !sel.kit; renderPanel(); };
    $('#size').onchange = e => { sel.size = e.target.value; };
    $('#sw').onclick = e => { const b = e.target.closest('button'); if (b) { sel.color = b.dataset.c; renderPanel(); } };
    $('#minus').onclick = () => { sel.qty = Math.max(1, sel.qty - 1); $('#q').textContent = sel.qty; };
    $('#plus').onclick = () => { sel.qty = Math.min(9, sel.qty + 1); $('#q').textContent = sel.qty; };
    $('#add').onclick = () => addToCart(p, chosen());
    $('#heart').onclick = () => { saved = saved.includes(p.id) ? saved.filter(i => i !== p.id) : [...saved, p.id]; persist(); renderPanel(); toast(saved.includes(p.id) ? 'Saved for later' : 'Removed from saved'); };
    $('#confirm').onclick = confirmOrder;
  }
  const chosen = () => ({ size: sel.size || (sel.kit ? 'Free sizing kit' : current.sizes[0]), color: sel.color, qty: sel.qty });
  function confirmOrder() {
    if (!current) return;
    if (!cart.length) addToCart(current, chosen());
    const total = cart.reduce((s, i) => s + (known[i.id]?.price || 0) * i.qty, 0), n = count();
    const names = [...new Set(cart.map(i => known[i.id]?.name).filter(Boolean))].join(', ');
    cart = []; persist();
    $('#empty')?.remove();
    botMsg({ reply: `Done. I've confirmed ${n} item${n > 1 ? 's' : ''} (${names}) for ${money(total)} and I'll guide it through to delivery. This is a prototype with sample data, so nothing was actually ordered or charged.`, products: [] });
  }

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'); let tab = 'cart';
  function openDrawer(t) { tab = t; drawer.hidden = false; renderDrawer(); }
  function renderDrawer() {
    drawer.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const body = $('#drawerBody'), foot = $('#drawerFoot'); body.innerHTML = ''; foot.innerHTML = '';
    if (tab === 'cart') {
      if (!cart.length) body.innerHTML = '<p class="none">Your cart is empty. Tap + on a suggested product to add it.</p>';
      cart.forEach((i, idx) => { const p = known[i.id]; if (!p) return;
        const l = el('div', 'line', `<div class="line__art">${LuxoraArt.product(p)}</div><div>${esc(p.name)}<small>${esc(i.size)} · ${esc(i.color)} · qty ${i.qty}</small></div><div>${money(p.price * i.qty)}<br><button data-rm="${idx}">Remove</button></div>`); body.append(l); });
      if (cart.length) foot.innerHTML = `<div class="total"><span>Subtotal</span><b>${money(cart.reduce((s, i) => s + (known[i.id]?.price || 0) * i.qty, 0))}</b></div><button class="confirm" id="dConfirm">Confirm &amp; Let AI Process</button>`;
    } else {
      if (!saved.length) body.innerHTML = '<p class="none">Nothing saved yet. Tap the heart on a product.</p>';
      saved.forEach(id => { const p = known[id]; if (!p) return;
        body.append(el('div', 'line', `<div class="line__art">${LuxoraArt.product(p)}</div><div>${esc(p.name)}<small>${esc(p.store)}</small></div><div>${money(p.price)}<br><button data-un="${id}">Remove</button></div>`)); });
    }
  }
  drawer.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) drawer.hidden = true;
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; renderDrawer(); }
    if (e.target.dataset.rm != null) { cart.splice(Number(e.target.dataset.rm), 1); persist(); renderDrawer(); }
    if (e.target.dataset.un) { saved = saved.filter(i => i !== e.target.dataset.un); persist(); renderDrawer(); renderPanel(); }
    if (e.target.id === 'dConfirm') { drawer.hidden = true; confirmOrder(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') drawer.hidden = true; });
  $('#navCart').onclick = () => openDrawer('cart');
  $('#navSaved').onclick = () => openDrawer('saved');
  $('#navHome').onclick = () => location.reload();

  /* ---------- boot ---------- */
  { const products = window.LuxoraOffline.products; products.forEach(p => known[p.id] = p); show(products[0]); }
  persist();
  const q = new URLSearchParams(location.search).get('q'); if (q) send(q);
})();
