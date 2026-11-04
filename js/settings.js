/* Luxora Settings: every control saves to localStorage immediately (prefs: js/theme.js "luxora.prefs", profile: js/auth.js). */
(() => {
  const root = document.getElementById('settingsRoot'), jump = document.getElementById('sjump'), note = document.getElementById('savedNote');
  const S = window.LuxoraStore, P = window.LuxoraPrefs, esc = S.esc;
  const VERSION = '1.2.0';
  const CATS = [['smart-rings', 'Smart rings'], ['smartwatches', 'Smartwatches'], ['earbuds', 'Earbuds'], ['headphones', 'Headphones']];
  const BRANDS = ['Oura', 'Samsung', 'Garmin', 'Apple', 'Sony'];
  const LANGS = [['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Español'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['hi-IN', 'हिन्दी']];
  const CURR = [['USD', 'US dollar (USD)'], ['EUR', 'Euro (EUR)'], ['GBP', 'British pound (GBP)'], ['CAD', 'Canadian dollar (CAD)'], ['INR', 'Indian rupee (INR)']];
  const COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IN', 'India'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['AU', 'Australia']];
  const SUPPORT = 'support@luxora.example';   // placeholder address: no mailbox exists yet
  const FAQ = [
    ['Is Luxora a real store?', 'No. Luxora is a prototype assistant, not a store. The products, brands and prices are real and were checked on Nov 3, 2026, but Luxora does not sell anything: the Buy at button opens the retailer in a new tab. Luxora\'s own cart and checkout are a demo that takes no payment and places no order.'],
    ['Where is my data stored?', 'In this browser only (local storage): your profile, settings, chat history, saved items and cart. See Privacy & data below to download or erase it.'],
    ['Why does the assistant only know about electronics?', 'The catalogue has nine products: smart rings, smartwatches, earbuds and headphones. Groceries and fashion are not available yet. The product pictures are illustrative images, not official photos.'],
    ['How do currency and language work?', 'Prices are stored in US dollars and converted with fixed, approximate rates (not live exchange rates). Language changes number and date formatting; the interface text is English for now.'],
    ['How do I stop deal emails?', 'Turn off "Email me Luxora deals and updates" under Notifications. The prototype list is opt-in only.']
  ];
  const $ = s => root.querySelector(s);
  let savedT;
  const saved = t => { note.textContent = t || 'Saved on this device'; clearTimeout(savedT); savedT = setTimeout(() => note.textContent = '', 2500); };
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const sw = (key, label, desc, on) => `<div class="srow"><div><b id="l-${key}">${label}</b><p id="d-${key}">${desc}</p></div><button type="button" class="switch" role="switch" data-sw="${key}" aria-checked="${on}" aria-labelledby="l-${key}" aria-describedby="d-${key}"><span></span></button></div>`;
  const seg = (key, label, opts, cur) => `<div class="srow srow--col"><b id="l-${key}">${label}</b><div class="seg" role="radiogroup" aria-labelledby="l-${key}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === cur}" data-seg="${key}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  const sel = (key, label, arr, cur) => `<label class="sfield"><span>${label}</span><select data-sel="${key}">${opt(arr, cur)}</select></label>`;
  const chips = (key, label, arr, cur) => `<div class="srow srow--col"><b id="l-${key}">${label}</b><div class="schips" role="group" aria-labelledby="l-${key}">${arr.map(([v, l]) => `<button type="button" class="schip" data-chip="${key}" data-v="${esc(v)}" aria-pressed="${cur.includes(v)}">${esc(l)}</button>`).join('')}</div></div>`;
  const sec = (id, title, body) => `<section class="sset" id="s-${id}" aria-labelledby="h-${id}"><h2 id="h-${id}">${title}</h2>${body}</section>`;

  function count(k) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v.length : 0; } catch { return 0; } }
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
      sec('notifications', 'Notifications',
        sw('dealAlerts', 'Deal alerts', 'Show current deals in the store.', f.dealAlerts) +
        sw('priceDrops', 'Price-drop alerts', 'Highlight discounts with price-drop badges on products.', f.priceDrops) +
        sw('orderUpdates', 'Order updates', 'Saved for when real orders exist. Demo orders never ship.', f.orderUpdates) +
        sw('deals', 'Email me Luxora deals and updates', 'Opt in to deal emails. Off by default.', f.deals) +
        `<div id="dealsJoin" ${f.deals ? '' : 'hidden'}><p class="sset__note">One last step: confirm your email below to join the list. Nothing is sent until you press Sign up.</p><div id="dealsForm">${f.deals ? '<div data-signup="app-settings" data-compact data-title="Join the deals list" data-text="Opt-in only. You can leave any time."></div>' : ''}</div></div>`) +
      sec('shopping', 'Shopping preferences',
        chips('favCats', 'Favorite categories', CATS, f.favCats) +
        chips('favBrands', 'Preferred brands', BRANDS.map(b => [b, b]), f.favBrands) +
        `<div class="sgrid">${sel('sort', 'Default sort in the store', [['featured', 'Featured'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']], f.sort)}
          <label class="sfield"><span>Budget limit (US dollars, optional)</span><input type="number" min="0" max="100000" step="10" inputmode="numeric" data-budget value="${esc(f.budget)}" placeholder="No limit"></label></div>
        <p class="sset__note">Favorites move to the top of the Featured list. A budget limit marks pricier products and is applied to assistant questions that don't name a budget.</p>`) +
      sec('region', 'Region',
        `<div class="sgrid">${sel('language', 'Language', LANGS, f.language)}${sel('currency', 'Currency', CURR, f.currency)}${sel('country', 'Country', COUNTRIES, f.country)}</div>
        <p class="sset__note">Prices are in US dollars at the retailer and convert at fixed, approximate rates (not live exchange rates). Language changes number formatting; the interface text is English for now.</p>`) +
      sec('appearance', 'Appearance',
        seg('theme', 'Theme', [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']], f.theme) +
        seg('textSize', 'Text size', [['small', 'Small'], ['default', 'Default'], ['large', 'Large']], f.textSize)) +
      sec('assistant', 'AI assistant',
        seg('replyLength', 'Reply length', [['short', 'Short'], ['standard', 'Standard'], ['detailed', 'Detailed']], f.replyLength) +
        sw('showCards', 'Show product cards in chat', 'When off, the assistant lists product names in text.', f.showCards) +
        sw('rememberChat', 'Remember chat history', 'Keep your conversation on this device between visits.', f.rememberChat)) +
      sec('privacy', 'Privacy & data',
        `<p class="sset__note sset__note--top">Everything is stored only in this browser. Clearing or deleting asks you to confirm first.</p>
        <ul class="clears">
          <li><div><b>Chat history</b><p id="cChat"></p></div><button type="button" class="btn btn--ghost btn--sm" data-clear="chat">Clear chat history</button></li>
          <li><div><b>Saved items</b><p id="cSaved"></p></div><button type="button" class="btn btn--ghost btn--sm" data-clear="saved">Clear saved items</button></li>
          <li><div><b>Cart</b><p id="cCart"></p></div><button type="button" class="btn btn--ghost btn--sm" data-clear="cart">Clear cart</button></li>
          <li><div><b>Download my data</b><p>A JSON file with your profile, settings, chat, saved items and cart.</p></div><button type="button" class="btn btn--ghost btn--sm" id="dl">Download JSON</button></li>
          <li class="danger"><div><b>Delete my profile</b><p>Removes your profile, settings, chat, saved items and cart from this device.</p></div><button type="button" class="btn btn--danger btn--sm" data-clear="all">Delete profile</button></li>
        </ul>`) +
      sec('help', 'Help & support',
        `<div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
        <ul class="clears">
          <li><div><b>Contact us</b><p>${SUPPORT} (placeholder address, no mailbox yet)</p></div><a class="btn btn--ghost btn--sm" href="mailto:${SUPPORT}?subject=${encodeURIComponent('Luxora question')}">Email support</a></li>
          <li><div><b>Report a bug</b><p>Opens a pre-filled email in your own mail app. Nothing is sent automatically.</p></div><a class="btn btn--ghost btn--sm" id="bug" href="#">Report a bug</a></li>
        </ul>`) +
      sec('about', 'About Luxora',
        `<p class="sset__txt">Luxora is a prototype AI shopping assistant. It shows real products with prices checked on Nov 3, 2026 and links to the retailer to buy. Prices can change. Luxora's own cart and checkout are a demo: no payment is taken and no order is placed. Product pictures are illustrative images, not official photos.</p>
        <dl class="about"><div><dt>Version</dt><dd>${VERSION}</dd></div></dl>
        <p class="sset__links"><a href="terms.html">Terms of use</a><a href="privacy.html">Privacy policy</a></p>`);
    jump.innerHTML = [...root.querySelectorAll('.sset')].map(s => `<button type="button" data-go="${s.id}">${esc(s.querySelector('h2').textContent)}</button>`).join('');
    counts(); LuxoraArt.hydrate(root); if (window.LuxoraSignup) root.querySelectorAll('[data-signup]').forEach(LuxoraSignup.mount);
    const bug = $('#bug'); if (bug) bug.href = `mailto:${SUPPORT}?subject=${encodeURIComponent('Luxora bug report')}&body=${encodeURIComponent('What happened:\n\nWhat I expected:\n\nSteps to reproduce:\n\n---\nBrowser: ' + navigator.userAgent + '\nPage: ' + location.href)}`;
  }
  function counts() {
    const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    const n = count('luxora.chat'), f = P.get();
    set('cChat', !f.rememberChat ? 'Not being saved (turned off under AI assistant).' : n ? `${n} message${n === 1 ? '' : 's'} saved` : 'Nothing saved');
    set('cSaved', `${S.savedCount()} item${S.savedCount() === 1 ? '' : 's'} saved`); set('cCart', `${S.count()} item${S.count() === 1 ? '' : 's'} in your cart`);
  }

  /* confirm dialog (native <dialog>: focus trap + Escape) */
  function confirmBox({ title, text, ok, danger }) {
    return new Promise(res => {
      const d = document.createElement('dialog'); d.className = 'auth'; d.setAttribute('aria-labelledby', 'cfT'); d.setAttribute('aria-describedby', 'cfD');
      d.innerHTML = `<h2 id="cfT">${esc(title)}</h2><p class="auth__lead" id="cfD">${esc(text)}</p><div class="auth__btns"><button type="button" class="btn btn--ghost" data-no>Cancel</button><button type="button" class="btn ${danger ? 'btn--danger' : ''}" data-yes>${esc(ok)}</button></div>`;
      document.body.append(d); let out = false;
      d.addEventListener('click', e => { if (e.target === d) d.close(); if (e.target.closest('[data-yes]')) { out = true; d.close(); } if (e.target.closest('[data-no]')) d.close(); });
      d.addEventListener('close', () => { d.remove(); res(out); });
      d.showModal(); d.querySelector('[data-no]').focus();
    });
  }
  const CLEAR = {
    chat: { title: 'Clear chat history?', text: 'This erases your saved conversation with the assistant on this device.', ok: 'Clear chat history', run() { try { localStorage.removeItem('luxora.chat'); } catch {} document.dispatchEvent(new Event('luxora:clear-chat')); return 'Chat history cleared'; } },
    saved: { title: 'Clear saved items?', text: 'All items you saved with the heart will be removed.', ok: 'Clear saved items', run() { S.clearSaved(); return 'Saved items cleared'; } },
    cart: { title: 'Clear your cart?', text: 'Every item will be removed from your cart.', ok: 'Clear cart', run() { S.clearCart(); return 'Cart cleared'; } },
    all: { title: 'Delete your profile?', text: 'This removes your profile, settings, chat history, saved items and cart from this browser. It cannot be undone.', ok: 'Delete profile', danger: true,
      run() { Object.keys(localStorage).filter(k => k.startsWith('luxora.')).forEach(k => localStorage.removeItem(k)); P.clear(); LuxoraAuth.update(null); document.dispatchEvent(new Event('luxora:change')); document.dispatchEvent(new Event('luxora:clear-chat')); return 'Profile and local data deleted'; } }
  };

  root.addEventListener('click', async e => {
    const t = e.target;
    const swb = t.closest('[data-sw]'); if (swb) {
      const k = swb.dataset.sw, on = swb.getAttribute('aria-checked') !== 'true'; swb.setAttribute('aria-checked', on); P.set({ [k]: on }); saved();
      if (k === 'deals') { document.getElementById('dealsJoin').hidden = !on; const box = document.getElementById('dealsForm'); box.innerHTML = on ? '<div data-signup="app-settings" data-compact data-title="Join the deals list" data-text="Opt-in only. You can leave any time."></div>' : ''; if (on && window.LuxoraSignup) box.querySelectorAll('[data-signup]').forEach(LuxoraSignup.mount); }
      if (k === 'rememberChat' && !on) { try { localStorage.removeItem('luxora.chat'); } catch {} }
      counts(); return;
    }
    const sg = t.closest('[data-seg]'); if (sg) { P.set({ [sg.dataset.seg]: sg.dataset.v }); sg.parentElement.querySelectorAll('[role=radio]').forEach(b => b.setAttribute('aria-checked', b === sg)); saved(); return; }
    const ch = t.closest('[data-chip]'); if (ch) { const k = ch.dataset.chip, cur = new Set(P.get()[k]); const on = ch.getAttribute('aria-pressed') !== 'true'; on ? cur.add(ch.dataset.v) : cur.delete(ch.dataset.v); ch.setAttribute('aria-pressed', on); P.set({ [k]: [...cur] }); saved(); return; }
    const go = t.closest('[data-go]'); if (go) { const s = document.getElementById(go.dataset.go); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); s.querySelector('h2').setAttribute('tabindex', '-1'); s.querySelector('h2').focus({ preventScroll: true }); return; }
    const cl = t.closest('[data-clear]'); if (cl) { const c = CLEAR[cl.dataset.clear]; if (await confirmBox(c)) { const m = c.run(); counts(); saved(m); if (cl.dataset.clear === 'all') { render(); } } return; }
    if (t.closest('#logOut')) { LuxoraAuth.logOut(); location.hash = '#/assistant'; return; }
    if (t.closest('#dl')) { download(); return; }
  });
  root.addEventListener('change', e => {
    const s = e.target.closest('[data-sel]'); if (s) { P.set({ [s.dataset.sel]: s.value }); saved(); return; }
    if (e.target.matches('[data-budget]')) { const v = e.target.value.trim(), n = Number(v); P.set({ budget: v === '' || !(n > 0) ? '' : String(Math.round(n)) }); if (!(n > 0)) e.target.value = ''; saved(); }
  });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'profileForm') return; e.preventDefault();
    const f = e.target, name = f.name.value.trim().replace(/\s+/g, ' '), email = f.email.value.trim(), err = document.getElementById('profErr');
    const bad = !name ? 'Please enter your name.' : !LuxoraAuth.EMAIL.test(email) ? 'That email address does not look right.' : '';
    err.textContent = bad; err.hidden = !bad; if (bad) { (name ? f.email : f.name).focus(); return; }
    LuxoraAuth.update({ name: name.slice(0, 60), email: email.slice(0, 120) }); saved('Profile saved');
  });
  function download() {
    const out = { exportedAt: new Date().toISOString(), note: 'Luxora prototype data stored in this browser only.' };
    Object.keys(localStorage).filter(k => k.startsWith('luxora.')).sort().forEach(k => { try { out[k.slice(7)] = JSON.parse(localStorage.getItem(k)); } catch { out[k.slice(7)] = localStorage.getItem(k); } });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); a.download = 'luxora-my-data.json'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); saved('Download started');
  }
  document.addEventListener('luxora:change', counts);
  document.addEventListener('luxora:auth', render);
  render();
})();
