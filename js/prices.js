/* Luxora prices: the ONE client-side price source. It mirrors the official Cloudflare Worker
   (https://luxora-api.keshavnakku7861.workers.dev, PRICE_CATALOG + shipping in worker.js) exactly, so every price shown in
   Luxora (shop, assistant panel, cards, cart, checkout, saved) equals what the Worker sends to Stripe.
   Keep PRICE_CATALOG / COLORS / SIZES / SHIPPING identical to the Worker; scripts/check-prices.js fails if they drift.
   Deals (deals.json) are never a cart or checkout price unless the Worker would charge that exact amount.
   Amounts are calculated in cents, the same way as the Worker (Math.round(unit * 100) * qty).
   Promo codes: PROMO_CODES (one active code) and PROMO_EXCLUDED (product/finish combinations already on a deal, which a
   promo code never discounts) are identical in the Worker; the discount is whole cents:
   unitCents = baseUnitCents - Math.round(baseUnitCents * discountPercent / 100). */
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
  /* the ONE active promo code (input is trimmed + upper-cased, so " ram2016 " works). Keep identical to the Worker. */
  const PROMO_CODES = { RAM2016: { discountPercent: 15 } };
  /* (product, finish) combinations that already have a deal / discount today, so a promo code never stacks on them.
     These are the deals.json deals the app actually applies on Nov 13, 2026 (dealPrice == Worker price, not expired),
     which are also the products whose offline.js listPrice is above the price. The Oura Ring 4 Ceramic Midnight deal
     ($279) is NOT here: it expired Nov 11, 2026 23:59 CST and the Worker charges $399, so deals.js never applies it.
     scripts/check-prices.js fails if this list drifts from deals.json / offline.js or from the Worker. */
  const PROMO_EXCLUDED = {
    'drift-buds': ['black'],
    'echo-buds-pro': ['white'],
    'studio-cans': ['black'],
    'calm-over-ear': ['black']
  };
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
  const normalizePromo = code => (typeof code === 'string' ? code.trim().toUpperCase() : '');
  /* { ok, code, discountPercent }: an empty code is ok (no promo); an unknown code is { ok: false, reason: 'invalid-promo' } */
  function validatePromo(code) {
    const c = normalizePromo(code);
    if (!c) return { ok: true, code: '', discountPercent: 0 };
    if (!own(PROMO_CODES, c)) return { ok: false, code: c, discountPercent: 0, reason: 'invalid-promo' };
    return { ok: true, code: c, discountPercent: PROMO_CODES[c].discountPercent };
  }
  /* true when this product/finish already has a deal, so promo codes never apply to it */
  const isDealExcluded = (id, color) => own(PROMO_EXCLUDED, id) && own(COLORS, id) && PROMO_EXCLUDED[id].includes(color || COLORS[id][0]);
  /* the unit price in cents with a promo applied (same integer formula as the Worker), or null when not sellable */
  function promoUnit(id, color, promoCode) {
    const u = unitPrice(id, color); if (u == null) return null;
    const baseUnitCents = cents(u), v = validatePromo(promoCode), dealExcluded = isDealExcluded(id, color);
    const promoApplied = v.ok && v.discountPercent > 0 && !dealExcluded;
    const unitCents = promoApplied ? baseUnitCents - Math.round(baseUnitCents * v.discountPercent / 100) : baseUnitCents;
    return { baseUnitCents, unitCents, promoApplied, dealExcluded, promoCode: v.ok ? v.code : '', discountPercent: promoApplied ? v.discountPercent : 0 };
  }
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
  /* the exact quote the Worker computes: { ok, subtotalCents, shippingCents, totalCents, lines, problems, promo... }.
     promoCode is optional (omitted / '' = no promo, exactly as before). An unknown code makes the quote not ok
     (problem 'invalid-promo') and prices stay at the base price. Each line: unitCents (final unit price, promo applied),
     baseUnitCents, promoApplied, dealExcluded. Shipping is worked out on the discounted subtotal. */
  function quote(items, method = 'standard', promoCode = '') {
    const list = Array.isArray(items) ? items : [], problems = [], lines = [];
    const v = validatePromo(promoCode), code = v.ok ? v.code : '';
    let subtotalCents = 0, discountCents = 0;
    if (!v.ok) problems.push({ index: -1, reason: 'invalid-promo', code: v.code });
    if (list.length > MAX_LINES) problems.push({ index: -1, reason: 'too-many-lines' });
    list.forEach((item, index) => {
      const why = lineProblem(item);
      if (why) { problems.push({ index, id: item && item.id, reason: why }); return; }
      const u = promoUnit(item.id, item.color, code);
      subtotalCents += u.unitCents * item.qty; discountCents += (u.baseUnitCents - u.unitCents) * item.qty;
      lines.push({ id: item.id, color: item.color, size: item.size, qty: item.qty, unitCents: u.unitCents, baseUnitCents: u.baseUnitCents, promoApplied: u.promoApplied, dealExcluded: u.dealExcluded });
    });
    const ship = shippingCents(subtotalCents, method);
    return { ok: !problems.length && lines.length > 0, subtotalCents, shippingCents: ship, totalCents: subtotalCents + ship, lines, problems,
      promoCode: code, discountPercent: code ? PROMO_CODES[code].discountPercent : 0, discountCents };
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
  const api = { PRICE_CATALOG, COLORS, SIZES, RING_SIZES, SHIPPING, MAX_QTY, MAX_LINES, PROMO_CODES, PROMO_EXCLUDED, unitPrice, cents, validSize, isSizingKit, lineProblem, shippingCents, quote, syncProducts, normalizePromo, validatePromo, isDealExcluded, promoUnit };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LuxoraPrices = api;
})(typeof window !== 'undefined' ? window : null);
