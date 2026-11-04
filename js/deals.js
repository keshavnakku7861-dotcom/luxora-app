/* Luxora deals: loads deals.json (also read by the EMAIL bot), applies live deals to the catalog in place
   (price -> dealPrice, listPrice, deal) and announces 'luxora:deals'. Deals with an endsAt in the past are ignored; endsAt may be null (price checked on checkedAt). */
(() => {
  const products = window.LuxoraOffline.products;
  const D = window.LuxoraDeals = { list: [], loaded: false, feed: null, byProduct: id => D.list.find(d => d.productId === id) };
  D.endsText = d => { const iso = d && d.endsAt; if (iso) { const ms = new Date(iso) - Date.now(), n = Math.ceil(ms / 864e5), [y, m, day] = iso.slice(0, 10).split('-').map(Number); const date = new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); return n <= 1 ? 'Ends today' : `Ends ${date} (${n} days left)`; }
    const c = d && d.checkedAt ? new Date(d.checkedAt) : new Date('2026-11-03T12:00:00-06:00'); return 'Price checked ' + c.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }); };
  function apply(feed) {
    D.feed = feed;
    D.list = (feed.deals || []).filter(d => d && d.productId && Number.isFinite(d.dealPrice) && (!d.endsAt || new Date(d.endsAt) > Date.now())).map(d => {
      const p = products.find(x => x.id === d.productId); if (!p) return null;
      if (!p.listPrice) p.listPrice = p.price;
      const pct = Math.round((1 - d.dealPrice / p.listPrice) * 100);
      if (pct < 1) return null;
      p.price = d.dealPrice; p.deal = Object.assign({}, d, { listPrice: p.listPrice, discountPercent: pct });
      return p.deal;
    }).filter(Boolean);
  }
  D.ready = fetch('deals.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(apply).catch(() => {})
    .then(() => { D.loaded = true; document.dispatchEvent(new Event('luxora:deals')); });
})();
