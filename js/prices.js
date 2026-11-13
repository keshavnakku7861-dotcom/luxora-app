/* Luxora prices: the ONE client-side price source. It mirrors the official Cloudflare Worker
   (https://luxora-api.keshavnakku7861.workers.dev, PRICE_CATALOG + shipping in worker.js) exactly, so every price shown in
   Luxora (shop, assistant panel, cards, cart, checkout, saved) equals what the Worker sends to Stripe.
   Keep PRICE_CATALOG / COLORS / SIZES / SHIPPING identical to the Worker; scripts/check-prices.js fails if they drift.
   Deals (deals.json) are never a cart or checkout price unless the Worker would charge that exact amount.
   Amounts are calculated in cents, the same way as the Worker (Math.round(unit * 100) * qty). */
(function (root) {
  const PRICE_CATALOG = {
    'aura-ring-4': { default: 349, midnight: 399 },
    'nova-ring': { default: 324.99 },
    'ring-pro': { default: 399 },
    'pulse-watch-s': { default: 249.99 },
    'orbit-watch': { default: 399 },
    'drift-buds': { default: 99.99 },
    'echo-buds-pro': { default: 199 },
    'studio-cans': { default: 199.99 },
    'calm-over-ear': { default: 89.99 },
    'ipad-mini-a20': { default: 699 },
    'kindle-16gb-2026': { default: 149.99 },
    'echo-dot-2026': { default: 99.99 },
    'alexa-tablet-8': { default: 219.99 }
  };
  /* allowed colour / finish keys per product (a key with its own PRICE_CATALOG entry has its own price, others use default) */
  const COLORS = {
    'aura-ring-4': ['silver', 'midnight'],
    'nova-ring': ['silver'],
    'ring-pro': ['silver'],
    'pulse-watch-s': ['gray'],
    'orbit-watch': ['standard'],
    'drift-buds': ['black'],
    'echo-buds-pro': ['white'],
    'studio-cans': ['black'],
    'calm-over-ear': ['black'],
    'ipad-mini-a20': ['standard'],
    'kindle-16gb-2026': ['standard'],
    'echo-dot-2026': ['standard'],
    'alexa-tablet-8': ['standard']
  };
  /* sizes Luxora's Stripe checkout can sell. "Sizing kit" is NOT sellable: it comes from the ring brand, never as a paid ring. */
  const RING_SIZES = ['Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11'];
  const ONE_SIZE = ['One size'];
  const SIZES = {
    'aura-ring-4': RING_SIZES, 'nova-ring': RING_SIZES, 'ring-pro': RING_SIZES,
    'pulse-watch-s': ONE_SIZE, 'orbit-watch': ONE_SIZE, 'drift-buds': ONE_SIZE, 'echo-buds-pro': ONE_SIZE, 'studio-cans': ONE_SIZE,
    'calm-over-ear': ONE_SIZE, 'ipad-mini-a20': ONE_SIZE, 'kindle-16gb-2026': ONE_SIZE, 'echo-dot-2026': ONE_SIZE, 'alexa-tablet-8': ONE_SIZE
  };
  const SHIPPING = { standard: 9.99, express: 19.99, freeOver: 150 };
  const MAX_QTY = 9, MAX_LINES = 20;
  const own = (o, k) => o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

  /* unit price in USD the Worker charges for (id, color), or null if the id/colour is not sellable */
  function unitPrice(id, color) {
    if (!own(PRICE_CATALOG, id) || !own(COLORS, id)) return null;
    const c = color || COLORS[id][0];
    if (!COLORS[id].includes(c)) return null;
    const p = PRICE_CATALOG[id];
    return own(p, c) ? p[c] : p.default;
  }
  const cents = usd => Math.round(Number(usd) * 100);
  const validSize = (id, size) => own(SIZES, id) && SIZES[id].includes(size);
  const isSizingKit = size => /sizing kit/i.test(String(size || ''));

  /* checks one cart line; returns null when it is sellable, otherwise a short reason */
  function lineProblem(item) {
    if (!item || !own(PRICE_CATALOG, item.id)) return 'unknown-product';
    if (unitPrice(item.id, item.color) == null) return 'unknown-color';
    if (isSizingKit(item.size)) return 'sizing-kit';
    if (!validSize(item.id, item.size)) return 'size-required';
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY) return 'bad-qty';
    return null;
  }
  function shippingCents(subtotalCents, method) {
    if (!subtotalCents) return 0;
    if (method === 'express') return cents(SHIPPING.express);
    return subtotalCents >= cents(SHIPPING.freeOver) ? 0 : cents(SHIPPING.standard);
  }
  /* the exact quote the Worker computes: { ok, subtotalCents, shippingCents, totalCents, lines, problems } */
  function quote(items, method = 'standard') {
    const list = Array.isArray(items) ? items : [], problems = [], lines = [];
    let subtotalCents = 0;
    if (list.length > MAX_LINES) problems.push({ index: -1, reason: 'too-many-lines' });
    list.forEach((item, index) => {
      const why = lineProblem(item);
      if (why) { problems.push({ index, id: item && item.id, reason: why }); return; }
      const unitCents = cents(unitPrice(item.id, item.color));
      subtotalCents += unitCents * item.qty;
      lines.push({ id: item.id, color: item.color, size: item.size, qty: item.qty, unitCents });
    });
    const ship = shippingCents(subtotalCents, method);
    return { ok: !problems.length && lines.length > 0, subtotalCents, shippingCents: ship, totalCents: subtotalCents + ship, lines, problems };
  }
  /* make the product data use the Worker prices (base price = first colour, finish variants = their own key).
     Returns a list of corrections so a mismatch in js/offline.js is visible in the console and in tests. */
  function syncProducts(products) {
    const fixed = [];
    (products || []).forEach(p => {
      if (!p || !own(PRICE_CATALOG, p.id)) return;
      const base = unitPrice(p.id, (p.colors || [])[0]);
      if (base != null && p.price !== base) { fixed.push({ id: p.id, color: (p.colors || [])[0], from: p.price, to: base }); p.price = base; }
      Object.keys(p.variants || {}).forEach(k => {
        const v = p.variants[k], u = unitPrice(p.id, k);
        if (u != null && v.price !== u) { fixed.push({ id: p.id, color: k, from: v.price, to: u }); v.price = u; }
      });
    });
    return fixed;
  }
  const api = { PRICE_CATALOG, COLORS, SIZES, RING_SIZES, SHIPPING, MAX_QTY, MAX_LINES, unitPrice, cents, validSize, isSizingKit, lineProblem, shippingCents, quote, syncProducts };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LuxoraPrices = api;
})(typeof window !== 'undefined' ? window : null);
