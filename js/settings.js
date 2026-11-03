/* Settings > Profile: shows the prototype profile (js/auth.js) and a clear "Log out" button at the bottom of the section. */
(() => {
  const body = document.getElementById('profileBody'), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render() {
    const p = window.LuxoraAuth && LuxoraAuth.profile();
    if (!p) {
      body.innerHTML = `<p class="sset__note">You are not signed in. Sign in to save your name and email on this device.</p><div class="sset__foot"><button type="button" class="btn" data-signin data-auth-keep>Sign in</button></div>`;
      return;
    }
    body.innerHTML = `<div class="sset__who"><span class="auth__avatar" aria-hidden="true">${esc(p.name.trim().charAt(0).toUpperCase())}</span>
      <dl><div><dt>Name</dt><dd>${esc(p.name)}</dd></div><div><dt>Email</dt><dd>${esc(p.email)}</dd></div></dl></div>
      <p class="sset__note">Prototype profile, saved only in this browser.</p>
      <div class="sset__foot"><button type="button" class="btn sset__logout" id="logOut">Log out</button></div>`;
    document.getElementById('logOut').onclick = () => { LuxoraAuth.logOut(); location.hash = '#/assistant'; };
  }
  document.addEventListener('luxora:auth', render);
  render();
})();
