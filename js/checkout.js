/* Luxora checkout page (checkout.html). Opened in its OWN browser tab by "Buy now" (one item) or the cart's "Checkout"
   (the whole cart), never inside the app view. Design: PAINTER's 4-step Buy now mockups (buy-now-v2-*, Nov 14, 2026).
   Hand-off: the app writes { mode, items: [{ id, color, size, qty }], returnTo } to localStorage 'luxora.checkout.<id>'
   and opens checkout.html?h=<id>. This page reads it ONCE, deletes it and keeps it in this tab's sessionStorage (so a
   reload still works). Only product id / finish / size / qty are handed over: every price is recomputed here from
   js/prices.js (the Worker's catalog), and the Worker re-prices everything again before Stripe is called.
   checkout.html?src=cart checks out the current cart (read live from localStorage).
   Payment: Stripe Payment Element in deferred-intent mode (test key). The PaymentIntent is only created when the shopper
   presses "Finish payment", through the same Worker contract as before: POST /api/create-payment-intent with
   { items, method, currency, expectedTotalCents, promoCode? }; 400 invalid_promo and 409 price_changed never charge. */
(() => {
  const $ = s => document.querySelector(s);
  const S = window.LuxoraStore, Pr = window.LuxoraPrices, Art = window.LuxoraArt, esc = S.esc;
  const products = window.LuxoraOffline.products, byId = Object.fromEntries(products.map(p => [p.id, p]));
  const STRIPE_PUBLISHABLE_KEY = 'pk_test_51UYDQKJCa6aigpcZW3Z08Ky9Wnr78e77EtmPGxjbWMEuA7xZEi6toF01gfyHmuPvGP3WqyVgwNE2vhN3hs03VWGH003aNFeHf5';
  const STRIPE_PAYMENT_URL = 'https://luxora-api.keshavnakku7861.workers.dev/api/create-payment-intent';
  /* Card + Link (secure Link-saved methods) are eligible in the current Worker
     automatic_payment_methods configuration. Luxora does NOT store cards or
     have a server-backed Stripe Customer/CustomerSession for Luxora-saved cards.
     Express uses the same existing server-verified test PaymentIntent endpoint
     and only offers wallet buttons supported in the shopper's browser. */
  const ENABLED_METHODS = ['card', 'link'];
  const EXCLUDED_METHODS = ['us_bank_account', 'klarna', 'affirm', 'cashapp', 'amazon_pay'];
  const HANDOFF = 'luxora.checkout.', TAB = 'luxora.checkout.tab', MAX_AGE = 30 * 60 * 1000;
  const usd = c => '$' + (c / 100).toFixed(2);   // checkout is always in USD cents (what Stripe charges)
  const logo = Art.logo();
  document.querySelectorAll('[data-logo]').forEach(e => { e.innerHTML = logo; });
  const say = t => { const l = $('#coLive'); l.textContent = ''; setTimeout(() => { l.textContent = t; }, 30); };

  /* ---------- hand-off ---------- */
  const qs = new URLSearchParams(location.search);
  const cleanItems = list => (Array.isArray(list) ? list : []).slice(0, Pr.MAX_LINES).map(i => i && ({ id: String(i.id || ''), color: String(i.color || ''), size: String(i.size || ''), qty: Number(i.qty) })).filter(Boolean);
  const safeReturn = h => (typeof h === 'string' && /^#\/[\w\-/?=&.]{0,120}$/.test(h)) ? h : '';
  function loadSession() {
    const h = qs.get('h'), src = qs.get('src');
    let tab = null; try { tab = JSON.parse(sessionStorage.getItem(TAB)); } catch {}
    if (h && /^[A-Za-z0-9_-]{16,64}$/.test(h)) {
      if (tab && tab.h === h) return tab;                       // reload of this tab
      let raw = null; try { raw = JSON.parse(localStorage.getItem(HANDOFF + h)); localStorage.removeItem(HANDOFF + h); } catch {}
      if (raw && raw.mode === 'buy' && Date.now() - Number(raw.at || 0) < MAX_AGE) {
        const s = { h, mode: 'buy', items: cleanItems(raw.items).slice(0, 1), returnTo: safeReturn(raw.returnTo), method: 'standard' };
        try { sessionStorage.setItem(TAB, JSON.stringify(s)); } catch {}
        return s;
      }
      return null;
    }
    if (src === 'cart') return { h: '', mode: 'cart', items: null, returnTo: '#/market/cart', method: (tab && tab.mode === 'cart' && tab.method) || 'standard' };
    return null;
  }
  /* purge stale hand-offs (a tab that never opened, e.g. popup blocked and abandoned) */
  try { Object.keys(localStorage).filter(k => k.startsWith(HANDOFF) && k !== TAB).forEach(k => { try { const v = JSON.parse(localStorage.getItem(k)); if (!v || Date.now() - Number(v.at || 0) > MAX_AGE) localStorage.removeItem(k); } catch { localStorage.removeItem(k); } }); } catch {}

  const ses = loadSession();
  const st = { step: 1, method: ses ? ses.method || 'standard' : 'standard', addr: null, notes: [], payType: 'card', paymentView: 'card', paying: false, done: null, peReady: false, peComplete: false, expressAvailable: false };
  const saveTab = () => { if (ses && ses.mode === 'buy') try { sessionStorage.setItem(TAB, JSON.stringify({ ...ses, method: st.method })); } catch {} };
  /* the lines being bought: the handed-over item (buy now) or the live cart */
  const items = () => st.doneItems ? st.doneItems : ses.mode === 'cart' ? S.cart().map(i => ({ id: i.id, color: i.color, size: i.size, qty: i.qty })) : ses.items;
  const quote = () => Pr.quote(items(), st.method, st.doneItems ? st.donePromo : S.promo());
  const nameOf = (id, color) => { const p = byId[id], v = p && p.variants && p.variants[color]; return (v && v.name) || (p && p.name) || 'Product'; };
  const optsOf = i => { const p = byId[i.id]; const bits = []; if (p && p.colors && p.colors[0] !== 'standard') bits.push(S.colorName(p, i.color)); if (i.size && i.size !== 'One size') bits.push(i.size); return bits.join(' · '); };
  const imgOf = i => { const p = byId[i.id], v = p && p.variants && p.variants[i.color]; return Art.product({ id: i.id, imageId: (v && v.imageId) || (p && p.imageId) || i.id, name: nameOf(i.id, i.color) }, 0); };
  const checkedOf = i => { const p = byId[i.id], v = p && p.variants && p.variants[i.color]; return S.checked(v && v.checkedAt ? v : p); };
  const backHref = () => {
    if (ses && ses.returnTo) return 'app.html' + ses.returnTo;
    if (ses && ses.mode === 'cart') return 'app.html#/market/cart';
    const i = ses && ses.items && ses.items[0];
    return i ? `app.html#/market/p/${encodeURIComponent(i.id)}${byId[i.id] && byId[i.id].variants && byId[i.id].variants[i.color] ? '?c=' + encodeURIComponent(i.color) : ''}` : 'app.html#/market';
  };

  /* ---------- nothing to check out ---------- */
  function emptyPage(title, text) {
    $('#coSteps').innerHTML = ''; $('#coStage').outerHTML = `<div class="empty"><h1>${esc(title)}</h1><p>${esc(text)}</p><a class="btn" href="app.html#/market">Back to the Luxora shop</a></div>`;
    $('#coBack').href = 'app.html#/market'; $('#coBack').innerHTML = '&larr; Back to Luxora'; document.title = 'Checkout - Luxora';
  }
  if (!ses) { emptyPage('This checkout link has expired', 'Checkout links only work once, in the tab Luxora opened. Go back to the product and press Buy now again.'); return; }
  /* drop lines Luxora checkout cannot sell (same rules as the Worker) */
  if (ses.mode === 'buy') {
    const bad = ses.items.filter(i => Pr.lineProblem(i));
    if (bad.length || !ses.items.length) { emptyPage('This item can\'t be checked out', 'Luxora checkout can\'t sell that option (for example a missing ring size). Go back to the product, choose your options and press Buy now again.'); return; }
  } else {
    const n = S.reprice(); st.notes = n.map(x => x.message); S.takeNotices();
    if (!S.cart().length) { emptyPage('Your cart is empty', 'Add something you like from the Luxora shop, then check out again.'); return; }
  }
  $('#coBack').href = backHref();
  $('#coBack').innerHTML = ses.mode === 'cart' ? '&larr; Back to cart' : '&larr; Back to product';

  /* ---------- profile prefill: the signed-in Luxora profile (the same luxora.profile record LuxoraAuth.profile() returns):
     name, email, phone, street, apt, city, region, ZIP, country. 'Use a different address' ships elsewhere without editing it. ---------- */
  const profile = (() => { try { const v = JSON.parse(localStorage.getItem('luxora.profile')); return v && typeof v.name === 'string' && typeof v.email === 'string' ? v : null; } catch { return null; } })();
  const COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IN', 'India'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['AU', 'Australia']];
  const cName = c => (COUNTRIES.find(x => x[0] === c) || [c, c])[1];
  const fromProfile = () => profile ? { name: profile.name || '', email: profile.email || '', phone: profile.phone || '', country: COUNTRIES.some(c => c[0] === profile.country) ? profile.country : 'US', address1: profile.street || '', address2: profile.apt || '', city: profile.city || '', state: profile.region || profile.state || '', zip: profile.postal || profile.zip || '' } : null;
  st.addrSrc = profile ? 'profile' : 'other';
  st.addr = fromProfile() || { name: '', email: '', phone: '', country: 'US', address1: '', address2: '', city: '', state: '', zip: '' };

  /* ---------- header steps ---------- */
  const STEPS = ['Address', 'Payment', 'Review', 'Confirmed'];
  function renderSteps() {
    $('#coSteps').innerHTML = STEPS.map((t, i) => {
      const n = i + 1, cls = n < st.step || (st.step === 4 && n === 4) ? 'is-done' : n === st.step ? 'is-active' : '';
      return `${i ? `<span class="rail ${n <= st.step ? 'is-done' : ''}" aria-hidden="true"></span>` : ''}<span class="step ${cls}"${n === st.step ? ' aria-current="step"' : ''}><span class="n">${n}</span> ${t}</span>`;
    }).join('');
  }

  /* ---------- order summary panel ---------- */
  function lineTag(l, q) {
    if (!q.promoCode) return '';
    if (l.promoApplied) return `<span class="ptag">${esc(q.promoCode)} &minus;${q.discountPercent}%</span>`;
    if (l.dealExcluded) return '<span class="ptag ptag--off">On deal &middot; code not applied</span>';
    return '';
  }
  function renderPanel() {
    const q = quote(), lines = q.lines, single = lines.length === 1, l0 = lines[0] || items()[0];
    const canQty = ses.mode === 'buy' && st.step < 4 && !st.paying;
    const promoHtml = st.step < 4 ? (q.promoCode
      ? `<p class="promomsg"><b>${esc(q.promoCode)}</b> applied &middot; ${q.discountPercent}% off full-price items (excludes existing deals). <button type="button" class="linkbtn" id="promoRemove">Remove</button></p>`
      : `<form class="promoform" id="promoForm" novalidate><label class="sr-only" for="promoIn">Promo code</label><input id="promoIn" placeholder="Promo code" autocomplete="off" maxlength="24"><button type="submit">Apply</button></form>`) + `<p class="promomsg${st.promoErr ? ' is-err' : ''}" id="promoMsg" role="status"${st.promoMsg ? '' : ' hidden'}>${esc(st.promoMsg || '')}</p>` : '';
    const finish = st.step === 3 ? `<div class="finish-wrap"><button type="button" class="btn finish finish--desk" data-finish ${st.paying ? 'disabled' : ''}>${st.paying ? 'Processing&hellip;' : `Finish payment &mdash; ${usd(q.totalCents)}`}</button>
      <p class="secure-line finish--desk-note"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="11" width="12" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg> Encrypted by Stripe. Your card number never touches Luxora. Stripe test mode: no real charge.</p></div>` : '';
    $('#coPanel').className = 'panel' + (single ? '' : ' panel--multi');
    $('#coPanel').innerHTML = `<h2 id="sumTitle">Order summary</h2>
      <div class="hero">${imgOf(l0)}<span class="illus">Illustrative image</span></div>
      ${single ? `<div class="pinfo">
        <div><div class="store">${esc((byId[l0.id] || {}).store || '')}</div><div class="pname">${esc(byId[l0.id] ? byId[l0.id].name : 'Product')}</div>
          <div class="pvar">${esc(optsOf(l0))}${optsOf(l0) ? '' : 'One size'}</div><div class="pdate">${esc(checkedOf(l0))}</div></div>
        <div><div class="pprice" id="coLinePrice">${usd(l0.unitCents * l0.qty)}${l0.promoApplied ? `<s>${usd(l0.baseUnitCents * l0.qty)}</s>` : ''}</div>
          ${canQty ? `<div class="qty" role="group" aria-label="Quantity"><button type="button" id="qMinus" aria-label="Decrease quantity" ${l0.qty <= 1 ? 'disabled' : ''}>&minus;</button><span id="qVal" aria-live="polite">${l0.qty}</span><button type="button" id="qPlus" aria-label="Increase quantity" ${l0.qty >= Pr.MAX_QTY ? 'disabled' : ''}>+</button></div>` : `<div class="qty" aria-label="Quantity ${l0.qty}"><span style="border:0;padding:0 10px">Qty ${l0.qty}</span></div>`}
          ${st.step === 4 ? '<div class="paid">Test paid</div>' : ''}<div>${lineTag(l0, q)}</div></div>
      </div>` : `<div class="lines">${lines.map(l => `<div class="li"><div class="thumb">${imgOf(l)}</div><div><div class="li__name">${l.qty} &times; ${esc(nameOf(l.id, l.color))}</div><div class="li__meta">${esc(optsOf(l) || 'One size')}</div>${lineTag(l, q)}</div><div class="li__price">${usd(l.unitCents * l.qty)}${l.promoApplied ? `<s>${usd(l.baseUnitCents * l.qty)}</s>` : ''}</div></div>`).join('')}</div>
        ${ses.mode === 'cart' && st.step < 3 ? '<a class="edit-cart" href="app.html#/market/cart" target="_blank" rel="noopener">Edit cart in Luxora</a>' : ''}${st.step === 4 ? '<div class="paid">Test paid</div>' : ''}`}
      ${promoHtml}
      <div class="break" id="coBreak">
        ${q.promoCode ? (q.discountCents > 0 ? `<div class="promo"><span>Promo ${esc(q.promoCode)}</span><span>&minus;${usd(q.discountCents)}</span></div>` : `<div class="promo promo--none"><span class="muted">Promo ${esc(q.promoCode)}: items on deal are excluded</span><span>${usd(0)}</span></div>`) : ''}
        <div><span class="muted">Subtotal</span><span id="coSub">${usd(q.subtotalCents)}</span></div>
        <div><span class="muted">Shipping (${st.method === 'express' ? 'express' : 'standard'})</span><span id="coShip">${q.shippingCents ? usd(q.shippingCents) : 'Free'}</span></div>
        <div class="total"><span>Total (USD)</span><span id="coTotal">${usd(q.totalCents)}</span></div>
      </div>
      ${finish}
      <a class="ask" href="app.html#/assistant" target="_blank" rel="noopener">${logo} Need help? <span>Ask Luxora</span><b>Open chat</b></a>`;
    if (canQty) {
      $('#qMinus').onclick = () => setQty(-1); $('#qPlus').onclick = () => setQty(1);
    }
    const pf = $('#promoForm'); if (pf) pf.onsubmit = e => { e.preventDefault(); const r = S.setPromo($('#promoIn').value); if (r.ok) { st.promoMsg = `${r.code} applied.`; st.promoErr = false; } else { st.promoMsg = r.reason === 'empty' ? 'Enter a promo code first.' : `"${String(r.code).slice(0, 24)}" isn't a valid promo code.`; st.promoErr = true; } priceChanged(); if (!r.ok) { const i = $('#promoIn'); if (i) i.focus(); } };
    const pr = $('#promoRemove'); if (pr) pr.onclick = () => { const c = S.promo(); S.clearPromo(); st.promoMsg = `${c} removed. Prices are back to normal.`; st.promoErr = false; priceChanged(); };
    document.querySelectorAll('[data-finish]').forEach(b => { b.onclick = finishPayment; });
  }
  function setQty(d) {
    const i = ses.items[0]; const n = Math.max(1, Math.min(Pr.MAX_QTY, i.qty + d)); if (n === i.qty) return;
    i.qty = n; saveTab(); priceChanged(); say(`Quantity ${n}. Total ${usd(quote().totalCents)}.`);
  }
  /* anything that changes the amount: redraw, and keep the Stripe Payment Element's amount in step */
  function priceChanged() {
    renderPanel();
    if (st.step === 3) renderMain();
    if (elements) { try { elements.update({ amount: quote().totalCents }); } catch {} }
  }

  /* ---------- steps ---------- */
  const notesHtml = () => `<div class="notes" role="status">${st.notes.map(m => `<span>${esc(m)}</span>`).join('')}</div>`;
  const addrLine = a => [a.address1, a.address2].filter(Boolean).join(', ') + (a.address1 ? ', ' : '') + [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const fld = (name, label, opts = {}) => `<label class="fl"><input name="${name}" type="${opts.type || 'text'}" value="${esc(st.addr[name] || '')}" ${opts.req === false ? '' : 'required'} autocomplete="${opts.ac}" ${opts.mode ? `inputmode="${opts.mode}"` : ''} maxlength="${opts.max || 80}" placeholder=" "><span>${label}${opts.req === false ? ' <span class="opt">(optional)</span>' : ''}</span></label>`;
  function stepAddress() {
    const p = fromProfile(), shipStd = (() => { const q = Pr.quote(items(), 'standard', S.promo()); return q.shippingCents ? usd(q.shippingCents) : 'Free'; })();
    setMain(`<p class="kicker">Step 1 of 4</p><h1>Where should we send it?</h1>
      <p class="lead">${p ? 'Use your saved Luxora profile, or edit any of the details below.' : 'Enter your contact and delivery details.'}</p>
      <div class="stack">${notesHtml()}
        ${p ? `<div class="addrsrc" role="radiogroup" aria-label="Delivery address">
          <div class="saved" role="radio" aria-checked="${st.addrSrc === 'profile'}" tabindex="${st.addrSrc === 'profile' ? 0 : -1}" id="useProfile" data-src="profile"><span class="radio" aria-hidden="true"></span><div>
          <b>${esc(p.name)} <span class="tag">Saved Luxora profile</span></b><p>${esc([p.email, p.phone].filter(Boolean).join(' · '))}</p>
          <p>${esc([[p.address1, p.address2].filter(Boolean).join(', '), p.city, [p.state, p.zip].filter(Boolean).join(' '), cName(p.country)].filter(Boolean).join(', '))}</p></div></div>
          <div class="saved saved--other" role="radio" aria-checked="${st.addrSrc === 'other'}" tabindex="${st.addrSrc === 'other' ? 0 : -1}" id="useOther" data-src="other"><span class="radio" aria-hidden="true"></span><div>
          <b>Use a different address</b><p>Ship this order somewhere else. Your saved profile is not changed.</p></div></div>
        </div>` : ''}
        <form class="fields" id="addrForm" novalidate autocomplete="on">
          <div class="pair">${fld('name', 'Full name', { ac: 'name' })}${fld('email', 'Email', { type: 'email', ac: 'email', mode: 'email' })}</div>
          <div class="pair">${fld('phone', 'Mobile phone', { type: 'tel', ac: 'tel', mode: 'tel', max: 24 })}
            <label class="fl"><select name="country" autocomplete="country">${COUNTRIES.map(([c, n]) => `<option value="${c}" ${st.addr.country === c ? 'selected' : ''}>${n}</option>`).join('')}</select><span>Country / region</span></label></div>
          ${fld('address1', 'Street address', { ac: 'address-line1' })}
          ${fld('address2', 'Apt or suite', { ac: 'address-line2', req: false })}
          <div class="triple">${fld('city', 'City', { ac: 'address-level2' })}${fld('state', 'State / region', { ac: 'address-level1', max: 40 })}${fld('zip', 'ZIP / postal code', { ac: 'postal-code', max: 12 })}</div>
          <fieldset class="ship"><legend>Delivery (test values, nothing ships)</legend>
            <label><input type="radio" name="m" value="standard" ${st.method === 'standard' ? 'checked' : ''}> Standard <b>${shipStd}</b><small>3–5 day estimate &middot; free over ${usd(Pr.cents(Pr.SHIPPING.freeOver))}</small></label>
            <label><input type="radio" name="m" value="express" ${st.method === 'express' ? 'checked' : ''}> Express <b>${usd(Pr.cents(Pr.SHIPPING.express))}</b><small>1–2 day estimate</small></label>
          </fieldset>
          <p class="err" id="addrErr" role="alert"></p>
          <button type="submit" class="btn">Continue to payment &rarr;</button>
        </form>
      </div>`);
    const f = $('#addrForm');
    if ($('#useProfile')) {
      const ADDR = ['address1', 'address2', 'city', 'state', 'zip'], opts = [$('#useProfile'), $('#useOther')];
      const pick = (src, focus) => {
        st.addrSrc = src;
        opts.forEach(o => { const on = o.dataset.src === src; o.setAttribute('aria-checked', String(on)); o.tabIndex = on ? 0 : -1; });
        if (src === 'profile') { st.addr = { ...st.addr, ...p }; ['name', 'email', 'phone', ...ADDR].forEach(k => { f.elements[k].value = st.addr[k] || ''; }); f.elements.country.value = st.addr.country; }
        else { ADDR.forEach(k => { st.addr[k] = ''; f.elements[k].value = ''; f.elements[k].removeAttribute('aria-invalid'); }); }
        if (focus) (src === 'other' || !f.elements.address1.value ? f.elements.address1 : opts[0]).focus();
      };
      opts.forEach((o, n) => {
        o.onclick = () => pick(o.dataset.src, true);
        o.onkeydown = e => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(o.dataset.src, true); }
          if (/^Arrow(Up|Down|Left|Right)$/.test(e.key)) { e.preventDefault(); const t = opts[1 - n]; pick(t.dataset.src, false); t.focus(); }
        };
      });
    }
    f.oninput = e => { if (e.target.getAttribute('aria-invalid') && e.target.value.trim()) { e.target.removeAttribute('aria-invalid'); if (!f.querySelector('[aria-invalid]')) $('#addrErr').textContent = ''; } };
    f.onchange = e => { if (e.target.name === 'm') { st.method = e.target.value; saveTab(); priceChanged(); } };
    f.onsubmit = e => {
      e.preventDefault();
      const v = Object.fromEntries([...new FormData(f).entries()].map(([k, x]) => [k, String(x).trim()]));
      let bad = null;
      f.querySelectorAll('input[required]').forEach(i => { const ok = i.value.trim() && (i.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim())); i.toggleAttribute('aria-invalid', !ok); if (!ok) i.setAttribute('aria-invalid', 'true'); if (!ok && !bad) bad = i; });
      if (bad) { $('#addrErr').textContent = 'Please fill in the highlighted fields' + (bad.type === 'email' && bad.value ? ' (check the email address).' : '.'); bad.focus(); return; }
      delete v.m; st.addr = v; go(2);
    };
  }

  /* ---------- Stripe ---------- */
  let stripe = null, elements = null, payEl = null, expressEl = null;
  function ensureStripe() {
    if (stripe) return true;
    if (typeof window.Stripe !== 'function') return false;
    stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY); return true;
  }
  function mountPayment() {
    const box = $('#pe');
    if (!ensureStripe()) { box.innerHTML = '<p class="err">Stripe could not be loaded. Check your connection, then reload this page.</p>'; return; }
    if (!elements) {
      elements = stripe.elements({ mode: 'payment', amount: quote().totalCents, currency: 'usd', excludedPaymentMethodTypes: EXCLUDED_METHODS,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#006746', colorText: '#15392b', borderRadius: '12px', fontFamily: 'Outfit, system-ui, sans-serif' } } });
      /* Link is Stripe's secure saved-wallet experience. Google/Apple Pay use
         the separate Express Checkout Element so the options don't overlap. */
      payEl = elements.create('payment', { layout: 'tabs', wallets: { link: 'auto', applePay: 'never', googlePay: 'never' }, defaultValues: { billingDetails: { name: st.addr.name, email: st.addr.email } } });
      payEl.on('ready', () => { st.peReady = true; const w = $('#peWait'); if (w) w.hidden = true; });
      payEl.on('change', e => { st.peComplete = !!e.complete; if (e.value && e.value.type) st.payType = e.value.type; });
    }
    if (!st.peMounted) { const node = document.createElement('div'); node.id = 'peNode'; box.append(node); payEl.mount(node); st.peMounted = true; }
    if (st.peReady) { const w = $('#peWait'); if (w) w.hidden = true; }
  }
  /* The second mode uses Link's existing saved wallet, NOT browser-saved cards.
     Express wallet buttons are rendered by Stripe only when supported by the
     device, Stripe test account, registered domain and payment method settings. */
  function paymentView(view) {
    if (!['card', 'saved', 'express'].includes(view)) return;
    st.paymentView = view;
    ['card', 'saved', 'express'].forEach(name => {
      const btn = $('#method' + name[0].toUpperCase() + name.slice(1));
      if (!btn) return;
      const on = name === view;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    const info = $('#payModeNote');
    if (info) {
      info.textContent = view === 'card'
        ? 'Enter a card securely with Stripe. You can also use Link if Stripe offers it in the form.'
        : view === 'saved'
          ? 'If Stripe Link is offered in the secure form, sign in to reuse payment details saved with Link. If it is not offered, select Card. Luxora never stores card numbers.'
          : 'Use the secure payment buttons provided by Stripe below. Wallets without a payment button cannot be selected on this device.';
    }
    const card = $('#coCardViz'), foot = $('#coFoot'), regular = $('#peHost'), express = $('#expressHost');
    if (card) card.hidden = view !== 'card';
    if (regular) regular.hidden = view === 'express';
    if (express) express.hidden = view !== 'express';
    if (foot) foot.hidden = view === 'express';
    if (view === 'express') mountExpress();
    else mountPayment();
  }
  function expressError(message, event) {
    const messageText = message || 'This wallet payment could not be completed. Try again or use Card.';
    const el = $('#expressErr'); if (el) el.textContent = messageText;
    if (event && typeof event.paymentFailed === 'function') {
      try { event.paymentFailed({ reason: 'fail', message: messageText }); } catch {}
    }
  }
  function mountExpress() {
    if (!ensureStripe()) { expressError('Stripe could not be loaded. Check your connection and reload checkout.'); return; }
    if (!elements) mountPayment();
    if (!elements) { expressError('Stripe is not available. Try Card instead.'); return; }
    if (!expressEl) {
      try {
        expressEl = elements.create('expressCheckout', {
          emailRequired: true,
          billingAddressRequired: true,
          buttonHeight: 48,
          // Only show genuine, eligible Stripe wallet buttons.
          // 'auto' respects device, wallet and registered-domain requirements.
          paymentMethods: {
            applePay: 'auto',
            googlePay: 'auto',
            link: 'auto',
            paypal: 'never',
            amazonPay: 'never',
            klarna: 'never'
          },
          paymentMethodOrder: ['applePay', 'googlePay', 'link'],
          layout: { maxColumns: 2, maxRows: 2 }
        });
        // Stripe's event returns objects, e.g. { applePay: { available:false } }.
        // Checking truthiness of the object incorrectly marked false as available.
        expressEl.on('availablepaymentmethodschange', ({ paymentMethods }) => {
          const wallets = paymentMethods || {};
          const available = name => wallets[name] && wallets[name].available === true;
          st.expressAvailable = !!(available('applePay') || available('googlePay') || available('link'));
          const msg = $('#expressStatus');
          if (msg) {
            if (!st.expressAvailable) {
              msg.textContent = 'No supported express wallet is available on this device or checkout domain. Choose Card or Saved method instead.';
            } else {
              msg.textContent = 'Tap a payment button rendered by Stripe above. If Apple Pay or Google Pay does not appear as a button, you cannot use it here. Checkout is in TEST mode.';
            }
          }
        });
        expressEl.on('loaderror', ({ error }) => {
          expressError(error && error.message ? error.message : 'Stripe wallets could not load. Choose Card instead.');
        });
        expressEl.on('confirm', confirmExpress);
      } catch (error) {
        expressError('Express wallets could not start. Use Card or Saved method instead.');
        return;
      }
    }
    if (!st.expressMounted) {
      const node = $('#expressWallet');
      if (!node) return;
      try { expressEl.mount(node); st.expressMounted = true; }
      catch { expressError('Express wallets are not supported here. Use Card instead.'); }
    }
  }
  async function confirmExpress(event) {
    if (st.paying || st.step !== 2 || st.paymentView !== 'express') return;
    const kind = event && event.expressPaymentType;
    if (!['apple_pay', 'google_pay', 'link'].includes(kind)) {
      expressError('This express wallet is not enabled in Luxora checkout. Use Card instead.', event); return;
    }
    if (ses.mode === 'cart' && S.reprice().length) {
      st.notes = S.takeNotices().map(x => x.message);
      priceChanged(); expressError('Your cart changed. Please check the updated total and select the wallet again.', event); return;
    }
    const q = quote();
    if (!q.ok) { expressError('Your order needs an update before payment. Please return to the cart.', event); return; }
    st.paying = true; st.payType = kind;
    const fail = message => { st.paying = false; expressError(message, event); };
    const err = $('#expressErr'); if (err) err.textContent = '';
    try {
      elements.update({ amount: q.totalCents });
      const sub = await elements.submit();
      if (sub && sub.error) return fail(sub.error.message || 'Your wallet details were not accepted.');
      // Same server endpoint and same item/price integrity checks as Card.
      const res = await fetch(STRIPE_PAYMENT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: q.lines.map(i => ({ id: i.id, qty: i.qty, color: i.color, size: i.size, unitPriceCents: i.unitCents })),
          method: st.method, currency: 'usd', expectedTotalCents: q.totalCents, ...(q.promoCode ? { promoCode: q.promoCode } : {}) }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.code === 'invalid_promo') {
        S.clearPromo('That promo code was invalid and has been removed.');
        priceChanged(); return fail('The promo code changed. Check your updated total and try again.');
      }
      if (res.status === 409) {
        if (ses.mode === 'cart') { S.reprice(); S.takeNotices(); }
        priceChanged(); return fail('The price changed. Check your updated total and try again.');
      }
      if (!res.ok || !data.clientSecret) return fail(data.message || 'The test payment service is unavailable. Nothing was charged.');
      if (typeof data.amount === 'number' && data.amount !== q.totalCents)
        return fail('The payment amount did not match the order total. No payment was started.');
      const ret = new URL(location.href);
      ['payment_intent', 'payment_intent_client_secret', 'redirect_status'].forEach(key => ret.searchParams.delete(key));
      const result = await stripe.confirmPayment({ elements, clientSecret: data.clientSecret,
        confirmParams: { return_url: ret.toString() }, redirect: 'if_required' });
      if (result.error) return fail(result.error.message || 'This wallet payment failed.');
      completed(result.paymentIntent, q.totalCents);
    } catch (error) {
      console.warn('Luxora express checkout failed:', error && error.message);
      fail('Unable to process this test wallet payment. Check your connection and try again. If a payment is pending, do not retry until its status is verified.');
    }
  }
  function stepPayment() {
    const a = st.addr;
    $('#coStage').classList.add('stage--pay');
    setMain(`<p class="kicker">Step 2 of 4</p><h1>How would you like to pay?</h1>
      <p class="lead">Enter your payment details. Stripe test mode: use a Stripe test card such as 4242 4242 4242 4242. No real money is charged.</p>
      <div class="stack">${notesHtml()}
        <div class="addrbar"><div><b>${esc(a.name)}</b><p>${esc(addrLine(a))}</p></div><button type="button" class="linkbtn change" id="chgAddr">Change</button></div>
        <div class="methods" role="group" aria-label="Payment method">
          <button type="button" id="methodCard" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg> Card</button>
          <button type="button" id="methodSaved" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V6a5 5 0 0 1 10 0v1"/></svg> Saved method <small class="soon">Link</small></button>
          <button type="button" id="methodExpress" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 5 14h7l-1 7 8-11h-7l1-7Z"/></svg> Express checkout <small class="soon">Wallets</small></button>
        </div>
        <p id="payModeNote" class="pay-mode-note" role="status"></p>
        <div class="card-viz" id="coCardViz" aria-hidden="true"><div class="chip"></div><div class="brand-mini">${logo}Luxora</div><div class="pan">${esc(a.name).slice(0, 26)}</div><div class="nums">STRIPE TEST MODE</div><div class="exp">USD</div></div>
      </div>`, `<div class="stack stack--foot"><p class="err" id="payErr" role="alert"></p><button type="button" class="btn" id="toReview">Continue to review &rarr;</button></div>`);
    $('#chgAddr').onclick = () => go(1);
    $('#methodCard').onclick = () => paymentView('card');
    $('#methodSaved').onclick = () => paymentView('saved');
    $('#methodExpress').onclick = () => paymentView('express');
    const useCardInstead = $('#expressUseCard');
    if (useCardInstead) useCardInstead.onclick = () => paymentView('card');
    paymentView(st.paymentView);
    $('#toReview').onclick = async () => {
      if (!elements) return;
      const b = $('#toReview'); b.disabled = true; $('#payErr').textContent = '';
      try {
        if (!ENABLED_METHODS.includes(st.payType)) { $('#payErr').textContent = 'Choose Card or a supported Stripe Link saved method.'; b.disabled = false; return; }
        const r = await elements.submit();      // validates the details in Stripe's form; nothing is charged
        if (r && r.error) { $('#payErr').textContent = r.error.message || 'Please check your payment details.'; b.disabled = false; return; }
      } catch (e) { $('#payErr').textContent = 'Please check your payment details.'; b.disabled = false; return; }
      go(3);
    };
  }
  const payLabel = () => ({ card: 'Card', link: 'Stripe Link', cashapp: 'Cash App Pay', us_bank_account: 'US bank account', apple_pay: 'Apple Pay', google_pay: 'Google Pay' }[st.payType] || 'Stripe payment');
  function stepReview() {
    const a = st.addr, q = quote();
    $('#coStage').classList.remove('stage--pay');
    setMain(`<p class="kicker">Step 3 of 4</p><h1>Review your order</h1>
      <p class="lead">Confirm these details before you finish payment.</p>
      <div class="stack review">${notesHtml()}
        <section class="block"><div class="block__head"><h2>Contact &amp; delivery address</h2><button type="button" class="linkbtn" data-edit="1">Edit</button></div>
          <b>${esc(a.name)}</b><p>${esc([a.email, a.phone].filter(Boolean).join(' · '))}</p><p>${esc([a.address1, a.address2].filter(Boolean).join(', '))}</p><p>${esc([a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '))}, ${esc(cName(a.country))}</p>
          <p class="ship-m">${st.method === 'express' ? 'Express test shipping (1–2 day estimate)' : 'Standard test shipping (3–5 day estimate)'} &middot; ${q.shippingCents ? usd(q.shippingCents) : 'Free'}</p></section>
        <section class="block"><div class="block__head"><h2>Payment method</h2><button type="button" class="linkbtn" data-edit="2">Edit</button></div>
          <div class="payline"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg><span><b>${payLabel()}</b> &middot; entered securely with Stripe (test mode)</span></div></section>
        <section class="block"><div class="block__head"><h2>${q.lines.length > 1 ? 'Items' : 'Item'}</h2></div>
          <div class="review">${q.lines.map(l => `<div class="line-item"><div class="thumb">${imgOf(l)}</div><div><div class="name">${esc(nameOf(l.id, l.color))}</div><div class="meta">${esc([optsOf(l), 'Qty ' + l.qty].filter(Boolean).join(' · '))}</div><div class="note">${esc(checkedOf(l))} &middot; Illustrative image${l.promoApplied ? ` &middot; ${esc(q.promoCode)} &minus;${q.discountPercent}%` : l.dealExcluded && q.promoCode ? ' &middot; On deal, code not applied' : ''}</div></div><div class="price">${usd(l.unitCents * l.qty)}</div></div>`).join('')}</div></section>
        <p class="err" id="finErr" role="alert">${esc(st.finErr || '')}</p>
        <button type="button" class="btn finish finish--phone" data-finish ${st.paying ? 'disabled' : ''}>${st.paying ? 'Processing&hellip;' : `Finish payment &mdash; ${usd(q.totalCents)}`}</button>
      </div>`);
    $('#coMain').querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => go(+b.dataset.edit); });
    document.querySelectorAll('[data-finish]').forEach(b => { b.onclick = finishPayment; });
  }
  function stepDone() {
    const d = st.done, a = st.addr;
    $('#coStage').className = 'stage stage--done';
    $('#coBack').hidden = true;
    setMain(`<div class="ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></div>
      <h1>Payment complete</h1><p class="orderno">Stripe test payment <b>${esc(d.ref)}</b></p>
      <p class="lead">This was a Stripe test-mode payment: no real money was charged, no real order was created and nothing will ship. You can return to Luxora or close this tab.</p>
      <div class="split"><div class="mini"><h3>Payment</h3><p>${esc(d.payLabel)}</p><p><b>${usd(d.amount)} test paid</b></p></div>
        <div class="mini"><h3>Delivery address</h3><p>${esc(a.name)}</p><p>${esc([a.address1, a.address2].filter(Boolean).join(', '))}</p><p>${esc([a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '))}</p></div></div>
      <div class="btn-row"><a class="btn" href="app.html#/assistant" id="backLux">Back to Luxora</a><button type="button" class="btn btn--ghost" id="closeTab">Close tab</button></div>`);
    $('#closeTab').onclick = () => { window.close(); setTimeout(() => { if (!window.closed) { location.href = 'app.html#/assistant'; } }, 300); };
  }
  /* the Stripe Payment Element lives in #peHost, which is never re-rendered or moved (moving an iframe reloads it and
     Stripe then treats the element as unmounted); steps render into #coStep / #coFoot around it */
  function setMain(html, foot = '') { $('#coStep').innerHTML = html; $('#coFoot').innerHTML = foot; $('#peHost').hidden = st.step !== 2 || st.paymentView === 'express'; $('#expressHost').hidden = st.step !== 2 || st.paymentView !== 'express'; $('#coFoot').hidden = st.step === 2 && st.paymentView === 'express'; }
  function renderMain() { ({ 1: stepAddress, 2: stepPayment, 3: stepReview, 4: stepDone })[st.step](); }
  function go(n) {
    if (n > 1 && !st.addr.name) n = 1;
    if (n === 3 && !elements) n = 2;
    st.step = n; st.finErr = n === 3 ? st.finErr : '';
    renderSteps(); renderMain(); renderPanel();
    document.title = `${STEPS[n - 1]} - Luxora checkout`;
    window.scrollTo(0, 0); const h = $('#coMain h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  /* ---------- finish payment: same Worker contract as the app's previous checkout ---------- */
  async function finishPayment() {
    if (st.paying) return;                                    // double-click guard
    if (ses.mode === 'cart' && S.reprice().length) { st.notes = S.takeNotices().map(x => x.message); st.finErr = 'Your cart changed. Please review the updated total.'; go(3); return; }
    const q = quote();
    if (!q.ok) { st.finErr = 'This order has an item Luxora checkout cannot sell. Please go back and review it.'; go(3); return; }
    if (!ensureStripe() || !elements || st.paymentView === 'express' || !ENABLED_METHODS.includes(st.payType)) { go(2); return; }
    st.paying = true; st.finErr = ''; renderPanel(); stepReview();
    const fail = msg => { st.paying = false; st.finErr = msg; renderPanel(); stepReview(); const e = $('#finErr'); if (e) e.focus && e.scrollIntoView({ block: 'center' }); };
    try {
      try { elements.update({ amount: q.totalCents }); } catch {}
      const sub = await elements.submit();
      if (sub && sub.error) { st.paying = false; go(2); const pe = $('#payErr'); if (pe) pe.textContent = sub.error.message || 'Please check your payment details.'; return; }
      const res = await fetch(STRIPE_PAYMENT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: q.lines.map(i => ({ id: i.id, qty: i.qty, color: i.color, size: i.size, unitPriceCents: i.unitCents })), method: st.method, currency: 'usd', expectedTotalCents: q.totalCents, ...(q.promoCode ? { promoCode: q.promoCode } : {}) }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.code === 'invalid_promo') {
        const code = q.promoCode || 'Your promo code';
        S.clearPromo(`${code} is invalid or has expired, so it was removed. Prices are back to normal.`);
        st.notes = [`Promo code ${code} is invalid or has expired, so it was removed. Please review your updated total before paying.`];
        st.paying = false; priceChanged(); go(3); return;
      }
      if (res.status === 409) {
        if (ses.mode === 'cart') { S.reprice(); S.takeNotices(); }
        st.notes = [data.message || 'Prices changed. Please review your updated total before paying.'];
        st.paying = false; priceChanged(); go(3); return;
      }
      if (!res.ok || !data.clientSecret) return fail(data.message || data.error || 'Unable to start payment. Nothing was charged. Please try again.');
      if (typeof data.amount === 'number' && data.amount !== q.totalCents) return fail('The payment amount did not match your order total, so payment was not started. Nothing was charged.');
      const ret = new URL(location.href); ret.searchParams.delete('payment_intent'); ret.searchParams.delete('payment_intent_client_secret'); ret.searchParams.delete('redirect_status');
      const r = await stripe.confirmPayment({ elements, clientSecret: data.clientSecret, confirmParams: { return_url: ret.toString() }, redirect: 'if_required' });
      if (r.error) return fail(r.error.message || 'Payment did not go through. Nothing was charged.');
      completed(r.paymentIntent, q.totalCents);
    } catch (e) {
      console.warn('Luxora checkout: payment step failed', e && (e.name + ': ' + e.message));
      /* a Stripe.js integration error happens before anything is charged; a network error may be before or after */
      fail(e && e.name === 'IntegrationError' ? 'Payment could not start (checkout setup error). Nothing was charged.' : 'Unable to reach the payment service. Please check your connection and try again. If you were charged, do not pay twice.');
    }
  }
  function completed(pi, amount) {
    st.paying = false; st.notes = [];
    st.done = { ref: pi && pi.id ? pi.id.slice(0, 8) + '…' + pi.id.slice(-4) : 'Test payment', amount: pi && typeof pi.amount === 'number' ? pi.amount : amount, payLabel: payLabel() };
    st.doneItems = items().map(i => ({ ...i })); st.donePromo = S.promo();
    if (ses.mode === 'cart') S.clearCart();                   // Buy now never touched the cart, so it is left as it was
    try { sessionStorage.removeItem(TAB); } catch {}
    go(4); say('Test payment complete.');
  }

  /* other tab changed the cart / promo code: re-price */
  S.bind();
  document.addEventListener('luxora:external', () => { if (st.step < 4 && !st.paying) { if (ses.mode === 'cart' && !S.cart().length) { emptyPage('Your cart is empty', 'Your cart was emptied in another tab.'); return; } priceChanged(); } });
  document.addEventListener('luxora:promo', () => { if (st.step < 4 && !st.paying) priceChanged(); });
  document.addEventListener('luxora:deals', () => { if (st.step < 4) renderPanel(); });

  /* back from a redirect-based payment method (redirect: 'if_required' only redirects when the method needs it) */
  const retSecret = qs.get('payment_intent_client_secret');
  if (retSecret && ensureStripe()) {
    st.step = 3; renderSteps(); renderPanel();
    setMain('<p class="lead">Checking your payment&hellip;</p>');
    stripe.retrievePaymentIntent(retSecret).then(({ paymentIntent }) => {
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) { st.addr = st.addr.name ? st.addr : { ...st.addr, name: 'Luxora shopper' }; completed(paymentIntent, paymentIntent.amount); }
      else { st.notes = ['That payment did not complete. Nothing was charged. Please try again.']; go(1); }
    }).catch(() => go(1));
    return;
  }
  go(1);
})();
