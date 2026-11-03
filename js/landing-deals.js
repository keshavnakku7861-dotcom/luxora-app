/* Landing mockups: show the live deal price (from deals.json) for products with a data-price="<productId>" element. */
fetch('deals.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(f => {
  if (!f) return;
  const fmt = n => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
  (f.deals || []).filter(d => new Date(d.endsAt) > Date.now()).forEach(d => {
    document.querySelectorAll(`[data-price="${d.productId}"]`).forEach(el => { el.innerHTML = `<s class="was">${fmt(d.listPrice)}</s> ${fmt(d.dealPrice)}`; el.classList.add('is-deal'); el.title = 'Sample deal'; });
  });
}).catch(() => {});
