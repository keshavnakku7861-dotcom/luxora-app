/* Luxora email sign-up -> Forminit form kbj6dk1nfgl (https://forminit.com/f/kbj6dk1nfgl).
   Forminit block names: fi-sender-fullName (optional), fi-sender-email (required), fi-checkbox-optin (explicit consent), fi-text-source.
   Plain fetch + FormData (same request the Forminit SDK makes); the endpoint answers CORS with access-control-allow-origin: *. */
(() => {
  const ENDPOINT = 'https://forminit.com/f/kbj6dk1nfgl', OPTIN = 'Email me Luxora deals and updates';
  let n = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function friendly(status, body) {
    if (status === 429) return 'Too many tries in a row. Please wait a few seconds and try again.';
    if (body && /EMAIL/.test(body.error || '')) return 'That email address does not look right. Please check it and try again.';
    if (body && body.message && status >= 400 && status < 500) return body.message;
    return 'Sorry, we could not sign you up right now. Please try again in a moment.';
  }
  function mount(host) {
    const id = 'su' + (++n), source = host.dataset.signup || 'site', compact = host.hasAttribute('data-compact');
    host.innerHTML = `<form class="signup${compact ? ' signup--card' : ''}" novalidate>
      <div class="signup__copy"><h3>${esc(host.dataset.title || 'Get Luxora deals in your inbox')}</h3><p>${esc(host.dataset.text || 'New deals and product updates. No spam.')}</p></div>
      <div class="signup__fields">
        <label class="signup__f" for="${id}-n"><span>Name <i>(optional)</i></span><input id="${id}-n" name="fi-sender-fullName" type="text" autocomplete="name" maxlength="80" placeholder="Your name"></label>
        <label class="signup__f" for="${id}-e"><span>Email</span><input id="${id}-e" name="fi-sender-email" type="email" autocomplete="email" inputmode="email" required maxlength="120" placeholder="you@example.com"></label>
        <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" class="signup__hp">
        <input type="hidden" name="fi-text-source" value="${esc(source)}">
        <button class="btn signup__btn" type="submit">Sign up</button>
      </div>
      <label class="signup__opt"><input type="checkbox" name="fi-checkbox-optin" value="${esc(OPTIN)}" required> <span>${esc(OPTIN)}</span></label>
      <p class="signup__fine">Prototype: your email goes to our sign-up form provider (Forminit) and is used only for Luxora deals and updates.</p>
      <p class="signup__msg" role="status" aria-live="polite" hidden></p>
    </form>`;
    const form = host.firstElementChild, msg = form.querySelector('.signup__msg'), btn = form.querySelector('.signup__btn'), email = form.elements['fi-sender-email'], opt = form.elements['fi-checkbox-optin'];
    const prof = window.LuxoraAuth && LuxoraAuth.profile();   // prefill from the prototype sign-in
    if (prof) { form.elements['fi-sender-fullName'].value = prof.name; email.value = prof.email; }
    const say = (text, kind) => { msg.textContent = text; msg.className = 'signup__msg signup__msg--' + kind; msg.hidden = !text; };
    form.addEventListener('submit', async e => {
      e.preventDefault(); say('', 'ok');
      if (form.elements._gotcha.value) return;   // bot
      if (!email.value.trim() || !email.checkValidity()) { say('Please enter a valid email address.', 'err'); email.focus(); return; }
      if (!opt.checked) { say('Please tick the box to confirm you want to receive Luxora deals and updates.', 'err'); opt.focus(); return; }
      btn.disabled = true; btn.textContent = 'Signing up...';
      try {
        const fd = new FormData(form); fd.delete('_gotcha');
        if (!String(fd.get('fi-sender-fullName') || '').trim()) fd.delete('fi-sender-fullName');
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
        const r = await fetch(ENDPOINT, { method: 'POST', body: fd, headers: { Accept: 'application/json' }, signal: ctl.signal }); clearTimeout(t);
        let body = null; try { body = await r.json(); } catch {}
        if (r.ok && (!body || body.success !== false)) {
          form.classList.add('is-done');
          form.innerHTML = `<div class="signup__done" role="status"><span class="signup__tick" aria-hidden="true">&#10003;</span><div><h3>You're on the list</h3><p>Thanks! We'll email you Luxora deals and updates.</p></div></div>`;
        } else say(friendly(r.status, body), 'err');
      } catch (err) { say(err.name === 'AbortError' ? 'The sign-up service took too long to answer. Please try again.' : 'We could not reach the sign-up service. Check your connection and try again.', 'err'); }
      if (!form.classList.contains('is-done')) { btn.disabled = false; btn.textContent = 'Sign up'; }
    });
  }
  const init = () => document.querySelectorAll('[data-signup]').forEach(mount);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  window.LuxoraSignup = { mount, ENDPOINT };
})();
