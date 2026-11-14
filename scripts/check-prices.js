#!/usr/bin/env node
/* Pricing integrity check: the client price source (js/prices.js) must equal the product data (js/offline.js) and the
   official Cloudflare Worker's PRICE_CATALOG + shipping, and the client quote must equal the amount the Worker sends to
   Stripe for every product / colour / size / quantity, with and without the active promo code (PROMO_CODES), and the
   promo deal exclusions (PROMO_EXCLUDED) must equal the deals the app applies today (deals.json via js/deals.js rules)
   plus the products js/offline.js lists below a list price.
   Usage: node scripts/check-prices.js [path/to/worker.js ...]
   (worker files are a saved copy of the Worker source; Stripe is stubbed, nothing is sent anywhere) */
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'js/prices.js'));
let fails = 0, passes = 0;
const plain = x => JSON.parse(JSON.stringify(x));   // values from vm contexts have other-realm prototypes
const same = (a, b, m) => assert.deepStrictEqual(plain(a), plain(b), m);
const check = (name, fn) => { try { fn(); passes++; console.log('ok   ' + name); } catch (e) { fails++; console.log('FAIL ' + name + '\n     ' + e.message.split('\n').join('\n     ')); } };

/* product data from js/offline.js */
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/offline.js'), 'utf8'), { window: win, console });
const products = win.LuxoraOffline.products;

check('catalog ids: offline.js == prices.js', () => same(products.map(p => p.id).sort(), Object.keys(P.PRICE_CATALOG).sort()));
check('COLORS / SIZES cover every catalog id', () => { same(Object.keys(P.COLORS).sort(), Object.keys(P.PRICE_CATALOG).sort()); same(Object.keys(P.SIZES).sort(), Object.keys(P.PRICE_CATALOG).sort()); });
for (const p of products) {
  check(`${p.id}: colours match`, () => same(p.colors, P.COLORS[p.id]));
  check(`${p.id}: sellable sizes match (sizing kit excluded)`, () => same(p.sizes.filter(s => !P.isSizingKit(s)), P.SIZES[p.id]));
  check(`${p.id}: shown base price ${p.price} == Worker price`, () => assert.strictEqual(p.price, P.unitPrice(p.id, p.colors[0])));
  for (const [k, v] of Object.entries(p.variants || {})) check(`${p.id}/${k}: shown variant price ${v.price} == Worker price`, () => assert.strictEqual(v.price, P.unitPrice(p.id, k)));
}
check('unknown id / colour / prototype keys are not sellable', () => {
  for (const [id, c] of [['nope', 'silver'], ['__proto__', 'default'], ['constructor', undefined], ['aura-ring-4', 'gold'], ['aura-ring-4', '__proto__'], ['aura-ring-4', 'toString'], ['nova-ring', 'midnight']]) assert.strictEqual(P.unitPrice(id, c), null, `${id}/${c}`);
});
check('Ceramic Midnight is $399, Silver $349', () => { assert.strictEqual(P.unitPrice('aura-ring-4', 'midnight'), 399); assert.strictEqual(P.unitPrice('aura-ring-4', 'silver'), 349); });

/* deals.json: report which deals the app will show (only those equal to the Worker price) */
const feed = JSON.parse(fs.readFileSync(path.join(ROOT, 'deals.json'), 'utf8'));
for (const d of feed.deals) {
  const p = products.find(x => x.id === d.productId), key = Object.keys(p.variants || {}).find(k => [d.url, d.sourceUrl].some(u => u && u.includes(p.variants[k].asin)));
  const charged = P.unitPrice(d.productId, key || p.colors[0]), expired = d.endsAt && new Date(d.endsAt) <= Date.now();
  console.log(`info ${d.id}: dealPrice ${d.dealPrice}, Worker ${charged} -> ${expired ? 'expired, hidden' : d.dealPrice === charged ? 'shown' : 'hidden (Worker charges a different price)'}`);
}

