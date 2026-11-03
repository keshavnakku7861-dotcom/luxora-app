/* Luxora prototype sign-in. Name + email only, no password, nothing sent to any server:
   the profile lives in this browser's localStorage ("luxora.profile"). Used by the landing page and the app.
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

  function formView() {
    dlg.replaceChildren();
    const logo = el('span', { class: 'auth__logo', 'aria-hidden': 'true' }); logo.innerHTML = window.LuxoraArt ? LuxoraArt.logo() : '';
    const form = el('form', { novalidate: '', autocomplete: 'on' });
    const nm = el('input', { id: 'authName', name: 'name', type: 'text', autocomplete: 'name', maxlength: '60', required: '', 'aria-describedby': 'authNameErr' });
    const em = el('input', { id: 'authEmail', name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '120', required: '', 'aria-describedby': 'authEmailErr' });
    const nErr = el('p', { id: 'authNameErr', class: 'auth__err', hidden: '' }), eErr = el('p', { id: 'authEmailErr', class: 'auth__err', hidden: '' });
    const flag = (input, err, msg) => { err.textContent = msg || ''; err.hidden = !msg; msg ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid'); };
    form.append(
      el('label', { for: 'authName' }, [el('span', { text: 'Your name' }), nm]), nErr,
      el('label', { for: 'authEmail' }, [el('span', { text: 'Email' }), em]), eErr,
      el('button', { type: 'submit', class: 'btn auth__go', text: 'Continue' }),
      el('p', { class: 'auth__fine', text: 'No password needed. This is a prototype: your name and email are saved only in this browser and are not sent anywhere.' }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = nm.value.trim().replace(/\s+/g, ' '), email = em.value.trim();
      flag(nm, nErr, name ? '' : 'Please enter your name.');
      flag(em, eErr, !email ? 'Please enter your email address.' : EMAIL.test(email) ? '' : 'That email address does not look right. Please check it.');
      if (!name) return nm.focus();
      if (!EMAIL.test(email)) return em.focus();
      const profile = { name: name.slice(0, 60), email: email.slice(0, 120) };
      mem = profile; write(profile); paint(); close(); announce(`Signed in as ${profile.name}`);
    });
    dlg.append(closeBtn(), logo, el('h2', { id: 'authTitle', text: 'Sign in or create an account' }),
      el('p', { class: 'auth__lead', text: 'Enter your name and email to save your profile on Luxora.' }), form);
    setTimeout(() => nm.focus(), 0);
  }
  function accountView(p) {
    dlg.replaceChildren();
    const out = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Log out' });
    out.addEventListener('click', () => { mem = null; write(null); paint(); close(); announce('Logged out'); });
    const done = el('button', { type: 'button', class: 'btn', text: 'Close' }); done.addEventListener('click', close);
    const av = el('span', { class: 'auth__avatar', 'aria-hidden': 'true', text: p.name.trim().charAt(0).toUpperCase() });
    dlg.append(closeBtn(), av, el('h2', { id: 'authTitle', text: `Hi, ${first(p.name)}` }), el('p', { class: 'auth__lead', text: p.email }),
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
  document.addEventListener('click', e => { const t = e.target.closest('[data-signin]'); if (t) { e.preventDefault(); open(t); } });
  window.addEventListener('storage', e => { if (e.key === KEY) { mem = null; paint(); } });
  const init = () => paint();
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  window.LuxoraAuth = { profile: get, open, EMAIL, update(p) { mem = p; write(p); paint(); }, logOut() { mem = null; write(null); paint(); } };
})();
