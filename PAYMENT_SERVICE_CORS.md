# Fix Luxora Stripe test checkout when the payment Worker is unreachable

Luxora's static storefront calls:
`https://luxora-api.keshavnakku7861.workers.dev/api/create-payment-intent`

A Stripe Link login or six-digit code only authenticates Link. It **does not**
make the Cloudflare Worker reachable. An error at **Review → Finish payment**
may mean the browser blocked the Worker API request with CORS, or that the
Worker itself is unavailable.

## Check without submitting a payment

1. Open Luxora in your browser and press F12 → **Network**.
2. Select **Preserve log**, filter for `create-payment-intent`, and inspect
   the `OPTIONS` preflight and/or `POST` after pressing Finish payment
   **once** (do not repeatedly retry payments).
3. If the preflight is blocked, check whether the Worker response includes
   `Access-Control-Allow-Origin` matching the checkout's **exact origin**,
   `Access-Control-Allow-Methods: POST, OPTIONS`, and
   `Access-Control-Allow-Headers: content-type`.
4. If an HTTP response is returned, inspect its **status** and the Worker's
   Cloudflare logs rather than changing the browser payment credentials.
5. If Stripe confirmation started, check the payment status in your **Stripe
   test Dashboard** before retrying.

## Apply CORS to the *existing* Cloudflare Worker

The Worker source is **not** in this GitHub repository. This is an
integration pattern, not a full replacement for the deployed Worker.

```js
// Example helper near the top of the existing Worker code.
function paymentCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = new Set([
    "https://keshavnakku7861-dotcom.github.io",
    // Prefer a dedicated preview hostname that you control.
  ]);
  // raw.githack.com is a shared-origin preview service. Only consider
  // temporarily allowing it for a test-only endpoint, never production.
  if (env?.PAYMENT_MODE === "test") {
    allowed.add("https://raw.githack.com");
  }
  const h = new Headers({ "Vary": "Origin" });
  if (allowed.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "content-type");
    h.set("Access-Control-Max-Age", "600");
  }
  return h;
}

// In the existing Worker's fetch(request, env) handler, BEFORE routing:
// const url = new URL(request.url);
// if (url.pathname === "/api/create-payment-intent" &&
//     request.method === "OPTIONS") {
//   const headers = paymentCorsHeaders(request, env);
//   return new Response(null, {
//     status: headers.has("Access-Control-Allow-Origin") ? 204 : 403,
//     headers
//   });
// }

// ALSO add the matching headers to EVERY payment route POST response,
// including validation errors and server failures:
// const headers = paymentCorsHeaders(request, env);
// const updated = new Headers(existingResponse.headers);
// for (const [key, value] of headers) updated.set(key, value);
// return new Response(existingResponse.body, {
//   status: existingResponse.status,
//   headers: updated
// });
```

Never put Stripe secret keys or Worker environment secrets in browser JavaScript
or GitHub. Do **not** use `fetch(..., { mode: "no-cors" })`: the browser
could not read the `clientSecret` required for confirmation. Do not use
`Access-Control-Allow-Origin: *` as a general payment API workaround.

CORS is not authentication. The Worker must continue to validate items, prices,
quantities, discount codes, totals, allowed methods, and Stripe test mode
server-side. Production payments also need idempotency and server-side order
verification.

Cloudflare CORS reference:
https://developers.cloudflare.com/workers/examples/cors-header-proxy/
