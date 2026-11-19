/* Mobile bottom bar "More" sheet: Account (phone/tablet bottom bar only) opens a modal sheet with
   Information, What's New, Settings and the account actions. Native <dialog>: Esc closes, focus stays inside,
   and focus goes back to Account when it closes. */
(() => {
  const btn = document.getElementById('navAccount'), dlg = document.getElementById('moreSheet');
  if (!btn || !dlg) return;
  const acct = document.getElementById('moreAcct'), sub = document.getElementById('moreSub'), title = document.getElementById('moreTitle');
  const A = () => window.LuxoraAuth;
  const MORE = ['info', 'whats-new', 'settings'];
  const ICON = {
    in: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8.5" r="3.6"/><path d="M3 20c.8-3.6 3.6-5.4 7-5.4 1.4 0 2.6.3 3.6.8M18 14v6M15 17h6"/></svg>',
    me: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9"/></svg>'
  };
  const route = () => (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'assistant');
  function act(id, label, icon, fn, extra = '') {
    const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'more__act ' + extra;
    b.innerHTML = ICON[icon] + '<span></span>'; b.lastChild.textContent = label; b.addEventListener('click', fn); return b;
  }
  function label() { const p = A() && A().profile(); btn.setAttribute('aria-label', p ? `Account and more: ${p.name}` : 'Account and more'); return p; }
  function paint() {
    const p = label();
    title.textContent = p ? p.name : 'Account';
    sub.textContent = p ? p.email : 'Not signed in';
    const handoff = mode => () => { close(false); A() && A().open(btn, mode); };
    acct.replaceChildren(...(p
      ? [act('moreProfile', 'Account details', 'me', handoff('signin')), act('moreLogout', 'Log out', 'out', () => { close(true); A() && A().logOut && A().logOut(); }, 'more__act--out')]
      : [act('moreSignin', 'Sign in', 'in', handoff('signin')), act('moreSignup', 'Create account', 'up', handoff('signup'))]));
  }
  function mark() {
    const r = route();
    dlg.querySelectorAll('[data-more-route]').forEach(a => a.dataset.moreRoute === r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    btn.classList.toggle('on', MORE.includes(r));          // the Account tab lights up while you are on one of its pages
  }
  let refocus = true;
  function open() { paint(); mark(); refocus = true; dlg.showModal(); btn.setAttribute('aria-expanded', 'true'); const f = dlg.querySelector('[aria-current="page"]') || dlg.querySelector('.more__item'); f && f.focus(); }
  function close(back = true) { refocus = back; if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => { btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); });
  btn.addEventListener('click', () => dlg.open ? close() : open());
  dlg.addEventListener('click', e => {
    if (e.target === dlg) { const r = dlg.getBoundingClientRect(); if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) { close(); return; } }
    if (e.target.closest('[data-more-close]')) { close(); return; }
    if (e.target.closest('[data-more-route]')) close(false);   // the link navigates; the new page takes focus
  });
  /* keep Tab inside the sheet (a modal dialog already makes the page behind it inert; this also stops focus leaving to the browser chrome) */
  dlg.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...dlg.querySelectorAll('a[href], button:not([disabled])')].filter(x => x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  /* leaving the phone layout (rotate / resize to desktop) closes the sheet */
  const mq = matchMedia('(max-width: 980px)'); (mq.addEventListener ? mq.addEventListener('change', () => { if (!mq.matches) close(false); }) : 0);
  window.addEventListener('hashchange', mark);
  document.addEventListener('luxora:auth', () => { label(); if (dlg.open) paint(); });
  label(); mark();
})();
