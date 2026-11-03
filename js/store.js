/* Luxora shared store: cart + saved items in localStorage (used by assistant, shop and saved pages). */
(() => {
  const KC = 'luxora.cart', KS = 'luxora.saved';
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} document.dispatchEvent(new Event('luxora:change')); };
  const catalog = () => Object.fromEntries((window.LuxoraOffline?.products || []).map(p => [p.id, p]));
  const FREE_OVER = 150, STANDARD = 9.99, EXPRESS = 19.99;

  const Store = {
    FREE_OVER, STANDARD, EXPRESS,
    cart: () => read(KC, []),
    saved: () => read(KS, []).map(x => typeof x === 'string' ? { id: x } : x).filter(x => x && x.id),   // old format was a list of ids
    count: () => Store.cart().reduce((n, i) => n + i.qty, 0),
    savedCount: () => Store.saved().length,
    isSaved: id => Store.saved().some(s => s.id === id),
    info(item) { const c = catalog()[item.id] || {}; return { id: item.id, name: item.name || c.name || 'Product', store: item.store || c.store || 'Luxora', price: item.price ?? c.price ?? 0 }; },
    defaults(p) { return { size: p.sizes[0], color: p.colors[0] }; },
    addToCart(p, opts = {}) {
      const cart = Store.cart(), line = { id: p.id, name: p.name, store: p.store, price: p.price, size: opts.size || p.sizes[0], color: opts.color || p.colors[0], qty: opts.qty || 1 };
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
      s = on ? s.filter(x => x.id !== p.id) : [...s, { id: p.id, size: opts.size || p.sizes[0], color: opts.color || p.colors[0] }];
      write(KS, s); return !on;
    },
    removeSaved(id) { write(KS, Store.saved().filter(x => x.id !== id)); },
    subtotal: () => Store.cart().reduce((s, i) => s + Store.info(i).price * i.qty, 0),
    shipping(method = 'standard') { const sub = Store.subtotal(); if (!sub) return 0; return method === 'express' ? EXPRESS : (sub >= FREE_OVER ? 0 : STANDARD); },
    money: n => '$' + Number(n).toFixed(2),
    esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    stars: r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)),
    bind() {
      const set = (sel, n) => document.querySelectorAll(sel).forEach(b => { b.textContent = n; b.hidden = n === 0; });
      const upd = () => { set('[data-cart-badge]', Store.count()); set('[data-saved-badge]', Store.savedCount()); };
      upd(); document.addEventListener('luxora:change', upd); window.addEventListener('storage', e => { if (e.key === KC || e.key === KS) { upd(); document.dispatchEvent(new Event('luxora:external')); } });
    }
  };
  window.LuxoraStore = Store;
})();
