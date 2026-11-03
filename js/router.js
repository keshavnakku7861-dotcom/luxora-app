/* Luxora app shell router. One page (app.html): the sidebar stays put and hash routes swap the main area.
   #/assistant (home) · #/saved · #/shop · #/shop/p/<id> · #/cart (shop + cart drawer). Back/forward just work. */
(() => {
  const $ = s => document.querySelector(s), S = window.LuxoraStore;
  const views = { assistant: $('#viewAssistant'), saved: $('#viewSaved'), shop: $('#viewShop') };
  const nav = { assistant: $('#navHome'), saved: $('#navSaved'), shop: $('#navCart') };
  let prev = '#/shop', cartOpen = false;

  function parse() {
    const raw = location.hash || '#/assistant', [path, qs] = raw.split('?'), query = Object.fromEntries(new URLSearchParams(qs || ''));
    const seg = path.replace(/^#\/?/, '').split('/');
    if (seg[0] === 'saved') return { view: 'saved', query };
    if (seg[0] === 'cart') return { view: 'shop', cart: true, query };
    if (seg[0] === 'shop') return { view: 'shop', pid: seg[1] === 'p' ? seg[2] : null, query };
    return { view: 'assistant', query };
  }
  function route() {
    const r = parse(), Shop = window.LuxoraShop;
    for (const k in views) views[k].hidden = k !== r.view;
    for (const k in nav) { const on = k === r.view; nav[k].classList.toggle('on', on); on ? nav[k].setAttribute('aria-current', 'page') : nav[k].removeAttribute('aria-current'); }
    if (r.view === 'assistant') { document.title = 'AI Assistant - Luxora'; window.LuxoraAssistant.refresh(); }
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
  nav.assistant.addEventListener('click', e => { if (parse().view === 'assistant') { e.preventDefault(); location.reload(); } });
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#/assistant');
  route();
})();
