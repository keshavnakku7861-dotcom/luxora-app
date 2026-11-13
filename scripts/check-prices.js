#!/usr/bin/env node
/* Pricing integrity check: the client price source (js/prices.js) must equal the product data (js/offline.js) and the
   official Cloudflare Worker's PRICE_CATALOG + shipping, and the client quote must equal the amount the Worker sends to
   Stripe for every product / colour / size / quantity.
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
  const tmp = path.join(os.tmpdir(), `luxora-worker-${process.pid}-${label}.mjs`); fs.writeFileSync(tmp, src);
  const worker = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
  const realFetch = global.fetch; let sent = null;
  global.fetch = async (url, init) => { if (!String(url).startsWith('https://api.stripe.com/')) throw new Error('unexpected fetch ' + url); sent = new URLSearchParams(String(init.body)); return Response.json({ client_secret: 'pi_test_secret_x' }); };
  const post = async body => { sent = null; const r = await worker.fetch(new Request('https://example.test/api/create-payment-intent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { STRIPE_SECRET_KEY: 'sk_test_stub' }); return { status: r.status, data: await r.json(), amount: sent && Number(sent.get('amount')) }; };
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
  } finally { global.fetch = realFetch; }
}
(async () => {
  for (const f of process.argv.slice(2)) await workerChecks(path.resolve(f));
  if (!process.argv[2]) console.log('note: no Worker file given; pass a saved copy of the Worker source to compare against it');
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})();
