/* Luxora prototype sign-up / sign-in. Full name, email, password (stored only as a salted SHA-256 hash) and location
   (country, state/region, city, ZIP/postal code). Nothing is sent to any server: the signed-in profile lives in
   localStorage "luxora.profile", accounts in "luxora.accounts". No card, PIN or street address is ever collected. Used by the landing page and the app.
   Any element with [data-signin] opens the dialog (sign-in form, or the account card once signed in);
   its label becomes "Hi, <name>" when signed in. [data-auth-initial] gets the first letter of the name. */
(() => {
  const KEY = 'luxora.profile';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v.name === 'string' && typeof v.email === 'string' ? v : null; } catch { return null; } };
  const write = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} };
  const first = n => (n.trim().split(/\s+/)[0] || n).slice(0, 20);
  let dlg, opener, live, mem = null;
  const get = () => { const p = read(); return p || mem; };

  function el(tag, attrs = {}, kids = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === 'text' ? e.textContent = v : e.setAttribute(k, v);
    kids.forEach(c => e.append(c)); return e;
  }
  function announce(t) { if (!live) { live = el('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }); document.body.append(live); } live.textContent = ''; setTimeout(() => live.textContent = t, 30); }

  function paint() {
    const p = get();
    document.querySelectorAll('[data-signin]').forEach(b => {
      if (!b.dataset.label) b.dataset.label = b.textContent.trim();
      if (b.hasAttribute('data-auth-keep')) { b.setAttribute('aria-label', p ? `Account: ${p.name}` : 'Sign in'); b.title = p ? p.name : 'Sign in'; return; }
      b.textContent = p ? `Hi, ${first(p.name)}` : b.dataset.label;
      b.setAttribute('aria-label', p ? `Account menu for ${p.name}` : 'Sign in');
    });
    document.querySelectorAll('[data-auth-initial]').forEach(b => { b.textContent = p ? p.name.trim().charAt(0).toUpperCase() : ''; b.classList.toggle('is-anon', !p); });
    document.querySelectorAll('[data-auth-name]').forEach(b => { b.textContent = p ? `Hi, ${first(p.name)}` : ''; b.hidden = !p; });
    document.dispatchEvent(new CustomEvent('luxora:auth', { detail: p }));
  }

  function build() {
    dlg = el('dialog', { class: 'auth', 'aria-labelledby': 'authTitle' });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });           // click on backdrop
    dlg.addEventListener('close', () => { if (opener && document.contains(opener)) opener.focus(); });
    document.body.append(dlg);
  }
  function close() { dlg.close(); }
  function closeBtn() { const b = el('button', { type: 'button', class: 'auth__x', 'aria-label': 'Close' }); b.innerHTML = '&#10005;'; b.addEventListener('click', close); return b; }

  /* ---- location + accounts (all local; the password is stored only as a salted SHA-256 hash) ---- */
  const COUNTRIES = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IN', 'India'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['AU', 'Australia']];
  const CURRENCY = { US: 'USD', CA: 'CAD', GB: 'GBP', IN: 'INR', DE: 'EUR', FR: 'EUR', ES: 'EUR', AU: 'AUD' };
  const POSTAL = { US: /^\d{5}(-\d{4})?$/, CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/, IN: /^\d{6}$/, DE: /^\d{5}$/, FR: /^\d{5}$/, ES: /^\d{5}$/, AU: /^\d{4}$/ };
  /* phone: national number digits after removing spaces, dashes, dots, brackets and an optional +<code> / leading 0 */
  const PHONE = { US: ['1', /^[2-9]\d{2}[2-9]\d{6}$/], CA: ['1', /^[2-9]\d{2}[2-9]\d{6}$/], GB: ['44', /^7\d{9}$|^[1-3]\d{8,9}$/], IN: ['91', /^[6-9]\d{9}$/],
    DE: ['49', /^1[5-7]\d{8,9}$|^[2-9]\d{5,10}$/], FR: ['33', /^[1-9]\d{8}$/], ES: ['34', /^[6-9]\d{8}$/], AU: ['61', /^[2-478]\d{8}$/] };
  function normPhone(raw, country) {
    const r = PHONE[country]; if (!r) return null;
    let d = String(raw || '').replace(/[\s().\-]/g, '');
    if (!/^\+?\d+$/.test(d)) return null;
    if (d.startsWith('+')) { if (!d.startsWith('+' + r[0])) return null; d = d.slice(1 + r[0].length); }
    else if (d.startsWith('00' + r[0])) d = d.slice(2 + r[0].length);
    else if (r[0] === '1' && d.length === 11 && d.startsWith('1')) d = d.slice(1);
    if (r[0] !== '1') d = d.replace(/^0/, '');
    return r[1].test(d) ? `+${r[0]} ${d}` : null;
  }
  const REGION_LABEL = { US: 'State', CA: 'Province', AU: 'State', IN: 'State' };
  const ACCTS = 'luxora.accounts';
  const accts = () => { try { const v = JSON.parse(localStorage.getItem(ACCTS)); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
  const saveAccts = v => { try { localStorage.setItem(ACCTS, JSON.stringify(v)); } catch {} };
  async function hash(pw, salt) {
    const data = new TextEncoder().encode(salt + ':' + pw);
    if (window.crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    let h = 0; for (const c of data) h = (h * 31 + c) >>> 0; return 'x' + h.toString(16);       // very old browsers only
  }
  const newSalt = () => { const a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
  /* checks a profile's location fields; returns { field: message } */
  function checkLocation(v) {
    const e = {};
    if (!CURRENCY[v.country]) e.country = 'Please choose your country.';
    if (!v.region) e.region = `Please enter your ${(REGION_LABEL[v.country] || 'state or region').toLowerCase()}.`;
    if (!v.phone) e.phone = 'Please enter your phone number.';
    else if (CURRENCY[v.country] && !normPhone(v.phone, v.country)) e.phone = 'That phone number does not look right for this country.';
    if (!v.street) e.street = 'Please enter your street address.';
    if (!v.city) e.city = 'Please enter your city.';
    if (!v.postal) e.postal = 'Please enter your ZIP or postal code.';
    else if (POSTAL[v.country] && !POSTAL[v.country].test(v.postal)) e.postal = 'That ZIP or postal code does not look right for this country.';
    return e;
  }
  const clean = x => String(x || '').trim().replace(/\s+/g, ' ');
  const inApp = () => /app\.html$/.test(location.pathname) || !!document.getElementById('viewAssistant');
  function toChat() { inApp() ? (location.hash = '#/assistant') : location.assign('app.html#/assistant'); }
  /* new account -> Luxora's Forminit form kbj6dk1nfgl (fire and forget; never the password, street or ZIP) */
  const FORM = 'https://forminit.com/f/kbj6dk1nfgl';
  function report(v) {
    try {
      const fd = new FormData();
      fd.append('fi-sender-fullName', v.name); fd.append('fi-sender-email', v.email);
      fd.append('fi-text-phone', v.phone); fd.append('fi-text-city', v.city); fd.append('fi-text-state', v.region);
      fd.append('fi-text-country', (COUNTRIES.find(c => c[0] === v.country) || [, v.country])[1]); fd.append('fi-text-signedUpAt', v.createdAt);
      fd.append('fi-text-source', 'account-signup');
      fetch(FORM, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, keepalive: true }).catch(() => {});
    } catch {}
  }
  function setCountryPrefs(country) { if (window.LuxoraPrefs && CURRENCY[country]) LuxoraPrefs.set({ country, currency: CURRENCY[country] }); }

  function field(id, label, attrs, input) {
    const inp = input || el('input', { id, ...attrs, 'aria-describedby': id + 'Err' });
    const err = el('p', { id: id + 'Err', class: 'auth__err', hidden: '' });
    return { inp, err, wrap: [el('label', { for: id }, [el('span', { text: label }), inp]), err] };
  }
  const flag = (f, msg) => { f.err.textContent = msg || ''; f.err.hidden = !msg; msg ? f.inp.setAttribute('aria-invalid', 'true') : f.inp.removeAttribute('aria-invalid'); };

  function formView(mode = 'signup') {
    dlg.replaceChildren();
    const logo = el('span', { class: 'auth__logo', 'aria-hidden': 'true' }); logo.innerHTML = window.LuxoraArt ? LuxoraArt.logo() : '';
    const form = el('form', { novalidate: '', autocomplete: 'on' });
    const swap = el('p', { class: 'auth__swap' }, [el('span', { text: mode === 'signup' ? 'Already have an account?' : 'New to Luxora?' }), document.createTextNode(' ')]);
    const swapBtn = el('button', { type: 'button', class: 'auth__link', id: 'authSwap', text: mode === 'signup' ? 'Sign in' : 'Create an account' });
    swapBtn.addEventListener('click', () => formView(mode === 'signup' ? 'signin' : 'signup')); swap.append(swapBtn);
    const em = field('authEmail', 'Email', { name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '120', required: '' });
    const pw = field('authPass', 'Password', { name: 'password', type: 'password', autocomplete: mode === 'signup' ? 'new-password' : 'current-password', maxlength: '128', required: '' });
    const formErr = el('p', { class: 'auth__err', id: 'authFormErr', role: 'alert', hidden: '' });
    let nm, pw2, co, rg, ci, pc, ph, st, ap;
    if (mode === 'signup') {
      nm = field('authName', 'Full name', { name: 'name', type: 'text', autocomplete: 'name', maxlength: '60', required: '' });
      pw2 = field('authPass2', 'Re-enter password', { name: 'password2', type: 'password', autocomplete: 'new-password', maxlength: '128', required: '' });
      const sel = el('select', { id: 'authCountry', name: 'country', autocomplete: 'country', required: '', 'aria-describedby': 'authCountryErr' });
      sel.append(el('option', { value: '', text: 'Choose your country' }), ...COUNTRIES.map(([v, l]) => el('option', { value: v, text: l })));
      co = field('authCountry', 'Country / region', null, sel);
      rg = field('authRegion', 'State / region', { name: 'region', type: 'text', autocomplete: 'address-level1', maxlength: '60', required: '' });
      ph = field('authPhone', 'Mobile phone number', { name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: '20', required: '' });
      st = field('authStreet', 'Street address', { name: 'street', type: 'text', autocomplete: 'address-line1', maxlength: '100', required: '' });
      ap = field('authApt', 'Apt, suite, unit', { name: 'apt', type: 'text', autocomplete: 'address-line2', maxlength: '60' });
      ap.wrap[0].firstChild.append(el('small', { class: 'auth__opt', text: '(optional)' }));
      ci = field('authCity', 'City', { name: 'city', type: 'text', autocomplete: 'address-level2', maxlength: '60', required: '' });
      pc = field('authPostal', 'ZIP / postal code', { name: 'postal', type: 'text', autocomplete: 'postal-code', maxlength: '12', required: '' });
      sel.addEventListener('change', () => { rg.wrap[0].firstChild.textContent = REGION_LABEL[sel.value] || 'State / region'; });
      const pwHint = el('p', { class: 'auth__hint', text: 'At least 8 characters.' });
      form.classList.add('auth__form--signup');
      form.append(el('div', { class: 'auth__grid' }, [
          el('div', { class: 'auth__col' }, [el('h3', { text: 'Your account' }), ...nm.wrap, ...em.wrap, ...ph.wrap, ...pw.wrap, pwHint, ...pw2.wrap]),
          el('fieldset', { class: 'auth__loc auth__col' }, [el('legend', { text: 'Your address' }), ...co.wrap, ...st.wrap, ...ap.wrap, el('div', { class: 'auth__row' }, [el('div', {}, ci.wrap), el('div', {}, rg.wrap)]), ...pc.wrap])]),
        formErr, el('button', { type: 'submit', class: 'btn auth__go', text: 'Create account' }),
        el('p', { class: 'auth__fine', text: 'Your account is saved in this browser; the password is stored only as a one-way hash and never leaves this device. Your name, email, phone and city/state/country are also sent to Luxora’s sign-up form provider (Forminit) so Luxora knows who joined. Luxora never asks for a card or PIN.' }));
    } else {
      form.append(...em.wrap, ...pw.wrap, formErr, el('button', { type: 'submit', class: 'btn auth__go', text: 'Sign in' }),
        el('p', { class: 'auth__fine', text: 'Accounts are saved only in this browser, so sign in on the device where you created it.' }));
    }
    form.addEventListener('submit', async e => {
      e.preventDefault(); formErr.hidden = true;
      const email = em.inp.value.trim(), key = email.toLowerCase(), pass = pw.inp.value;
      if (mode === 'signin') {
        flag(em, !email ? 'Please enter your email address.' : EMAIL.test(email) ? '' : 'That email address does not look right. Please check it.');
        flag(pw, pass ? '' : 'Please enter your password.');
        if (!EMAIL.test(email)) return em.inp.focus(); if (!pass) return pw.inp.focus();
        const a = accts()[key];
        if (!a || a.hash !== await hash(pass, a.salt)) { formErr.textContent = 'That email and password do not match an account on this device.'; formErr.hidden = false; return pw.inp.focus(); }
        mem = a.profile; write(a.profile); setCountryPrefs(a.profile.country); paint(); close(); announce(`Signed in as ${a.profile.name}`); toChat(); return;
      }
      const v = { name: clean(nm.inp.value).slice(0, 60), email: email.slice(0, 120), country: co.inp.value, region: clean(rg.inp.value).slice(0, 60), city: clean(ci.inp.value).slice(0, 60), postal: clean(pc.inp.value).toUpperCase().slice(0, 12), phone: clean(ph.inp.value).slice(0, 20), street: clean(st.inp.value).slice(0, 100), apt: clean(ap.inp.value).slice(0, 60) };
      const loc = checkLocation(v);
      const errs = [
        [nm, v.name ? '' : 'Please enter your full name.'],
        [em, !email ? 'Please enter your email address.' : EMAIL.test(email) ? (accts()[key] ? 'An account with this email already exists on this device. Sign in instead.' : '') : 'That email address does not look right. Please check it.'],
        [pw, !pass ? 'Please choose a password.' : pass.length < 8 ? 'Use at least 8 characters.' : ''],
        [pw2, !pw2.inp.value ? 'Please confirm your password.' : pw2.inp.value !== pass ? 'The passwords do not match.' : ''],
        [ph, loc.phone], [co, loc.country], [st, loc.street], [rg, loc.region], [ci, loc.city], [pc, loc.postal]];
      errs.forEach(([f, m]) => flag(f, m));
      const bad = errs.find(([, m]) => m); if (bad) return bad[0].inp.focus();
      const salt = newSalt(), all = accts(); all[key] = { salt, hash: await hash(pass, salt), profile: v }; saveAccts(all);
      v.phone = normPhone(v.phone, v.country); v.createdAt = new Date().toISOString();
      mem = v; write(v); setCountryPrefs(v.country); report(v); paint(); close(); announce(`Account created. Signed in as ${v.name}`); toChat();
    });
    dlg.classList.toggle('auth--wide', mode === 'signup');
    dlg.append(closeBtn(), logo, el('h2', { id: 'authTitle', text: mode === 'signup' ? 'Create your Luxora account' : 'Sign in to Luxora' }),
      el('p', { class: 'auth__lead', text: mode === 'signup' ? 'Add your name, phone, and address so Luxora can save your profile.' : 'Welcome back. Enter your email and password.' }), form, swap);
    setTimeout(() => (nm || em).inp.focus(), 0);
  }
  function accountView(p) {
    dlg.replaceChildren(); dlg.classList.remove('auth--wide');
    const out = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Log out' });
    out.addEventListener('click', () => { mem = null; write(null); paint(); close(); announce('Logged out'); });
    const done = el('button', { type: 'button', class: 'btn', text: 'Close' }); done.addEventListener('click', close);
    const av = el('span', { class: 'auth__avatar', 'aria-hidden': 'true', text: p.name.trim().charAt(0).toUpperCase() });
    dlg.append(closeBtn(), av, el('h2', { id: 'authTitle', text: `Hi, ${first(p.name)}` }), el('p', { class: 'auth__lead', text: p.email }),
      ...(p.city ? [el('p', { class: 'auth__lead auth__where', text: [p.city, p.region, (COUNTRIES.find(c => c[0] === p.country) || [, p.country])[1]].filter(Boolean).join(', ') + (p.postal ? ' ' + p.postal : '') })] : []),
      el('div', { class: 'auth__btns' }, [done, out]),
      el('p', { class: 'auth__fine', text: 'Prototype profile saved only in this browser.' }));
    setTimeout(() => done.focus(), 0);
  }
  function open(trigger) {
    if (!dlg) build();
    opener = trigger || document.activeElement;
    const p = get(); p ? accountView(p) : formView();
    if (!dlg.open) dlg.showModal();
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-get-started]');
    if (g) { e.preventDefault(); get() ? toChat() : open(g); return; }          // signed in: straight to chat, never ask again
    const t = e.target.closest('[data-signin]'); if (!t) return; e.preventDefault();
    if (get() && !inApp()) { toChat(); return; }                               // landing/legal pages: signed in -> chat
    open(t);
  });
  window.addEventListener('storage', e => { if (e.key === KEY) { mem = null; paint(); } });
  /* sign-in gate: every way into the app (Open App, app.html#/assistant, ?q= links) needs an account, like Get Started.
     Signed-in users never see it. Closing the dialog without signing in goes back to the landing page. */
  const gate = () => {
    if (!inApp() || get()) return;
    open(); dlg.addEventListener('close', () => { if (!get()) location.replace('index.html'); });
  };
  const init = () => { paint(); gate(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  window.LuxoraAuth = { profile: get, open, EMAIL, normPhone, COUNTRIES, CURRENCY, REGION_LABEL, checkLocation, setCountryPrefs,
    update(p) {   // edit profile; keeps the local account record in step (moves it if the email changed)
      const old = get(), all = accts(), ok = old && old.email && all[old.email.toLowerCase()];
      if (p && ok) { const rec = all[old.email.toLowerCase()]; delete all[old.email.toLowerCase()]; rec.profile = p; all[p.email.toLowerCase()] = rec; saveAccts(all); }
      mem = p; write(p); paint(); },
    emailTaken(email) { const old = get(), k = String(email).toLowerCase(); return !!accts()[k] && (!old || old.email.toLowerCase() !== k); }, logOut() { mem = null; write(null); paint(); } };
})();
