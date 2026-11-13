#!/usr/bin/env node
/* Unit tests for cart re-pricing (js/store.js), deal guarding (js/deals.js) and the shared price source (js/prices.js).
   Runs the real browser files in a Node vm with a fake localStorage/document. Usage: node scripts/test-pricing.js */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = path.join(__dirname, '..'), src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fails = 0, passes = 0;
const plain = x => JSON.parse(JSON.stringify(x));
async function test(name, fn) { try { await fn(); passes++; console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + '\n     ' + e.message); } }

/* boot the app scripts the way app.html loads them: offline -> prices -> store (-> deals) */
function boot({ cart = [], saved = [], feed = null } = {}) {
  const ls = new Map([['luxora.cart', JSON.stringify(cart)], ['luxora.saved', JSON.stringify(saved)]]);
  const localStorage = { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const events = [];
  const document = { dispatchEvent: e => events.push(e.type), addEventListener() {}, querySelectorAll: () => [] };
  const window = {};
  const ctx = vm.createContext({ window, localStorage, document, Event: class { constructor(t) { this.type = t; } }, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } }, console: { warn() {}, info() {}, log() {} }, Date, JSON, Math, Number, Object, Array, String, Promise, setTimeout });
  ctx.window = window; Object.assign(window, { localStorage, document });
  ctx.fetch = async () => ({ ok: !!feed, json: async () => feed });
  for (const f of ['js/offline.js', 'js/prices.js', 'js/store.js']) vm.runInContext(src(f), ctx, { filename: f });
  if (feed) vm.runInContext(src('js/deals.js'), ctx, { filename: 'js/deals.js' });
  return { S: window.LuxoraStore, P: window.LuxoraPrices, D: window.LuxoraDeals, products: window.LuxoraOffline.products, ls, events };
}
const line = (o) => ({ id: 'aura-ring-4', name: 'Oura Ring 4', store: 'Oura', size: 'Size 7', color: 'silver', qty: 1, price: 349, ...o });

