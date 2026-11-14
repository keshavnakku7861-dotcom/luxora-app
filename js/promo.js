/* Luxora promo code bar (top of the app, every view). One active code at a time, stored by LuxoraStore in
   localStorage 'luxora.promo'. Applying / removing dispatches 'luxora:promo' + 'luxora:change', so shop, assistant cards
   and panel, saved, cart and checkout re-price at once. 15% off full-price items only; items already on a deal keep their
   deal price. The Worker re-checks the code and every price before Stripe is called. */
(() => {
  const S = window.LuxoraStore, $ = s => document.querySelector(s);
  const bar = $('#promoBar'); if (!S || !bar) return;
  const input = $('#promoCode'), apply = $('#promoApply'), remove = $('#promoRemove'), msg = $('#promoMsg'), pill = $('#promoPill');
  const activeText = c => `${c} applied · ${S.promoPercent()}% off full-price items (excludes existing deals)`;
  function say(text, kind) { msg.textContent = text || ''; msg.className = 'promo__msg' + (kind ? ' promo__msg--' + kind : ''); msg.hidden = !text; }
  function render(note) {
    const code = S.promo();
    bar.classList.toggle('is-on', !!code);
    input.hidden = apply.hidden = !!code; remove.hidden = !code; pill.hidden = !code;
    if (code) { pill.textContent = activeText(code); say(''); }
    else if (note) say(note[0], note[1]);
    input.removeAttribute('aria-invalid');
  }
  bar.addEventListener('submit', e => {
    e.preventDefault();
    const typed = input.value;
    const r = S.setPromo(typed);
    if (r.ok) { input.value = ''; render(); return; }
    if (r.reason === 'empty') { render(['Enter a promo code first.', 'err']); input.focus(); return; }
    render([`"${String(r.code).slice(0, 24)}" isn't a valid promo code. Check the code in your Luxora email and try again.`, 'err']);
    input.setAttribute('aria-invalid', 'true'); input.focus(); input.select();
  });
  remove.addEventListener('click', () => { const was = S.promo(); S.clearPromo(); render([`${was || 'Promo code'} removed. Prices are back to normal.`, 'ok']); input.focus(); });
  input.addEventListener('input', () => { if (!msg.hidden && msg.classList.contains('promo__msg--err')) say(''); input.removeAttribute('aria-invalid'); });
  /* the checkout can clear a stale code (Worker said it is invalid or expired): show why */
  document.addEventListener('luxora:promo', e => render(e && e.detail && e.detail.message ? [e.detail.message, 'err'] : null));
  render();
})();
