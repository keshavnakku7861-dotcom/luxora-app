/* Luxora assistant UI. All chat goes through POST /api/chat {message} -> {reply, products}. */
(() => {
  const $ = s => document.querySelector(s);
  const S = window.LuxoraStore, money = S.money, esc = S.esc;
  const feed = $('#feed'), panel = $('#panel'), toastEl = $('#toast');
  let current = null, sel = { size: '', kit: true, color: '', qty: 1, view: 0 };
  S.bind();
  // Chat backend. On the static GitHub Pages site the assistant first asks the hosted Luxora API (a free Cloudflare Worker)
  // with a short timeout; if it is unreachable, slow or returns something unexpected, the bundled js/offline.js answers instead.
  // Anywhere else (the local Node server) the same-origin api/chat is tried first, then the offline responder.
  const STATIC = window.LUXORA_STATIC || /\.github\.io$/.test(location.hostname);
  const API_URL = window.LUXORA_API_URL || 'https://luxora-api.luxora-ks.workers.dev/api/chat', API_TIMEOUT_MS = 4000;
  const lastIds = () => { for (let i = hist.length - 1; i >= 0; i--) if (hist[i].r === 'b' && hist[i].ids && hist[i].ids.length) return hist[i].ids; return []; };
  async function remoteChat(url, message, last, ms) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, last, lang: LuxoraPrefs.get().language }), signal: ctl.signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (!(data && typeof data.reply === 'string' && Array.isArray(data.products))) return null;
      // the page's own catalog is authoritative for product fields (live deal prices, tagged Amazon links, ...)
      const byId = Object.fromEntries(window.LuxoraOffline.products.map(x => [x.id, x]));
      data.products = data.products.map(x => Object.assign({}, x, byId[x.id] || {}));
      return data;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }
  async function chat(message) {
    const last = lastIds();
    const data = await remoteChat(STATIC ? API_URL : 'api/chat', message, last, STATIC ? API_TIMEOUT_MS : 15000);
    return data || window.LuxoraOffline.respond(message, { last, lang: LuxoraPrefs.get().language });
  }
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function toast(t, link) {
    toastEl.textContent = t;
    if (link) toastEl.insertAdjacentHTML('beforeend', ` &middot; <a href="${link[1]}">${link[0]}</a>`);
    toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.hidden = true, 3500);
  }
  const addToCart = (p, o) => { const l = S.addToCart(p, o); if (!l) return null; toast(`Added ${l.qty} × ${p.name} to cart`, ['View cart', '#/cart']); };
  const heartSvg = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>';
  function toggleSave(p, o) { const on = S.toggleSaved(p, o); toast(on ? `Saved ${p.name}` : `Removed ${p.name} from saved`, on ? ['View saved', '#/saved'] : null); return on; }

  /* ---------- chat ---------- */
  const view = $('#viewAssistant');
  /* chat history: kept in localStorage ("luxora.chat", last 40 messages) so Settings can clear it */
  const HK = 'luxora.chat'; let hist = []; let restoring = false, busyReply = false;
  try { const v = JSON.parse(localStorage.getItem(HK)); if (Array.isArray(v)) hist = v.slice(-40); } catch {}
  if (!LuxoraPrefs.get().rememberChat) { hist = []; try { localStorage.removeItem(HK); } catch {} }
  const saveHist = () => { try { hist.length && LuxoraPrefs.get().rememberChat ? localStorage.setItem(HK, JSON.stringify(hist.slice(-40))) : localStorage.removeItem(HK); } catch {} };
  const emptyHTML = $('#empty').outerHTML;
  function userMsg(text, file) {
    $('#empty')?.remove(); view.classList.remove('is-empty');
    const m = el('div', 'msg--user'); m.textContent = text;
    if (file) { const f = el('small', 'msg__file'); f.textContent = 'Attached: ' + file; m.append(f); }
    feed.append(m); scroll();
    if (!restoring) { hist.push({ r: 'u', t: text, f: file || '' }); saveHist(); }
  }
  /* assistant message = small logo + body column */
  function botWrap(inner) { const m = el('div', 'msg--bot'), av = el('span', 'msg__av'); av.setAttribute('aria-hidden', 'true'); av.innerHTML = LuxoraArt.logo(); const body = el('div', 'msg__body'); if (inner) body.innerHTML = inner; m.append(av, body); return [m, body]; }
  const scroll = () => requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  /* Settings > AI assistant / Region: shape a reply for display (length, currency). Stored history keeps the raw reply. */
  const conv = t => !t || LuxoraPrefs.get().currency === 'USD' ? t : t.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, (m, n) => LuxoraPrefs.fmt(parseFloat(n.replace(/,/g, ''))));
  function shape(d, P) {
    let reply = d.reply || '';
    if (P.replyLength === 'short') { const m = reply.match(/^.*?[.!?](?=\s|$)/); if (m) reply = m[0]; }
    else if (P.replyLength === 'detailed' && d.products && d.products[0] && d.products[0].description) reply += ' ' + d.products[0].description;
    /* bot bubbles are not touched by the page translator: errors and fallback replies have exact translations and are
       translated here; normal recommendation replies stay as the responder wrote them (with their title and follow-up). */
    const T = s => (s && window.LuxoraI18n ? LuxoraI18n.t(s) : s), tr = T(reply), whole = tr !== reply;
    return { ...d, reply: conv(tr), title: conv(whole ? T(d.title) : d.title), followUp: conv(whole ? T(d.followUp) : d.followUp) };
  }
  /* saved budget limit (USD prices) is applied when the question doesn't name a budget */
  function outgoing(text) {
    const b = parseFloat(LuxoraPrefs.get().budget);
    if (!b || /\$\s*\d|under|below|less than|max|up to|<\s*\d/i.test(text) || /^(hi|hello|hey|yo|thanks|thank)\b/i.test(text.trim())) return text;
    return text + ' under $' + b;
  }
  function botMsg(raw) {
    const P = LuxoraPrefs.get(), data = shape(raw, P);
    const [wrap, m] = botWrap();
    const p = el('p'); p.setAttribute('data-no-i18n', ''); p.textContent = data.reply; m.append(p);   // bubble text: translated at the source (shape), not by the page translator
    if (data.products && data.products.length && !P.showCards) { show(data.products[0]); p.textContent += ' Top picks: ' + data.products.map(x => x.name).join(', ') + '.'; }
    if (data.products && data.products.length && P.showCards) {
      const h = el('h3'); h.setAttribute('data-no-i18n', ''); h.textContent = data.title || 'Top suggested'; m.append(h);
      const cards = el('div', 'cards');
      data.products.forEach(pr => {
        const c = el('div', 'card'); c.dataset.id = pr.id; c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', `View ${pr.name}`);
        c.innerHTML = `<div class="card__art">${LuxoraArt.product(pr)}${LuxoraArt.illus}</div><div class="card__name">${esc(pr.name)}</div>${S.preorderTag(pr)}<div class="card__price">${money(pr.price)}</div>`;
        const amz = S.amazonLink(pr, 'card__amz', 'Buy now', true); if (amz) { const holder = el('div', null, amz); const a = holder.firstChild; a.addEventListener('click', e => e.stopPropagation()); a.addEventListener('keydown', e => e.stopPropagation()); c.append(a); }
        const heart = el('button', 'card__heart' + (S.isSaved(pr.id) ? ' on' : ''), heartSvg); heart.type = 'button'; heart.setAttribute('aria-label', `Save ${pr.name}`); heart.setAttribute('aria-pressed', S.isSaved(pr.id));
        heart.addEventListener('click', e => { e.stopPropagation(); const on = toggleSave(pr); heart.classList.toggle('on', on); heart.setAttribute('aria-pressed', on); if (current && current.id === pr.id) renderPanel(); });
        const add = el('button', 'card__add', '+'); add.setAttribute('aria-label', `Add ${pr.name} to cart`); add.type = 'button';
        add.addEventListener('click', e => { e.stopPropagation(); if (S.needsSize(pr)) { open(); sel.sizeErr = true; renderPanel(); toast(`Choose a size for ${pr.name} first`); const sz = $('#size'); if (sz) sz.focus(); } else addToCart(pr); });
        c.append(heart, add);
        const open = () => { show(pr); view.classList.add('panel-open'); cards.querySelectorAll('.card').forEach(x => x.classList.toggle('sel', x === c)); };
        c.addEventListener('click', open); c.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
        cards.append(c);
      });
      m.append(cards);
      const f = el('p', 'follow'); f.setAttribute('data-no-i18n', ''); f.textContent = data.followUp || 'Want me to compare any of these, or save one for later?'; m.append(f);
      show(data.products[0]); cards.firstChild.classList.add('sel');
    }
    feed.append(wrap); scroll();
    if (!restoring) { hist.push({ r: 'b', reply: raw.reply, title: raw.title || '', followUp: raw.followUp || '', ids: (raw.products || []).map(x => x.id), link: !!raw.cartLink }); saveHist(); }
  }
  async function send(text, file) {
    text = text.trim(); if (!text) return;
    userMsg(text, file);
    const [t] = botWrap('<span class="typing" role="status" aria-label="Luxora is typing"><i></i><i></i><i></i></span>'); feed.append(t); scroll();
    busyReply = true;
    try { const data = await chat(outgoing(text)); t.remove(); botMsg(data); }
    catch (e) { t.remove(); botMsg({ reply: "Sorry, I couldn't reach the assistant just now. Please try again.", products: [] }); }
    finally { busyReply = false; }
  }
  /* attachment: a prototype nicety - the file stays in the browser; only its name is shown in the chat */
  const fileIn = $('#file'), attached = $('#attached'); let attName = '';
  const setFile = n => { attName = n; attached.hidden = !n; attached.innerHTML = ''; if (n) { const t = el('span'); t.textContent = n; const x = el('button', null, '&#10005;'); x.type = 'button'; x.setAttribute('aria-label', 'Remove attachment'); x.onclick = () => { fileIn.value = ''; setFile(''); $('#msg').focus(); }; attached.append(t, x); } };
  $('#attachBtn').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => { const f = fileIn.files[0]; setFile(f ? f.name.slice(0, 40) : ''); if (f) $('#msg').focus(); });
  /* message length: nothing is silently cut off. Counter appears near the limit; over the limit, sending is blocked with a warning. */
  const MAX = 1000, msgIn = $('#msg'), cnt = $('#msgCount'), comp = $('#composer'), sendBtn = $('.send');
  function counter() {
    const n = msgIn.value.length, over = n > MAX;
    cnt.hidden = n < MAX * 0.8; cnt.classList.toggle('over', over); comp.classList.toggle('is-over', over);
    cnt.textContent = over ? `${n.toLocaleString()} / ${MAX.toLocaleString()} - too long, please shorten your message to send` : `${n.toLocaleString()} / ${MAX.toLocaleString()}`;
    sendBtn.setAttribute('aria-disabled', over); msgIn.setAttribute('aria-invalid', over);
  }
  msgIn.addEventListener('input', counter);
  $('#composer').addEventListener('submit', e => { e.preventDefault(); const i = $('#msg'); const v = i.value; if (!v.trim()) { i.focus(); return; } if (v.length > MAX) { counter(); i.focus(); return; } i.value = ''; counter(); const n = attName; fileIn.value = ''; setFile(''); send(v, n); });
  $('#newChat').addEventListener('click', () => { history.replaceState(null, '', location.pathname + '#/assistant'); document.dispatchEvent(new Event('luxora:clear-chat')); $('#msg').focus(); });
  feed.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) send(b.dataset.q); });

  /* ---------- recommended panel ---------- */
  function show(p) { current = p; sel = { size: '', kit: false, sizeErr: false, color: p.colors[0], qty: 1, view: 0 }; renderPanel(); }
  const chosen = () => ({ size: sel.size || (sel.kit ? 'Sizing kit' : (S.needsSize(current) ? '' : current.sizes[0])), color: sel.color, qty: sel.qty });
  /* a size must be picked before anything is added: show the error and focus the select */
  function needSize() { if (!S.needsSize(current) || chosen().size) return false; sel.sizeErr = true; renderPanel(); const s = $('#size'); if (s) s.focus(); return true; }
  function renderPanel() {
    const p = current; if (!p) return;
    const views = LuxoraArt.VIEWS, isOn = S.isSaved(p.id), hasKit = p.sizes.includes('Sizing kit');
    panel.innerHTML = `
      <div class="panel__head"><button class="panel__back" id="pback" type="button" aria-label="Back to chat">&#8592;</button><div class="panel__title">Recommended for you</div><button class="panel__back" id="pclose" type="button" aria-label="Close">&#10005;</button></div>
      <div class="car">
        <button class="car__btn car__btn--prev" id="prev" aria-label="Previous image">&#8249;</button>
        <div class="car__art" id="art">${LuxoraArt.product(p, sel.view)}</div>${LuxoraArt.illus}
        <button class="car__btn car__btn--next" id="next" aria-label="Next image">&#8250;</button>
      </div>
      <div class="dots" id="dots">${Array.from({ length: views }, (_, i) => `<i class="${i === sel.view ? 'on' : ''}" data-i="${i}" role="button" aria-label="Image ${i + 1}"></i>`).join('')}</div>
      <div class="prod__top">
        <div class="prod__id"><div class="store">${esc(p.store)}</div><div class="prod__name">${esc(p.name)}</div>
          <div class="pnote">${S.checked(p)} &middot; ${esc(p.retailer.name)}</div></div>
        <div class="prod__price">${p.priceFrom ? '<small>From</small> ' : ''}${money(p.price)}${p.listPrice && LuxoraPrefs.get().priceDrops ? ` <s class="was">${money(p.listPrice)}</s>` : ''}</div>
      </div>
      <div class="opts">
        ${S.needsSize(p) ? `<div class="field"><span class="lbl" id="sizeLbl">Size <small class="req">(required)</small></span>
          ${hasKit ? `<button class="kit" id="kit" type="button" aria-pressed="${sel.kit}"><span>Sizing kit</span><span class="tick ${sel.kit ? '' : 'off'}">&#10003;</span></button>` : ''}
          <select id="size" aria-label="Select your size" aria-required="true" aria-describedby="sizeErr" ${sel.sizeErr ? 'aria-invalid="true"' : ''}><option value="">Select your size</option>${p.sizes.filter(s => s !== 'Sizing kit').map(s => `<option ${s === sel.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <p class="sizeerr" id="sizeErr" role="alert" ${sel.sizeErr ? '' : 'hidden'}>Please select a size before adding this to your cart.</p></div>` : ''}
        ${p.colors[0] === 'standard' ? '' : `<div class="field"><span class="lbl">Select color</span><div class="sw" id="sw">${p.colors.map(c => `<button type="button" class="c-${c} ${c === sel.color ? 'on' : ''}" data-c="${c}" aria-label="${c}" aria-pressed="${c === sel.color}">${c === sel.color ? '&#10003;' : ''}</button>`).join('')}</div></div>`}
      </div>
      ${p.optionsNote ? `<p class="onote">${esc(p.optionsNote)}</p>` : ''}
      <div class="buy">
        <div class="qty"><button id="minus" aria-label="Decrease">&minus;</button><span id="q">${sel.qty}</span><button id="plus" aria-label="Increase">+</button></div>
        <button class="add" id="add">Add to Cart</button>
        <button class="heart ${isOn ? 'on' : ''}" id="heart" aria-label="Save for later" aria-pressed="${isOn}">${heartSvg}</button>
      </div>
      <div class="buyat">${S.buyLink(p, 'btn btn--ghost buyat__btn')}${S.amazonLink(p, 'btn btn--ghost buyat__btn btn--amz')}${(p.alsoAt || []).map(a => `<a class="buyat__alt" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer sponsored">Also at ${esc(a.name)}${a.price ? ' (' + money(a.price) + ')' : ''} &#8599;<span class="sr-only"> (opens in a new tab)</span></a>`).join('')}</div>
      <p class="amzdisc">${S.DISCLOSURE}</p>
      <button class="confirm" id="confirm">Confirm &amp; Let AI Process</button>`;
    const go = d => { sel.view = (sel.view + d + views) % views; $('#art').innerHTML = LuxoraArt.product(p, sel.view); $('#dots').querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i === sel.view)); };
    $('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
    $('#dots').onclick = e => { const i = e.target.dataset.i; if (i != null) go(Number(i) - sel.view); };
    if ($('#kit')) $('#kit').onclick = () => { sel.kit = !sel.kit; if (sel.kit) sel.size = ''; sel.sizeErr = false; renderPanel(); };
    if ($('#size')) $('#size').onchange = e => { sel.size = e.target.value; if (sel.size) sel.kit = false; sel.sizeErr = false; renderPanel(); };
    if ($('#sw')) $('#sw').onclick = e => { const b = e.target.closest('button'); if (b) { sel.color = b.dataset.c; renderPanel(); } };
    $('#minus').onclick = () => { sel.qty = Math.max(1, sel.qty - 1); $('#q').textContent = sel.qty; };
    $('#plus').onclick = () => { sel.qty = Math.min(9, sel.qty + 1); $('#q').textContent = sel.qty; };
    $('#add').onclick = () => { if (!needSize()) addToCart(p, chosen()); };
    $('#heart').onclick = () => { toggleSave(p, chosen()); renderPanel(); document.querySelectorAll('.card').forEach(c => { const hb = c.querySelector('.card__heart'); if (hb && c.getAttribute('aria-label') === `View ${p.name}`) { hb.classList.toggle('on', S.isSaved(p.id)); hb.setAttribute('aria-pressed', S.isSaved(p.id)); } }); };
    $('#confirm').onclick = confirmOrder;
    $('#pback').onclick = $('#pclose').onclick = () => view.classList.remove('panel-open');
  }
  function confirmOrder() {
    if (!current || needSize()) return;
    const c = chosen();
    if (!S.cart().some(i => i.id === current.id && i.size === c.size && i.color === c.color)) S.addToCart(current, c);
    const n = S.count(), total = S.subtotal();
    $('#empty')?.remove(); view.classList.remove('is-empty', 'panel-open');
    botMsg({ cartLink: true, reply: `Great choice. Your cart now has ${n} item${n > 1 ? 's' : ''} (${money(total)}). Open the shop to review your cart and check out. Checkout here is a demo, so nothing is ordered or charged. To buy for real, use the Buy now (or Pre-order) button on the product.`, products: [] });
    const last = feed.lastElementChild?.querySelector('.msg__body'); if (last) { const a = el('a', 'btn btn--sm cart-link', window.LuxoraI18n ? LuxoraI18n.t('Go to cart') : 'Go to cart'); a.href = '#/cart'; a.style.alignSelf = 'flex-start'; last.append(a); scroll(); }
  }
  window.LuxoraAssistant = { refresh() { renderPanel(); document.querySelectorAll('.card[data-id]').forEach(c => { const on = S.isSaved(c.dataset.id), hb = c.querySelector('.card__heart'); if (hb) { hb.classList.toggle('on', on); hb.setAttribute('aria-pressed', on); } }); } };
  document.addEventListener('luxora:external', renderPanel);
  document.addEventListener('luxora:prefs', () => { if (current) renderPanel(); });
  document.addEventListener('luxora:deals', () => window.LuxoraAssistant.refresh());

  /* Settings > Your data > Clear chat history */
  document.addEventListener('luxora:clear-chat', () => {
    hist = []; saveHist(); feed.innerHTML = emptyHTML; LuxoraArt.hydrate(feed); view.classList.add('is-empty'); view.classList.remove('panel-open');
    current = null; show(window.LuxoraOffline.products[0]);
  });

  /* ---------- boot ---------- */
  show(window.LuxoraOffline.products[0]);
  function restoreAll() {
    if (!hist.length) return;
    restoring = true; feed.querySelectorAll('.msg--user, .msg--bot').forEach(x => x.remove());
    const byId = Object.fromEntries(window.LuxoraOffline.products.map(p => [p.id, p]));
    const items = hist.slice();
    $('#empty')?.remove(); view.classList.remove('is-empty');
    items.forEach(h => {
      if (h.r === 'u') userMsg(h.t, h.f);
      else {
        botMsg({ reply: h.reply, title: h.title, followUp: h.followUp, products: (h.ids || []).map(i => byId[i]).filter(Boolean) });
        if (h.link) { const last = feed.lastElementChild?.querySelector('.msg__body'); if (last) { const l = el('a', 'btn btn--sm cart-link', window.LuxoraI18n ? LuxoraI18n.t('Go to cart') : 'Go to cart'); l.href = '#/cart'; l.style.alignSelf = 'flex-start'; last.append(l); } }
      }
    });
    restoring = false; feed.scrollTop = feed.scrollHeight;
  }
  restoreAll();
  /* the chosen language's dictionary arrives after boot (and can change): redraw the saved conversation so error and
     fallback replies show translated */
  document.addEventListener('luxora:i18n', () => { if (!busyReply) restoreAll(); });
  const q = new URLSearchParams(location.search).get('q'); if (q) send(q);
})();
