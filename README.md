# Luxora (static build)

AI shopping assistant prototype. Products, brands and prices are real and were checked from retailer pages on Nov 3–4, 2026; prices can change, so each listing shows its checked date. Product pictures are illustrative images, not official photos.

Luxora now includes a Stripe Payment Element integration in **test mode only**. Test payments do not charge real money, create a real retail order or trigger shipment. The browser app uses a Cloudflare Worker for chat and Stripe PaymentIntent creation; the bundled `js/offline.js` responder is used as a fallback when chat is unavailable.

Before any live launch, Luxora still needs server-verified payment completion, persistent order records, inventory/fulfillment rules, taxes/shipping rules and live-mode legal/privacy review.

## Prices (must match the Worker)

`js/prices.js` is the single client price source. It mirrors the official Worker's `PRICE_CATALOG`, allowed colors/sizes and shipping exactly; the cart, checkout, shop, assistant panel and saved page all price from it, and cart lines are re-priced on load and before payment. Deals from `deals.json` are only shown when the Worker would charge the deal price. A sizing kit is never sold through Luxora checkout.

- `node scripts/check-prices.js path/to/worker.js` checks `js/prices.js` against `js/offline.js` and a saved copy of the Worker source, and checks that the client total equals the amount the Worker sends to Stripe (Stripe is stubbed).
- `node scripts/test-pricing.js` unit-tests cart re-pricing, the sizing-kit rule and deal guarding.
