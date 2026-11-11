# Luxora (static build)

AI shopping assistant prototype. Products, brands and prices are real and were checked from retailer pages on Nov 3–4, 2026; prices can change, so each listing shows its checked date. Product pictures are illustrative images, not official photos.

Luxora now includes a Stripe Payment Element integration in **test mode only**. Test payments do not charge real money, create a real retail order or trigger shipment. The browser app uses a Cloudflare Worker for chat and Stripe PaymentIntent creation; the bundled `js/offline.js` responder is used as a fallback when chat is unavailable.

Before any live launch, Luxora still needs server-verified payment completion, persistent order records, inventory/fulfillment rules, taxes/shipping rules and live-mode legal/privacy review.
