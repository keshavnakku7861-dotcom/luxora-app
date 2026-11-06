/* Luxora shared store: cart + saved items in localStorage (used by assistant, shop and saved pages). */
(() => {
  const KC = 'luxora.cart', KS = 'luxora.saved';
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} document.dispatchEvent(new Event('luxora:change')); };
  const catalog = () => Object.fromEntries((window.LuxoraOffline?.products || []).map(p => [p.id, p]));
  const FREE_OVER = 150, STANDARD = 9.99, EXPRESS = 19.99;

  /* drop old cart/saved lines for products no longer in the catalog, and refresh names/brands from it (runs once on load) */
  function migrate() {
    const cat = catalog(); if (!Object.keys(cat).length) return;
    const line = i => { const c = cat[i.id], v = c && c.variants && c.variants[i.color]; return { ...i, name: (v && v.name) || c.name, store: c.store, imageId: (v && v.imageId) || i.imageId || c.imageId }; };
    try {
      const raw = read(KC, []), cart = raw.filter(i => i && cat[i.id]).map(line);
      if (JSON.stringify(cart) !== JSON.stringify(raw)) localStorage.setItem(KC, JSON.stringify(cart));
      const sv = read(KS, []), keep = sv.filter(x => cat[typeof x === 'string' ? x : x && x.id]);
      if (keep.length !== sv.length) localStorage.setItem(KS, JSON.stringify(keep));
    } catch {}
  }
  migrate();
  const Store = {
    FREE_OVER, STANDARD, EXPRESS,
    cart: () => read(KC, []),
    saved: () => read(KS, []).map(x => typeof x === 'string' ? { id: x } : x).filter(x => x && x.id),   // old format was a list of ids
    count: () => Store.cart().reduce((n, i) => n + i.qty, 0),
    savedCount: () => Store.saved().length,
    isSaved: id => Store.saved().some(s => s.id === id),
    /* a finish variant (e.g. Oura Ring 4 Ceramic Midnight) shown through its base product */
    variant(p, color) { const v = p && p.variants && p.variants[color]; return v ? { ...p, ...v, id: p.id, variantOf: p.id, variantKey: color, colors: [color], deal: v.deal || null, listPrice: v.listPrice } : p; },
    colorName: (p, c) => (p && p.colorNames && p.colorNames[c]) || (c ? c[0].toUpperCase() + c.slice(1) : ''),
    /* the catalog product a saved/cart line points at, resolved to its finish variant (color) when it has one */
    resolve(item) { const c = item && catalog()[item.id]; return c ? Store.variant(c, item.color) : null; },
    /* the identity a line keeps from the product the shopper actually picked (variant name, image, price, date, link) */
    snapshot(p) { return { name: p.name, price: p.price, imageId: p.imageId || p.id, checkedAt: p.checkedAt || null, variantKey: p.variantKey || null, retailer: p.retailer ? p.retailer.name : null, url: (p.amazon && p.amazon.url) || (p.retailer && p.retailer.url) || null, asin: (p.amazon && p.amazon.asin) || null }; },
    info(item) { const c = Store.resolve(item) || {}; return { id: item.id, name: item.name || c.name || 'Product', store: item.store || c.store || 'Luxora', price: item.price ?? c.price ?? 0, retailer: c.retailer, imageId: item.imageId || c.imageId || item.id, checkedAt: item.checkedAt || c.checkedAt, url: item.url || null, asin: item.asin || null, variantKey: item.variantKey || c.variantKey || null }; },
    /* "Buy at <retailer>" link: new tab, noopener, sponsored */
    buyLink(p, cls = 'btn', label) {
      const r = p && p.retailer; if (!r || !/^https:/.test(r.url)) return '';
      if (r.name === 'Amazon' && p.amazon) return Store.amazonLink(p, cls, 'Buy now', true).replace(' data-amazon=', ` data-buy="${Store.esc(p.id)}" data-amazon=`);   // Amazon is the retailer: a single tagged button
      return `<a class="${cls}" href="${Store.esc(r.url)}" target="_blank" rel="noopener noreferrer sponsored" data-buy="${Store.esc(p.id)}">${label || 'Buy at ' + Store.esc(r.name)}<span aria-hidden="true"> &#8599;</span><span class="sr-only"> (opens in a new tab)</span></a>`;
    },
    /* "Buy now" on Amazon (Amazon Associates tag in the URL). always=false skips it when Amazon is already the main retailer, to avoid a duplicate button */
    DISCLOSURE: 'As an Amazon Associate, Luxora earns from qualifying purchases.',
    /* pre-order products (e.g. a device not released yet): true until the release day */
    preorder: p => !!(p && p.preorder && Date.now() < new Date(p.preorder.releases + 'T00:00:00').getTime()),
    preorderTag(p) { if (!Store.preorder(p)) return ''; const d = new Date(p.preorder.releases + 'T12:00:00'); return `<span class="pretag">Pre-order · releases ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>`; },
    amazonLink(p, cls = 'btn', label, always, opts = {}) {
      if (Store.preorder(p) && (!label || label === 'Buy now')) label = 'Pre-order';
      const a = p && p.amazon; if (!a || !/^https:\/\/www\.amazon\.com\/.*[?&]tag=luxora004-20/.test(a.url)) return '';
      if (!always && p.retailer && p.retailer.name === 'Amazon') return '';
      return `<a class="${cls}" href="${Store.esc(a.url)}" target="_blank" rel="sponsored noopener" data-amazon="${Store.esc(p.id)}" title="Opens Amazon.com in a new tab">${label || 'Buy now'}<span aria-hidden="true"> &#8599;</span>${opts.hint === false ? '' : '<small class="amzhint">on Amazon</small>'}<span class="sr-only"> (opens Amazon in a new tab)</span></a>`;
    },
    checked: p => { const d = new Date((p && p.checkedAt || '2026-11-03') + 'T12:00:00'); return 'Price checked ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); },
    defaults(p) { return { size: p.sizes[0], color: p.colors[0] }; },
    /* sizes the shopper must pick (rings, watches...). "One size" products need no choice. */
    needsSize: p => (p.sizes || []).some(x => x !== 'One size'),
    addToCart(p, opts = {}) {
      if (Store.needsSize(p) && !opts.size) return null;   // a size must be chosen first
      const cart = Store.cart(), line = { ...Store.snapshot(p), id: p.id, store: p.store, size: opts.size || (Store.needsSize(p) ? '' : p.sizes[0]), color: opts.color || p.colors[0], qty: opts.qty || 1 };
      const hit = cart.find(i => i.id === line.id && i.size === line.size && i.color === line.color);
      if (hit) hit.qty = Math.min(9, hit.qty + line.qty); else cart.push(line);
      write(KC, cart); return line;
    },
    setCart(cart) { write(KC, cart); },
    setQty(idx, qty) { const c = Store.cart(); if (c[idx]) { c[idx].qty = Math.max(1, Math.min(9, qty)); write(KC, c); } },
    removeLine(idx) { const c = Store.cart(); c.splice(idx, 1); write(KC, c); },
    clearCart() { write(KC, []); },
    toggleSaved(p, opts = {}) {
      let s = Store.saved(); const on = s.some(x => x.id === p.id);
      s = on ? s.filter(x => x.id !== p.id) : [...s, { ...Store.snapshot(p), id: p.id, size: opts.size || (Store.needsSize(p) ? '' : p.sizes[0]), color: opts.color || p.colors[0] }];
      write(KS, s); return !on;
    },
    clearSaved() { write(KS, []); },
    removeSaved(id) { write(KS, Store.saved().filter(x => x.id !== id)); },
    subtotal: () => Store.cart().reduce((s, i) => s + Store.info(i).price * i.qty, 0),
    shipping(method = 'standard') { const sub = Store.subtotal(); if (!sub) return 0; return method === 'express' ? EXPRESS : (sub >= FREE_OVER ? 0 : STANDARD); },
    money: n => window.LuxoraPrefs ? LuxoraPrefs.fmt(n) : '$' + Number(n).toFixed(2),
    esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    bind() {
      if (Store._bound) return; Store._bound = true;
      const set = (sel, n) => document.querySelectorAll(sel).forEach(b => { b.textContent = n; b.hidden = n === 0; });
      const upd = () => { set('[data-cart-badge]', Store.count()); set('[data-saved-badge]', Store.savedCount()); };
      upd(); document.addEventListener('luxora:change', upd); window.addEventListener('storage', e => { if (e.key === KC || e.key === KS) { upd(); document.dispatchEvent(new Event('luxora:external')); } });
    }
  };
  window.LuxoraStore = Store;
})();
