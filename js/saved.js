/* Luxora saved page: favorited items (localStorage 'luxora.saved'). Move to cart / remove. */
(() => {
  const $ = s => document.querySelector(s);
  const S = window.LuxoraStore, money = S.money, esc = S.esc, byId = Object.fromEntries(window.LuxoraOffline.products.map(p => [p.id, p]));
  const cname = c => c[0].toUpperCase() + c.slice(1);
  S.bind();
  function toast(t, link) {
    const el = $('#toast'); el.textContent = t; if (link) el.insertAdjacentHTML('beforeend', ` &middot; <a href="${link[1]}">${link[0]}</a>`);
    el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3500);
  }
  function render() {
    const items = S.saved().filter(x => byId[x.id]), box = $('#lines');
    $('#moveAll').hidden = items.length < 2;
    if (!items.length) {
      box.className = 'sempty';
      box.innerHTML = `<span data-logo class="logo__mark"></span><h2>No saved items yet</h2><p>Tap the heart on any product to keep it here for later.</p><a class="btn" href="#/shop">Browse the shop</a>`;
      LuxoraArt.hydrate(box); return;
    }
    box.className = 'lines';
    box.innerHTML = items.map(x => {
      const p = S.variant(byId[x.id], x.color), f = S.info(x), q = p.variantKey ? '?c=' + p.variantKey : '', size = x.size || (S.needsSize(p) ? 'not chosen yet' : p.sizes[0]), color = x.color || p.colors[0];
      return `<article class="line">
        <a class="line__img" href="#/shop/p/${p.id}${q}" aria-label="View ${esc(f.name)}">${LuxoraArt.product({ ...p, name: f.name, imageId: f.imageId })}</a>
        <div><div class="line__store">${esc(p.store)}</div><h2 class="line__name"><a href="#/shop/p/${p.id}${q}">${esc(f.name)}</a></h2>
          <div class="line__opts"><span>Size: ${esc(size)}</span><span><i class="dot c-${esc(color)}"></i>${cname(color)}</span><span>${esc(S.checked({ checkedAt: f.checkedAt }).replace('Price checked', 'Checked'))}</span></div>
          <div class="line__ctl"><button class="btn btn--sm" data-move="${p.id}">${S.needsSize(p) && !x.size ? 'Choose size' : 'Move to cart'}</button><button class="rm" data-unsave="${p.id}">Remove</button></div></div>
        <div class="line__price">${money(f.price)}</div></article>`;
    }).join('');
  }
  function move(id) {
    const x = S.saved().find(s => s.id === id); if (!x || !byId[id]) return;
    const v = S.variant(byId[id], x.color), f = S.info(x);
    if (S.needsSize(v) && !x.size) return { needSize: v };
    /* keep the saved variant's identity (name, image, price, date, link) instead of rebuilding the base product */
    const p = { ...v, name: f.name, price: f.price, imageId: f.imageId, checkedAt: f.checkedAt, amazon: f.url && /amazon\.com/.test(f.url) ? { ...(v.amazon || {}), url: f.url, asin: f.asin || (v.amazon && v.amazon.asin) } : v.amazon };
    S.addToCart(p, { size: x.size, color: x.color }); S.removeSaved(id); return p;
  }
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-move]'), r = e.target.closest('[data-unsave]');
    if (m) { const p = move(m.dataset.move); if (p && p.needSize) { location.hash = '#/shop/p/' + p.needSize.id; toast(`Choose a size for ${p.needSize.name} first`); } else if (p) toast(`Moved ${p.name} to cart`, ['View cart', '#/cart']); }
    else if (r) { S.removeSaved(r.dataset.unsave); toast('Removed from saved'); }
    else if (e.target.id === 'moveAll') { const res = S.saved().map(s => move(s.id)), done = res.filter(r => r && !r.needSize).length, skipped = res.filter(r => r && r.needSize).length; toast(`Moved ${done} item${done === 1 ? '' : 's'} to cart${skipped ? `; ${skipped} still need a size` : ''}`, ['View cart', '#/cart']); }
  });
  document.addEventListener('luxora:change', render); document.addEventListener('luxora:external', render);
  render();
})();