/* promo: PROMO_EXCLUDED == (live deals.json deals the app applies today, same rules as js/deals.js) U (offline.js listPrice > price) */
const liveDealSet = {}, addEx = (id, c) => { (liveDealSet[id] = liveDealSet[id] || []).includes(c) || liveDealSet[id].push(c); };
for (const d of feed.deals) {
  const p = products.find(x => x.id === d.productId); if (!p || !Number.isFinite(d.dealPrice) || (d.endsAt && new Date(d.endsAt) <= Date.now())) continue;
  const key = Object.keys(p.variants || {}).find(k => [d.url, d.sourceUrl].some(u => u && u.includes(p.variants[k].asin)));
  const charged = P.unitPrice(p.id, key || p.colors[0]); if (charged == null || Math.round(d.dealPrice * 100) !== Math.round(charged * 100)) continue;
  const list = Number.isFinite(d.listPrice) && d.listPrice > 0 ? d.listPrice : ((key ? p.variants[key] : p).listPrice || charged);
  if (Math.round((1 - d.dealPrice / list) * 100) < 1) continue;
  (key ? [key] : p.colors.filter(c => !(p.variants || {})[c])).forEach(c => addEx(p.id, c));
}
for (const p of products) {
  if (p.listPrice > p.price) p.colors.filter(c => !(p.variants || {})[c]).forEach(c => addEx(p.id, c));
  for (const [k, v] of Object.entries(p.variants || {})) if (v.listPrice > v.price) addEx(p.id, k);
}
const sortSet = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, [...o[k]].sort()]));
console.log('info promo deal exclusions today: ' + JSON.stringify(sortSet(liveDealSet)));
check('PROMO_EXCLUDED == deals applied today + offline.js discounted products', () => same(sortSet(P.PROMO_EXCLUDED), sortSet(liveDealSet)));
check('PROMO_CODES: one active code, RAM2016 15%', () => { same(P.PROMO_CODES, { RAM2016: { discountPercent: 15 } }); assert.strictEqual(P.validatePromo(' ram2016 ').code, 'RAM2016'); assert.strictEqual(P.validatePromo('LUX4829').ok, false); });
check('promo never discounts an excluded (deal) item; eligible items get exactly base - round(base*15/100)', () => {
  for (const id of Object.keys(P.PRICE_CATALOG)) for (const c of P.COLORS[id]) {
    const u = P.promoUnit(id, c, 'RAM2016'), base = P.cents(P.unitPrice(id, c));
    assert.strictEqual(u.unitCents, P.isDealExcluded(id, c) ? base : base - Math.round(base * 15 / 100), `${id}/${c}`);
  }
});