(async () => {
  await test('old deal price in cart ($279 Ceramic Midnight) is re-priced to $399 on load, with a notice', () => {
    const { S, ls } = boot({ cart: [line({ color: 'midnight', name: 'Oura Ring 4 Ceramic Midnight', price: 279 })] });
    assert.strictEqual(JSON.parse(ls.get('luxora.cart'))[0].price, 399);
    assert.strictEqual(S.subtotal(), 399);
    const n = S.takeNotices(); assert.strictEqual(n.length, 1); assert.strictEqual(n[0].type, 'price'); assert.match(n[0].message, /\$399\.00 \(was \$279\.00\)/);
    assert.strictEqual(S.takeNotices().length, 0, 'notices are shown once');
  });
  await test('assistant-panel bug line (midnight stored at $349) is re-priced to $399', () => {
    const { S } = boot({ cart: [line({ color: 'midnight', price: 349 })] });
    assert.strictEqual(S.info(S.cart()[0]).price, 399); assert.strictEqual(S.quote().totalCents, 39900);
  });
  await test('info() ignores a tampered stored price', () => {
    const { S, ls } = boot(); ls.set('luxora.cart', JSON.stringify([line({ price: 1 })]));
    assert.strictEqual(S.info(S.cart()[0]).price, 349); assert.strictEqual(S.subtotal(), 349);
  });
  await test('a "Sizing kit" line is removed (never charged as a ring) with a notice', () => {
    const { S } = boot({ cart: [line({ size: 'Sizing kit' }), line({ id: 'drift-buds', color: 'black', size: 'One size', price: 99.99 })] });
    assert.deepStrictEqual(plain(S.cart().map(i => i.id)), ['drift-buds']);
    const n = S.takeNotices(); assert.strictEqual(n[0].type, 'removed'); assert.match(n[0].message, /sizing kit/i);
  });
  await test('ring line without a size, unknown colour and unknown product are removed', () => {
    const { S } = boot({ cart: [line({ size: '' }), line({ color: 'gold' }), line({ id: 'ghost' })] });
    assert.strictEqual(S.cart().length, 0);
  });
  await test('quantity outside 1-9 is clamped with a notice', () => {
    const { S } = boot({ cart: [line({ qty: 15 })] });
    assert.strictEqual(S.cart()[0].qty, 9); assert.strictEqual(S.takeNotices()[0].type, 'qty');
  });
  await test('addToCart refuses a sizing kit and stores the Worker price for Ceramic Midnight', () => {
    const { S, products } = boot(); const aura = products.find(p => p.id === 'aura-ring-4');
    assert.strictEqual(S.addToCart(aura, { size: 'Sizing kit', color: 'silver' }), null);
    assert.strictEqual(S.addToCart(aura, { color: 'silver' }), null, 'ring size required');
    const v = S.variant(aura, 'midnight'); assert.strictEqual(v.price, 399);
    const l = S.addToCart(v, { size: 'Size 8', color: 'midnight' }); assert.strictEqual(l.price, 399); assert.strictEqual(l.color, 'midnight');
    assert.strictEqual(S.quote().totalCents, 39900);
  });
  await test('addToCart with the base product but midnight colour still stores $399 (old panel path)', () => {
    const { S, products } = boot(); const aura = products.find(p => p.id === 'aura-ring-4');
    assert.strictEqual(S.addToCart(aura, { size: 'Size 8', color: 'midnight' }).price, 399);
  });
  await test('sellableSizes never includes the sizing kit', () => {
    const { S, products } = boot(); for (const p of products) assert.ok(!S.sellableSizes(p).some(x => /sizing kit/i.test(x)), p.id);
  });
  await test('shipping: $9.99 under $150, free at/over $150, express always $19.99 (same as Worker)', () => {
    const one = boot({ cart: [line({ id: 'calm-over-ear', color: 'black', size: 'One size', price: 89.99 })] }).S;
    assert.strictEqual(one.shipping(), 9.99); assert.strictEqual(one.shipping('express'), 19.99);
    const two = boot({ cart: [line({ id: 'calm-over-ear', color: 'black', size: 'One size', price: 89.99, qty: 2 })] }).S;
    assert.strictEqual(two.subtotal(), 179.98); assert.strictEqual(two.shipping(), 0); assert.strictEqual(two.quote('express').totalCents, 17998 + 1999);
    assert.strictEqual(boot().S.shipping(), 0, 'empty cart has no shipping');
  });
  await test('quote(): too many lines / bad lines are flagged as not ok', () => {
    const { P } = boot();
    assert.strictEqual(P.quote([]).ok, false);
    assert.strictEqual(P.quote(Array.from({ length: 21 }, () => ({ id: 'drift-buds', color: 'black', size: 'One size', qty: 1 }))).ok, false);
    assert.strictEqual(P.quote([{ id: 'aura-ring-4', color: 'silver', size: 'Sizing kit', qty: 1 }]).ok, false);
    assert.strictEqual(P.quote([{ id: 'aura-ring-4', color: 'silver', size: 'Size 6', qty: 1.5 }]).ok, false);
  });
  await test('deals.js: a deal whose price the Worker would not charge is NOT applied', async () => {
    const feed = { deals: [
      { id: 'future-midnight', productId: 'aura-ring-4', listPrice: 499, dealPrice: 279, endsAt: null, url: 'https://www.amazon.com/dp/B0FKQW8LTZ?tag=luxora004-20' },
      { id: 'future-kindle', productId: 'kindle-16gb-2026', listPrice: 149.99, dealPrice: 109.99, endsAt: null },
      { id: 'studio', productId: 'studio-cans', listPrice: 399.99, dealPrice: 199.99, endsAt: null }] };
    const { D, products } = boot({ feed }); await D.ready;
    const aura = products.find(p => p.id === 'aura-ring-4'), kindle = products.find(p => p.id === 'kindle-16gb-2026'), studio = products.find(p => p.id === 'studio-cans');
    assert.strictEqual(aura.variants.midnight.price, 399); assert.ok(!aura.variants.midnight.deal);
    assert.strictEqual(kindle.price, 149.99); assert.ok(!kindle.deal);
    assert.strictEqual(studio.price, 199.99); assert.ok(studio.deal, 'a deal equal to the Worker price is still shown');
    assert.deepStrictEqual(plain(D.list.map(d => d.id)), ['studio']);
  });
  await test('product data drift is corrected to the Worker price at load', () => {
    const { P } = boot(); const fake = [{ id: 'nova-ring', price: 1, colors: ['silver'] }, { id: 'aura-ring-4', price: 349, colors: ['silver', 'midnight'], variants: { midnight: { price: 279 } } }];
    const fixed = P.syncProducts(fake); assert.strictEqual(fake[0].price, 324.99); assert.strictEqual(fake[1].variants.midnight.price, 399); assert.strictEqual(fixed.length, 2);
  });
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})();
