/* Luxora art: logo sprite + CSS-variable-coloured SVG product illustrations (all original, drawn in code). */
(function () {
  let uid = 0;
  const LOGO_PATH = 'M278 57 L315 78 L243 200 L190 200 Z M447 57 L410 78 L485 200 L538 200 Z M80 200 H648 Q653 200 653 205 V243 Q653 248 648 248 H622 L550 465 Q545 480 525 480 H205 Q185 480 180 465 L105 248 H80 Q75 248 75 243 V205 Q75 200 80 200 Z M363 243 Q372 340 480 358 Q372 376 363 475 Q354 376 246 358 Q354 340 363 243 Z';
  const logo = (cls = '') => `<svg class="${cls}" viewBox="60 40 610 490" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`;
  const sparkle = (size = 40, cls = 'sparkle') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" d="M20 0 Q23 17 40 20 Q23 23 20 40 Q17 23 0 20 Q17 17 20 0Z"/></svg>`;

  function grad(id, hi, mid, lo, x2 = 1, y2 = 1) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="var(--${hi})"/><stop offset=".5" stop-color="var(--${mid})"/><stop offset="1" stop-color="var(--${lo})"/></linearGradient>`;
  }
  const T = { copper: ['copper-hi', 'copper', 'copper-lo'], silver: ['silver-hi', 'silver', 'silver-lo'], dark: ['dark-hi', 'dark', 'dark-lo'] };

  function ring(tone, view = 0) {
    const [hi, mid, lo] = T[tone] || T.copper, id = 'r' + (++uid);
    const rot = [-18, 12, -48][view % 3], sy = [1, .88, .74][view % 3], off = [26, 20, 30][view % 3];
    const top = 92, bot = top + off;
    return `<svg viewBox="0 0 200 200" role="img" aria-label="Smart ring illustration">
      <defs>${grad(id + 'a', hi, mid, lo)}${grad(id + 'b', mid, lo, 'dark-lo', 0, 1)}${grad(id + 'c', 'dark', 'dark-lo', 'dark', 0, 1)}
      <clipPath id="${id}t"><ellipse cx="100" cy="${top}" rx="54" ry="36"/></clipPath>
      <mask id="${id}m"><rect width="200" height="200" fill="var(--white)"/><g clip-path="url(#${id}t)"><ellipse cx="100" cy="${bot}" rx="54" ry="36" fill="var(--black)"/></g></mask></defs>
      <ellipse cx="100" cy="178" rx="64" ry="7" fill="var(--shadow)"/>
      <g transform="rotate(${rot} 100 100) translate(100 100) scale(1 ${sy}) translate(-100 -100)" mask="url(#${id}m)">
        <ellipse cx="100" cy="${bot}" rx="82" ry="60" fill="url(#${id}b)"/>
        <rect x="18" y="${top}" width="164" height="${off}" fill="url(#${id}b)"/>
        <ellipse cx="100" cy="${top}" rx="82" ry="60" fill="url(#${id}a)"/>
        <ellipse cx="100" cy="${top}" rx="54" ry="36" fill="url(#${id}c)"/>
        <g clip-path="url(#${id}t)"><circle cx="84" cy="${top - 28}" r="3" fill="var(--orange)"/><circle cx="100" cy="${top - 31}" r="3" fill="var(--glow)"/><circle cx="116" cy="${top - 28}" r="3" fill="var(--orange)"/></g>
        <path d="M30 ${top} Q40 ${top - 48} 96 ${top - 58}" fill="none" stroke="var(--glow)" stroke-width="3" stroke-linecap="round" opacity=".65"/>
      </g></svg>`;
  }
  function watch(tone, view = 0) {
    const [hi, mid, lo] = T[tone] || T.dark, id = 'w' + (++uid);
    const rot = [0, -12, 12][view % 3];
    return `<svg viewBox="0 0 200 200" role="img" aria-label="Smartwatch illustration"><defs>${grad(id + 'a', hi, mid, lo)}${grad(id + 'b', lo, mid, hi, 0, 1)}</defs>
      <ellipse cx="100" cy="188" rx="46" ry="6" fill="var(--shadow)"/>
      <g transform="rotate(${rot} 100 100)">
        <rect x="70" y="6" width="60" height="70" rx="14" fill="url(#${id}b)"/><rect x="70" y="124" width="60" height="70" rx="14" fill="url(#${id}b)"/>
        <rect x="52" y="52" width="96" height="96" rx="26" fill="url(#${id}a)"/>
        <rect x="60" y="60" width="80" height="80" rx="20" fill="var(--screen)"/>
        <text x="100" y="108" text-anchor="middle" font-family="Outfit, sans-serif" font-size="24" font-weight="600" fill="var(--white)">9:41</text>
        <circle cx="100" cy="124" r="4" fill="var(--orange)"/>
        <rect x="148" y="84" width="7" height="22" rx="3" fill="var(--orange)"/>
      </g></svg>`;
  }
  function earbuds(tone, view = 0) {
    const [hi, mid, lo] = T[tone] || T.silver, id = 'e' + (++uid);
    const flip = view % 2 ? -1 : 1;
    return `<svg viewBox="0 0 200 200" role="img" aria-label="Earbuds illustration"><defs>${grad(id + 'a', hi, mid, lo)}${grad(id + 'b', lo, mid, hi, 0, 1)}</defs>
      <ellipse cx="100" cy="184" rx="66" ry="6" fill="var(--shadow)"/>
      <g transform="translate(100 0) scale(${flip} 1) translate(-100 0)">
        <rect x="36" y="124" width="128" height="52" rx="22" fill="url(#${id}b)"/><rect x="36" y="124" width="128" height="20" rx="10" fill="url(#${id}a)"/><circle cx="100" cy="150" r="4" fill="var(--orange)"/>
        <g transform="rotate(-14 62 70)"><rect x="52" y="62" width="14" height="58" rx="7" fill="url(#${id}b)"/><ellipse cx="59" cy="52" rx="24" ry="26" fill="url(#${id}a)"/><circle cx="52" cy="46" r="5" fill="var(--glow)" opacity=".8"/></g>
        <g transform="rotate(14 138 70)"><rect x="134" y="62" width="14" height="58" rx="7" fill="url(#${id}b)"/><ellipse cx="141" cy="52" rx="24" ry="26" fill="url(#${id}a)"/><circle cx="134" cy="46" r="5" fill="var(--glow)" opacity=".8"/></g>
      </g></svg>`;
  }
  function headphones(tone, view = 0) {
    const [hi, mid, lo] = T[tone] || T.dark, id = 'h' + (++uid);
    const flip = view % 2 ? -1 : 1;
    return `<svg viewBox="0 0 200 200" role="img" aria-label="Headphones illustration"><defs>${grad(id + 'a', hi, mid, lo)}${grad(id + 'b', lo, mid, hi, 0, 1)}</defs>
      <ellipse cx="100" cy="186" rx="60" ry="6" fill="var(--shadow)"/>
      <g transform="translate(100 0) scale(${flip} 1) translate(-100 0)">
        <path d="M44 120 V92 A56 56 0 0 1 156 92 V120" fill="none" stroke="url(#${id}b)" stroke-width="12" stroke-linecap="round"/>
        <rect x="26" y="100" width="40" height="72" rx="18" fill="url(#${id}a)"/><rect x="134" y="100" width="40" height="72" rx="18" fill="url(#${id}a)"/>
        <rect x="36" y="112" width="20" height="48" rx="10" fill="url(#${id}b)"/><rect x="144" y="112" width="20" height="48" rx="10" fill="url(#${id}b)"/>
        <circle cx="46" cy="136" r="3.5" fill="var(--orange)"/>
      </g></svg>`;
  }
  const draw = { ring, watch, earbuds, headphones };
  function product(p, view = 0) { return (draw[p.kind] || ring)(p.tone, view); }

  /* Fill every [data-art] placeholder: data-art="ring:copper" */
  function hydrate(root = document) {
    root.querySelectorAll('[data-art]:not([data-done])').forEach(el => {
      const [kind, tone, view] = el.dataset.art.split(':');
      el.innerHTML = product({ kind, tone }, Number(view || 0)); el.dataset.done = '1';
    });
    root.querySelectorAll('[data-logo]:not([data-done])').forEach(el => { el.innerHTML = logo(); el.dataset.done = '1'; });
    root.querySelectorAll('[data-sparkle]:not([data-done])').forEach(el => { el.innerHTML = sparkle(Number(el.dataset.sparkle) || 40); el.dataset.done = '1'; });
  }
  window.LuxoraArt = { logo, sparkle, product, hydrate };
  document.addEventListener('DOMContentLoaded', () => hydrate());
})();
