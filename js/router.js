/* Luxora app shell router. One page (app.html): the sidebar stays put and hash routes swap the main area.
   #/assistant (home) · #/saved · #/shop · #/shop/p/<id> · #/cart (shop + cart drawer). Back/forward just work. */
(() => {
  const $ = s => document.querySelector(s), S = window.LuxoraStore;
  const views = {
  market: $('#viewMarket'),
  assistant: $('#viewAssistant'),
  saved: $('#viewSaved'),
  shop: $('#viewShop'),
  settings: $('#viewSettings'),
  info: $('#viewInfo'),
  news: $('#viewNews'),
  help: $('#viewHelp')
};
  const nav = {
  assistant: $('#navHome'),
  saved: $('#navSaved'),
  shop: $('#navCart'),
  settings: $('#navSettings'),
  info: $('#navInfo'),
  news: $('#navNews'),
  help: $('#navHelp'),
  market: $('#navHome')
};
  let prev = '#/shop', cartOpen = false;

  function parse() {
    const raw = location.hash || '#/assistant', [path, qs] = raw.split('?'), query = Object.fromEntries(new URLSearchParams(qs || ''));
    const seg = path.replace(/^#\/?/, '').split('/');
    if (seg[0] === 'market') return { view: 'market', query };
    if (seg[0] === 'saved') return { view: 'saved', query };
    if (seg[0] === 'settings') return { view: 'settings', query };
     if (seg[0] === 'info') return { view: 'info', query };
     if (seg[0] === 'whats-new') return { view: 'news', query };
     if (seg[0] === 'help') return { view: 'help', query };
    if (seg[0] === 'cart') return { view: 'shop', cart: true, query };
    if (seg[0] === 'shop') return { view: 'shop', pid: seg[1] === 'p' ? seg[2] : null, query };
    return { view: 'market', query };
  }
  function route() {
    const r = parse(), Shop = window.LuxoraShop;
    for (const k in views) views[k].hidden = k !== r.view;
    for (const k in nav) { const on = k === r.view; nav[k].classList.toggle('on', on); on ? nav[k].setAttribute('aria-current', 'page') : nav[k].removeAttribute('aria-current'); }
    if (r.view === 'market') { document.title = 'Shop at Luxora'; window.LuxoraMarket.show(); }
    else if (r.view === 'assistant') { document.title = 'AI Assistant - Luxora'; window.LuxoraAssistant.refresh(); }
    else if (r.view === 'settings') { document.title = 'Settings - Luxora'; views.settings.scrollTop = 0; }
       else if (r.view === 'info') { document.title = 'Information - Luxora'; views.info.scrollTop = 0; }
          else if (r.view === 'news') { document.title = "What's New - Luxora"; views.news.scrollTop = 0; }
          else if (r.view === 'help') { document.title = 'Help Center - Luxora'; views.help.scrollTop = 0; }
    else if (r.view === 'saved') { document.title = 'Saved items - Luxora'; document.dispatchEvent(new Event('luxora:change')); views.saved.scrollTop = 0; }
    else {
      if (r.cart) { if (!cartOpen && /^#\/shop/.test(prev)) Shop.setReturn(prev); else if (!cartOpen && !Shop.isShown()) Shop.setReturn('#/shop'); if (!Shop.isShown()) Shop.show(null, r.query); }
      else Shop.show(r.pid, r.query);
      document.title = r.cart ? 'Cart - Luxora' : document.title;
    }
    if (r.view !== 'shop' || !r.cart) Shop.setDrawer(false); else Shop.setDrawer(true);
    cartOpen = !!r.cart;
    if (r.view !== 'assistant') window.scrollTo(0, 0);
    prev = location.hash || '#/assistant';
  }
  window.addEventListener('hashchange', route);
  /* clicking Home while already on it starts a fresh chat */
  // Home now opens the multi-category marketplace, while AI remains available at #/assistant.
  /* Help Center: topic rows open their answer in place (no hash change, so routing is untouched); search filters topics;
     the Contact card's ask box hands the question to the Assistant chat */
  views.help.addEventListener('click', e => {
    const t = e.target.closest('button.help-t');
    if (t) { const a = document.getElementById(t.getAttribute('aria-controls')), on = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', String(on)); a.hidden = !on; return; }
    if (e.target.closest('[data-help-newchat]')) { e.preventDefault(); location.hash = '#/assistant'; setTimeout(() => { const n = $('#newChat'); if (n) n.click(); }, 0); }
  });
  const hq = $('#helpQ'), hmsg = $('#helpQMsg');
  const norm = v => v.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9$%]+/g, ' ').trim();
  function helpFilter() {
    const q = norm(hq.value), words = q ? q.split(' ') : [];
    let shown = 0;
    views.help.querySelectorAll('.help-grid article').forEach(card => {
      const head = norm(card.querySelector('h3').textContent); let any = false;
      card.querySelectorAll('.help-topics li').forEach(li => {
        const btn = li.querySelector('button.help-t'), ans = li.querySelector('.help-a');
        const hay = head + ' ' + norm(li.textContent), hit = !words.length || words.every(w => hay.includes(w));
        li.hidden = !hit; if (hit) { any = true; shown++; }
        if (btn) { const open = !!words.length && hit && !words.every(w => head.includes(w)); btn.setAttribute('aria-expanded', String(open)); ans.hidden = !open; }
      });
      card.hidden = !any;
    });
    hmsg.textContent = !words.length ? '' : shown ? `${shown} topic${shown === 1 ? '' : 's'} match \u201c${hq.value.trim()}\u201d.` : `No topics match \u201c${hq.value.trim()}\u201d. Try another word, or ask in the Assistant.`;
  }
  hq.addEventListener('input', helpFilter);
  $('#helpSearch').addEventListener('submit', e => { e.preventDefault(); helpFilter(); const f = views.help.querySelector('.help-grid article:not([hidden]) .help-topics li:not([hidden]) .help-t'); if (f && hq.value.trim()) f.focus(); });
  $('#helpAskForm').addEventListener('submit', e => {
    e.preventDefault(); const inp = $('#helpAsk'), q = inp.value.trim(); if (!q) { inp.focus(); return; }
    inp.value = ''; location.hash = '#/assistant';
    setTimeout(() => { const m = $('#msg'), c = $('#composer'); if (m && c) { m.value = q; c.requestSubmit(); } }, 0);
  });
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/market');
  route();
 


})();
