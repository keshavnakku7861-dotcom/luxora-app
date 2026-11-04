/* Luxora preferences. Loaded in <head> (before first paint) on every page.
   Stored in localStorage "luxora.prefs". Dark colour values live in palette.css only.
   LuxoraPrefs.get() / set(patch) / clear() / fmt(usd) / money-related helpers.
   Prices in the sample catalogue are USD; other currencies use fixed, approximate sample rates (not live FX). */
(() => {
  const KEY = 'luxora.prefs';
  const DEFAULTS = {
    theme: 'light',            // light | dark | system
    textSize: 'default',       // small | default | large
    deals: false,              // opted in to deal emails (the sign-up form still has to be submitted)
    dealAlerts: true, priceDrops: true, orderUpdates: true,
    favCats: [], favBrands: [], sort: 'featured', budget: '',
    language: 'en-US', currency: 'USD', country: 'US',
    replyLength: 'standard',   // short | standard | detailed
    showCards: true, rememberChat: true
  };
  const FIXED = { textSize: 'default', dealAlerts: true, orderUpdates: true, favCats: [], favBrands: [], sort: 'featured', budget: '', country: 'US', replyLength: 'standard', showCards: true, rememberChat: true };
  const RATES = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83, CAD: 1.36 };
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
  const root = document.documentElement, mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function apply(v) {
    const dark = v.theme === 'dark' || (v.theme === 'system' && mq && mq.matches);
    dark ? root.setAttribute('data-theme', 'dark') : root.removeAttribute('data-theme');
    v.textSize === 'small' || v.textSize === 'large' ? root.setAttribute('data-text', v.textSize) : root.removeAttribute('data-text');
    root.lang = (v.language || 'en-US').slice(0, 2);
  }
  const api = {
    DEFAULTS, RATES,
    /* Settings only offers theme, language, currency and price-drop alerts now; any other value an older version
       saved is ignored so nothing (budget, favourites, text size, reply length...) keeps changing behaviour invisibly. */
    get: () => ({ ...DEFAULTS, ...read(), ...FIXED }),
    set(patch) { const v = { ...api.get(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} apply(v); document.dispatchEvent(new CustomEvent('luxora:prefs', { detail: v })); return v; },
    clear() { try { localStorage.removeItem(KEY); } catch {} apply(api.get()); document.dispatchEvent(new CustomEvent('luxora:prefs', { detail: api.get() })); },
    /* format a USD catalogue amount in the chosen currency + language */
    fmt(usd, opts = {}) {
      const { currency, language } = api.get(), n = Number(usd) * (RATES[currency] || 1);
      const whole = currency === 'INR' || opts.whole;
      try { return new Intl.NumberFormat(language, { style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(n); }
      catch { return '$' + Number(usd).toFixed(2); }
    }
  };
  apply(api.get());
  if (mq) (mq.addEventListener ? mq.addEventListener('change', () => apply(api.get())) : mq.addListener(() => apply(api.get())));
  window.addEventListener('storage', e => { if (e.key === KEY) { apply(api.get()); document.dispatchEvent(new CustomEvent('luxora:prefs', { detail: api.get() })); } });
  window.LuxoraPrefs = api;
})();
