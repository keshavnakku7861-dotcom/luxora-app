/* Luxora Settings: every control saves to localStorage immediately (prefs: js/theme.js "luxora.prefs", profile: js/auth.js). */
(() => {
  const root = document.getElementById('settingsRoot'), jump = document.getElementById('sjump'), note = document.getElementById('savedNote');
  const S = window.LuxoraStore, P = window.LuxoraPrefs, esc = S.esc;
  const VERSION = '1.3.0';
  const LANGS = [['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Español'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['hi-IN', 'हिन्दी']];
  const CURR = [['USD', 'US dollar (USD)'], ['EUR', 'Euro (EUR)'], ['GBP', 'British pound (GBP)'], ['CAD', 'Canadian dollar (CAD)'], ['INR', 'Indian rupee (INR)']];
  const FAQ = [
    ['Is Luxora a real store?', 'No. Luxora is a prototype assistant, not a store. The products, brands and prices are real and were checked on Nov 3, 2026, but Luxora does not sell anything: the Buy at button opens the retailer in a new tab. Luxora\'s own cart and checkout are a demo that takes no payment and places no order.'],
    ['Why does the assistant only know about electronics?', 'The catalogue has nine products: smart rings, smartwatches, earbuds and headphones. Groceries and fashion are not available yet. The product pictures are illustrative images, not official photos.'],
    ['How do currency and language work?', 'Prices are stored in US dollars and converted with fixed, approximate rates (not live exchange rates). Language changes number and date formatting, and French also translates the interface text; other languages stay in English for now.']
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
              <p class="sset__err" id="profErr" role="alert" hidden></p>
            </div></div>
          <p class="sset__note">Prototype profile, saved only in this browser. The avatar shows your initial.</p>
          <div class="sset__foot"><button type="submit" class="btn btn--ghost">Save changes</button><button type="button" class="btn sset__logout" id="logOut">Log out</button></div>
        </form>`
      : `<p class="sset__note sset__note--top">You are not signed in. Sign in to save your name and email on this device.</p><div class="sset__foot"><button type="button" class="btn" data-signin data-auth-keep>Sign in</button></div>`;
    root.innerHTML =
      sec('profile', 'Profile', profile) +
      sec('notifications', 'Notifications', sw('priceDrops', 'Price-drop alerts', 'Highlight discounts with price-drop badges on products.', f.priceDrops)) +
      sec('appearance', 'Appearance', seg('theme', 'Theme', [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']], f.theme)) +
      sec('region', 'Language & currency',
        `<div class="sgrid">${sel('language', 'Language', LANGS, f.language)}${sel('currency', 'Currency', CURR, f.currency)}</div>
        <p class="sset__note">Prices are in US dollars at the retailer and convert at fixed, approximate rates (not live exchange rates). Language changes number formatting, and French also translates the interface text; other languages stay in English for now.</p>`) +
      sec('help', 'Help & About',
        `<div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
        <p class="sset__txt">Luxora is a prototype AI shopping assistant. It shows real products with prices checked on Nov 3, 2026 and links to the retailer to buy. Prices can change. Luxora's own cart and checkout are a demo: no payment is taken and no order is placed. Product pictures are illustrative images, not official photos.</p>
        <p class="sset__txt">As an Amazon Associate, Luxora earns from qualifying purchases. Links marked &ldquo;Buy on Amazon&rdquo; carry Luxora&rsquo;s Amazon Associates tag; the price you pay is the same.</p>
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
    if (t.closest('#logOut')) { LuxoraAuth.logOut(); location.hash = '#/assistant'; return; }
  });
  root.addEventListener('change', e => { const s = e.target.closest('[data-sel]'); if (s) { P.set({ [s.dataset.sel]: s.value }); saved(); } });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'profileForm') return; e.preventDefault();
    const f = e.target, name = f.name.value.trim().replace(/\s+/g, ' '), email = f.email.value.trim(), err = document.getElementById('profErr');
    const bad = !name ? 'Please enter your name.' : !LuxoraAuth.EMAIL.test(email) ? 'That email address does not look right.' : '';
    err.textContent = bad; err.hidden = !bad; if (bad) { (name ? f.email : f.name).focus(); return; }
    LuxoraAuth.update({ name: name.slice(0, 60), email: email.slice(0, 120) }); saved('Profile saved');
  });
  document.addEventListener('luxora:auth', render);
  render();
})();
