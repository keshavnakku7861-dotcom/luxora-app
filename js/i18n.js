/* Luxora interface translation (French, Spanish, German). Dictionaries: i18n/<lang>.json, built by scripts/build-i18n.js
   from the reviewed files in luxora-translations (Hindi is a draft and is not shipped: it keeps the English interface).
   Exact English text -> translation, plus regex patterns whose captured product names, brands and $ prices pass through
   unchanged. Text nodes and placeholder/aria-label/title/alt are translated in place and the English is remembered, so
   switching language (or back to English) is exact. Chat bubble text is skipped ([data-no-i18n], .msg--user): app.js
   translates error/fallback replies at the source with LuxoraI18n.t(). */
(() => {
  const SHIP = ['fr', 'es', 'de'];
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const cache = {}, V = ((document.currentScript && document.currentScript.src || '').match(/[?&]v=(\w+)/) || [])[1];   // build stamp busts the JSON cache too
  let lang = 'en', tx = null, busy = false;

  /* translator built from one dictionary (same algorithm as luxora-translations/tools/runtime.js) */
  function make(d) {
    const months = d.dates.months, dre = new RegExp(d.dates.match, 'g'), pr = new Intl.PluralRules(d.locale);
    const pats = d.patterns.map(p => ({ ...p, re: new RegExp(p.match) }));
    const dates = s => s.replace(dre, (_, m, day, y) => d.dates.format.replace('{d}', day === '1' && d.dates.firstDay ? d.dates.firstDay : day).replace('{m}', months[m]).replace('{y}', y));
    const sep = s => Object.entries(d.separators || {}).reduce((a, [k, v]) => a.split(k).join(v), s);
    function tr(src) {
      const lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0], core = src.trim(); if (!core) return src;
      let out = d.strings[core];
      if (out == null) for (const p of pats) {
        const m = core.match(p.re); if (!m) continue;
        let tpl = p.template; if (typeof tpl === 'object') tpl = tpl[pr.select(Number(m[p.count]))] || tpl.other;
        out = tpl.replace(/\{(t?)(\d+)\}/g, (_, t, n) => { let v = m[n] == null ? '' : m[n]; if (p.maps && p.maps[n] && p.maps[n][v] != null) v = p.maps[n][v]; else if (t) v = tr(v); else if (p.substitutions) p.substitutions.forEach(([a, b]) => { v = v.split(a).join(b); }); return v; });
        break;
      }
      if (out == null) return src;
      return lead + sep(dates(out)) + trail;
    }
    return src => { const core = src.trim(); const m = core.match(new RegExp(d.sentenceSplit)); if (m && d.strings[core] == null) { const a = tr(m[1]), b = tr(m[2]); if (a !== m[1] || b !== m[2]) return src.replace(core, a + '. ' + b); } return tr(src); };
  }

  const code = l => String(l || 'en-US').slice(0, 2).toLowerCase();
  function load(l) {
    if (cache[l]) return Promise.resolve(cache[l]);
    const embedded = () => (window.LuxoraI18nData && window.LuxoraI18nData[l]) || null;
    if (embedded()) return Promise.resolve(cache[l] = make(embedded()));
    return fetch('i18n/' + l + '.json' + (V ? '?v=' + V : '')).then(r => r.ok ? r.json() : Promise.reject(r.status))
      .catch(() => new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'js/i18n-data.js' + (V ? '?v=' + V : ''); s.onload = () => embedded() ? ok(embedded()) : no(); s.onerror = no; document.head.append(s); }))
      .then(d => (cache[l] = make(d)));
  }

  const skip = n => { const p = n.parentNode; return !p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE)$/.test(p.nodeName) || (p.closest && p.closest('.msg--user, [data-no-i18n]')); };
  function doText(n) {
    if (skip(n)) return;
    const cur = n.nodeValue, orig = n.__tx != null && cur === n.__tx ? n.__en : cur;
    if (!tx) { if (orig !== cur) n.nodeValue = orig; n.__tx = n.__en = undefined; return; }
    const out = tx(orig);
    if (out !== orig) { n.__en = orig; n.__tx = out; if (cur !== out) n.nodeValue = out; }
    else { if (cur !== orig) n.nodeValue = orig; n.__en = n.__tx = undefined; }
  }
  function doAttrs(el) {
    if (!el.getAttribute || (el.closest && el.closest('.msg--user, [data-no-i18n]'))) return;
    const st = el.__i18n || (el.__i18n = {});
    for (const a of ATTRS) {
      const cur = el.getAttribute(a); if (cur == null) continue; const rec = st[a];
      const orig = rec && cur === rec.tx ? rec.en : cur;
      if (!tx) { if (orig !== cur) el.setAttribute(a, orig); st[a] = undefined; continue; }
      const out = tx(orig);
      if (out !== orig) { st[a] = { en: orig, tx: out }; if (cur !== out) el.setAttribute(a, out); }
      else { if (cur !== orig) el.setAttribute(a, orig); st[a] = undefined; }
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }
  function title() {
    const d = document; const orig = d.__ttx != null && d.title === d.__ttx ? d.__ten : d.title;
    if (!tx) { if (orig !== d.title) d.title = orig; d.__ttx = d.__ten = undefined; return; }
    const out = tx(orig); if (out !== orig) { d.__ten = orig; d.__ttx = out; if (d.title !== out) d.title = out; } else d.__ttx = d.__ten = undefined;
  }
  function run(root) { busy = true; try { walk(root || document.body); title(); } finally { busy = false; } }
  let pending = false; const queue = new Set();
  function flush() { pending = false; busy = true; try { queue.forEach(n => { if (n.isConnected !== false) walk(n); }); if (tx) title(); } finally { queue.clear(); busy = false; } }
  const obs = new MutationObserver(list => {
    if (busy) return;
    for (const m of list) {
      if (m.type === 'characterData') { if (m.target.nodeValue !== m.target.__tx) queue.add(m.target); }
      else if (m.type === 'attributes') queue.add(m.target);
      else m.addedNodes.forEach(n => queue.add(n));
    }
    if (queue.size && !pending) { pending = true; (window.requestAnimationFrame || setTimeout)(flush); }
  });
  let want = null;
  function set(l) {
    const next = SHIP.includes(code(l)) ? code(l) : 'en';
    if (next === want) return; want = next;
    const done = t => { if (want !== next) return; lang = next; tx = t; run(); document.dispatchEvent(new CustomEvent('luxora:i18n', { detail: { lang } })); };
    next === 'en' ? done(null) : load(next).then(done, () => done(null));
  }
  window.LuxoraI18n = { t: s => (tx && typeof s === 'string' ? tx(s) : s), lang: () => lang, apply: () => run(), languages: SHIP.slice() };
  function boot() {
    if (!document.body) return;
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    set(window.LuxoraPrefs ? window.LuxoraPrefs.get().language : 'en-US');
    document.addEventListener('luxora:prefs', e => set((e.detail || window.LuxoraPrefs.get()).language));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
