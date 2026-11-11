/* Luxora Settings: every control saves to localStorage immediately (prefs: js/theme.js "luxora.prefs", profile: js/auth.js). */
(() => {
  const root = document.getElementById('settingsRoot'), jump = document.getElementById('sjump'), note = document.getElementById('savedNote');
  const S = window.LuxoraStore, P = window.LuxoraPrefs, esc = S.esc;
  const VERSION = '1.3.0';
  const LANGS = [['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Español'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch']];   // Hindi is hidden until a native speaker reviews it
  const CURR = [['USD', 'US dollar (USD)'], ['EUR', 'Euro (EUR)'], ['GBP', 'British pound (GBP)'], ['CAD', 'Canadian dollar (CAD)'], ['INR', 'Indian rupee (INR)'], ['AUD', 'Australian dollar (AUD)']];
  const FAQ = [
    ['Is Luxora a real store?', 'Luxora is currently a prototype shopping app. Its checkout uses Stripe test mode: test payments are handled by Stripe, but no real money is charged, no real order is created, and nothing is shipped. Product prices were checked on Nov 3–4, 2026 and may change.'],
    ['Why does the assistant only know about electronics?', 'The catalogue has 13 products: smart rings, smartwatches, earbuds, headphones, tablets, e-readers and smart speakers. Groceries and fashion are not available yet. The product pictures are illustrative images, not official photos.'],
    ['How do currency and language work?', 'Prices are stored in US dollars and converted with fixed, approximate rates (not live exchange rates). Language changes number and date formatting and translates the interface into French, Spanish or German.']
  ];
  const $ = s => root.querySelector(s);
  let savedT;
  const saved = t => { note.textContent = t || 'Saved on this device'; clearTimeout(savedT); savedT = setTimeout(() => note.textContent = '', 2500); };
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const sw = (key, label, desc, on) => `<div class="srow"><div><b id="l-${key}">${label}</b><p id="d-${key}">${desc}</p></div><button type="button" class="switch" role="switch" data-sw="${key}" aria-checked="${on}" aria-labelledby="l-${key}" aria-describedby="d-${key}"><span></span></button></div>`;
  const seg = (key, label, opts, cur) => `<div class="srow srow--col"><b id="l-${key}">${label}</b><div class="seg" role="radiogroup" aria-labelledby="l-${key}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === cur}" data-seg="${key}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  const sel = (key, label, arr, cur) => `<label class="sfield"><span>${label}</span><select data-sel="${key}">${opt(arr, cur)}</select></label>`;
  const sec = (id, title, body) => `<section class="sset" id="s-${id}" aria-labelledby="h-${id}"><h2 id="h-${id}">${title}</h2>${body}</section>`;

  function render() {
    const f = P.get(), me = LuxoraAuth.profile();
    const profile = me
      ? `<form class="sprofile" id="profileForm" novalidate>
          <div class="sset__who"><span class="auth__avatar auth__avatar--lg" aria-hidden="true">${esc(me.name.trim().charAt(0).toUpperCase())}</span>
            <div class="sset__fields">
              <label class="sfield"><span>Name</span><input name="name" value="${esc(me.name)}" maxlength="60" autocomplete="name" required></label>
              <label class="sfield"><span>Email</span><input name="email" type="email" value="${esc(me.email)}" maxlength="120" autocomplete="email" required></label>
              <label class="sfield"><span>Phone number</span><input name="phone" type="tel" inputmode="tel" value="${esc(me.phone || '')}" maxlength="20" autocomplete="tel" required></label>
              <label class="sfield"><span>Country</span><select name="country" autocomplete="country" required><option value="">Choose your country</option>${opt(LuxoraAuth.COUNTRIES, me.country || '')}</select></label>
              <label class="sfield"><span>Street address</span><input name="street" value="${esc(me.street || '')}" maxlength="100" autocomplete="address-line1" required></label>
              <label class="sfield"><span>Apt, suite, unit <i>(optional)</i></span><input name="apt" value="${esc(me.apt || '')}" maxlength="60" autocomplete="address-line2"></label>
              <label class="sfield"><span>${esc(LuxoraAuth.REGION_LABEL[me.country] || 'State / region')}</span><input name="region" value="${esc(me.region || '')}" maxlength="60" autocomplete="address-level1" required></label>
              <label class="sfield"><span>City</span><input name="city" value="${esc(me.city || '')}" maxlength="60" autocomplete="address-level2" required></label>
              <label class="sfield"><span>ZIP / postal code</span><input name="postal" value="${esc(me.postal || '')}" maxlength="12" autocomplete="postal-code" required></label>
              <p class="sset__err" id="profErr" role="alert" hidden></p>
            </div></div>
          <p class="sset__note">Prototype profile, saved only in this browser. Changing your country also sets the currency (you can still pick another under Language &amp; currency).</p>
          <div class="sset__foot"><button type="submit" class="btn btn--ghost">Save changes</button><button type="button" class="btn sset__logout" id="logOut">Log out</button></div>
        </form>`
      : `<p class="sset__note sset__note--top">You are not signed in. Sign in to save your name and email on this device.</p><div class="sset__foot"><button type="button" class="btn" data-signin data-auth-keep>Sign in</button></div>`;
    root.innerHTML =
      sec('profile', 'Profile', profile) +
      sec('notifications', 'Notifications', sw('priceDrops', 'Show price-drop badges', 'Highlight discounts with price-drop badges on products.', f.priceDrops)) +
      sec('appearance', 'Appearance', seg('theme', 'Theme', [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']], f.theme)) +
      sec('region', 'Language & currency',
        `<div class="sgrid">${sel('language', 'Language', LANGS, f.language)}${sel('currency', 'Currency', CURR, f.currency)}</div>
        <p class="sset__note">Prices are in US dollars at the retailer and convert at fixed, approximate rates (not live exchange rates). Language changes number formatting and translates the interface into French, Spanish or German.</p>`) +
      sec('help', 'Help & About',
        `<div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
        <p class="sset__txt">Luxora is a prototype AI shopping assistant. It shows real products with prices checked on Nov 3–4, 2026. Prices can change. Luxora checkout currently uses Stripe test mode: test payments do not create real orders and nothing is shipped. Product pictures are illustrative images, not official photos. Each price shows its own checked date.</p>
        <p class="sset__txt">As an Amazon Associate, Luxora earns from qualifying purchases. Where Amazon or retailer links are shown, the retailer&rsquo;s current price, availability and terms apply.</p>
        <dl class="about"><div><dt>Version</dt><dd>${VERSION}</dd></div></dl>
        <p class="sset__links"><a href="terms.html">Terms of use</a><a href="privacy.html">Privacy policy</a></p>`);
    jump.innerHTML = [...root.querySelectorAll('.sset')].map(s => `<button type="button" data-go="${s.id}">${esc(s.querySelector('h2').textContent)}</button>`).join('');
    LuxoraArt.hydrate(root); if (window.LuxoraSignup) root.querySelectorAll('[data-signup]').forEach(LuxoraSignup.mount);
  }

  root.addEventListener('click', e => {
    const t = e.target;
    const swb = t.closest('[data-sw]'); if (swb) { const on = swb.getAttribute('aria-checked') !== 'true'; swb.setAttribute('aria-checked', on); P.set({ [swb.dataset.sw]: on }); saved(); return; }
    const sg = t.closest('[data-seg]'); if (sg) { P.set({ [sg.dataset.seg]: sg.dataset.v }); sg.parentElement.querySelectorAll('[role=radio]').forEach(b => b.setAttribute('aria-checked', b === sg)); saved(); return; }
    const go = t.closest('[data-go]'); if (go) { const s = document.getElementById(go.dataset.go); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); s.querySelector('h2').setAttribute('tabindex', '-1'); s.querySelector('h2').focus({ preventScroll: true }); return; }
    if (t.closest('#logOut')) { LuxoraAuth.logOut(); return; }
  });
  root.addEventListener('change', e => { const s = e.target.closest('[data-sel]'); if (s) { P.set({ [s.dataset.sel]: s.value }); saved(); } });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'profileForm') return; e.preventDefault();
    const f = e.target, err = document.getElementById('profErr'), c = x => String(x || '').trim().replace(/\s+/g, ' ');
    const v = { name: c(f.name.value).slice(0, 60), email: f.email.value.trim().slice(0, 120), country: f.country.value, region: c(f.region.value).slice(0, 60), city: c(f.city.value).slice(0, 60), postal: c(f.postal.value).toUpperCase().slice(0, 12), phone: c(f.phone.value).slice(0, 20), street: c(f.street.value).slice(0, 100), apt: c(f.apt ? f.apt.value : '').slice(0, 60) };
    const loc = LuxoraAuth.checkLocation(v);
    const bad = !v.name ? ['name', 'Please enter your full name.'] : !LuxoraAuth.EMAIL.test(v.email) ? ['email', 'That email address does not look right.'] : LuxoraAuth.emailTaken(v.email) ? ['email', 'Another account on this device already uses that email.']
      : loc.phone && !loc.country ? ['phone', loc.phone] : loc.country ? ['country', loc.country] : loc.street ? ['street', loc.street] : loc.region ? ['region', loc.region] : loc.city ? ['city', loc.city] : loc.postal ? ['postal', loc.postal] : null;
    f.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    err.textContent = bad ? bad[1] : ''; err.hidden = !bad; if (bad) { f[bad[0]].setAttribute('aria-invalid', 'true'); f[bad[0]].focus(); return; }
    v.phone = LuxoraAuth.normPhone(v.phone, v.country); const old = LuxoraAuth.profile() || {}; LuxoraAuth.update({ ...old, ...v }); if (v.country !== old.country) LuxoraAuth.setCountryPrefs(v.country); saved('Profile saved');
  });
  root.addEventListener('change', e => { if (e.target.name === 'country' && e.target.closest('#profileForm')) { const l = e.target.form.region.closest('label').firstElementChild; l.textContent = LuxoraAuth.REGION_LABEL[e.target.value] || 'State / region'; } });
  document.addEventListener('luxora:auth', render);
  render();
})();