/* Worker files: catalog equality + quote parity through the Worker's own fetch handler (Stripe stubbed) */
const literal = (src, name) => { const m = new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\n\\s*\\}|\\[[^\\]]*\\]);').exec(src); return m && m[1]; };
async function workerChecks(file) {
  const src = fs.readFileSync(file, 'utf8'), label = path.basename(file);
  check(`${label}: PRICE_CATALOG == prices.js`, () => same(vm.runInNewContext('(' + literal(src, 'PRICE_CATALOG') + ')'), P.PRICE_CATALOG));
  check(`${label}: SHIPPING == prices.js`, () => same(vm.runInNewContext('(' + literal(src, 'SHIPPING') + ')'), P.SHIPPING));
  if (literal(src, 'COLORS')) {
    check(`${label}: COLORS == prices.js`, () => same(vm.runInNewContext('(' + literal(src, 'COLORS') + ')'), P.COLORS));
    check(`${label}: SIZES == prices.js`, () => { const ctx = { RING_SIZES: vm.runInNewContext(literal(src, 'RING_SIZES')), ONE_SIZE: vm.runInNewContext(literal(src, 'ONE_SIZE')) }; same(vm.runInNewContext('(' + literal(src, 'SIZES') + ')', ctx), P.SIZES); });
  }
  const hasPromo = !!literal(src, 'PROMO_CODES');
  if (hasPromo) {
    check(`${label}: PROMO_CODES == prices.js`, () => same(vm.runInNewContext('(' + literal(src, 'PROMO_CODES') + ')'), P.PROMO_CODES));
    check(`${label}: PROMO_EXCLUDED == prices.js`, () => same(vm.runInNewContext('(' + literal(src, 'PROMO_EXCLUDED') + ')'), P.PROMO_EXCLUDED));
  } else console.log(`note ${label}: no PROMO_CODES (pre-promo Worker); promo checks skipped for this file`);
  const tmp = path.join(os.tmpdir(), `luxora-worker-${process.pid}-${label}.mjs`); fs.writeFileSync(tmp, src);
  const worker = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
  const realFetch = global.fetch; let sent = null;
  global.fetch = async (url, init) => { if (!String(url).startsWith('https://api.stripe.com/')) throw new Error('unexpected fetch ' + url); sent = new URLSearchParams(String(init.body)); return Response.json({ client_secret: 'pi_test_secret_x' }); };
  let stripeCalls = 0; const post0 = async body => { sent = null; const r = await worker.fetch(new Request('https://example.test/api/create-payment-intent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { STRIPE_SECRET_KEY: 'sk_test_stub' }); return { status: r.status, data: await r.json(), amount: sent && Number(sent.get('amount')), promo: sent && sent.get('metadata[promo_code]') }; };
  const post = async body => { const r = await post0(body); if (r.amount != null) stripeCalls++; return r; };
  try {
    const carts = [];
    for (const id of Object.keys(P.PRICE_CATALOG)) for (const color of P.COLORS[id]) for (const qty of [1, 2, 9]) carts.push([{ id, color, size: P.SIZES[id][0], qty }]);
    carts.push([{ id: 'calm-over-ear', color: 'black', size: 'One size', qty: 1 }, { id: 'drift-buds', color: 'black', size: 'One size', qty: 1 }]);   // 189.98: free standard shipping
    carts.push([{ id: 'drift-buds', color: 'black', size: 'One size', qty: 1 }, { id: 'echo-dot-2026', color: 'standard', size: 'One size', qty: 1 }]);   // 199.98
    carts.push([{ id: 'aura-ring-4', color: 'midnight', size: 'Size 7', qty: 1 }, { id: 'aura-ring-4', color: 'silver', size: 'Size 8', qty: 2 }]);
    let n = 0, bad = [];
    for (const items of carts) for (const method of ['standard', 'express']) {
      const q = P.quote(items, method);
      const r = await post({ items: q.lines.map(l => ({ id: l.id, qty: l.qty, color: l.color, size: l.size, unitPriceCents: l.unitCents })), method, currency: 'usd', expectedTotalCents: q.totalCents });
      n++; if (r.status !== 200 || r.amount !== q.totalCents) bad.push(`${JSON.stringify(items)} ${method}: client ${q.totalCents}, Worker ${r.status} ${r.amount}`);
    }
    check(`${label}: client quote == amount sent to Stripe for ${n} carts (incl. Ceramic Midnight)`, () => same(bad, []));
    if (hasPromo) {
      let m = 0; const badP = [];
      for (const items of carts) for (const method of ['standard', 'express']) {
        const q = P.quote(items, method, 'RAM2016');
        const r = await post({ items: q.lines.map(l => ({ id: l.id, qty: l.qty, color: l.color, size: l.size, unitPriceCents: l.unitCents })), method, currency: 'usd', expectedTotalCents: q.totalCents, promoCode: q.promoCode });
        m++; if (r.status !== 200 || r.amount !== q.totalCents || r.promo !== 'RAM2016') badP.push(`${JSON.stringify(items)} ${method}: client ${q.totalCents}, Worker ${r.status} ${r.amount}`);
      }
      check(`${label}: client quote with RAM2016 == amount sent to Stripe for ${m} carts (deal items not discounted)`, () => same(badP, []));
      const before = stripeCalls, r = await post({ items: [{ id: 'ipad-mini-a20', color: 'standard', size: 'One size', qty: 1, unitPriceCents: 59415 }], method: 'standard', currency: 'usd', expectedTotalCents: 59415, promoCode: 'LUX4829' });
      check(`${label}: invalid promo code -> 400 invalid_promo, Stripe not called`, () => { assert.strictEqual(r.status, 400); assert.strictEqual(r.data.code, 'invalid_promo'); assert.strictEqual(stripeCalls, before); });
    }
  } finally { global.fetch = realFetch; }
}
(async () => {
  for (const f of process.argv.slice(2)) await workerChecks(path.resolve(f));
  if (!process.argv[2]) console.log('note: no Worker file given; pass a saved copy of the Worker source to compare against it');
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})();
