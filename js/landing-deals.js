/* Landing mockups (Silver Oura Ring 4): show the live deal price (from deals.json) for products with a data-price="<productId>" element. */
fetch('deals.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(f => {
  if (!f) return;
  const fmt = n => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
  /* only show a deal price the official Worker would actually charge (js/prices.js mirrors the Worker catalog) */
  const P = window.LuxoraPrices, charged = d => P ? P.unitPrice(d.productId, (P.COLORS[d.productId] || [])[0]) : null;
  (f.deals || []).filter(d => (!d.endsAt || new Date(d.endsAt) > Date.now()) && charged(d) != null && Math.round(d.dealPrice * 100) === Math.round(charged(d) * 100)).forEach(d => {
    document.querySelectorAll(`[data-price="${d.productId}"]`).forEach(el => {
      const m = /amazon\.com\/dp\/(\w+)/.exec(d.url || d.sourceUrl || ''); if (m && el.dataset.asin && m[1] !== el.dataset.asin) return;   // a deal on another variant (e.g. Ceramic Midnight) is not this item's price
      el.innerHTML = `<s class="was">${fmt(d.listPrice)}</s> ${fmt(d.dealPrice)}`; el.classList.add('is-deal'); el.title = 'Deal'; });
  });
}).catch(() => {});
