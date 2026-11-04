/* Luxora art: logo/sparkle SVG helpers + product photo <img> helper. */
(function () {
  let uid = 0;
  const LOGO_PATH = 'M278 57 L315 78 L243 200 L190 200 Z M447 57 L410 78 L485 200 L538 200 Z M80 200 H648 Q653 200 653 205 V243 Q653 248 648 248 H622 L550 465 Q545 480 525 480 H205 Q185 480 180 465 L105 248 H80 Q75 248 75 243 V205 Q75 200 80 200 Z M363 243 Q372 340 480 358 Q372 376 363 475 Q354 376 246 358 Q354 340 363 243 Z';
  const logo = (cls = '') => `<svg class="${cls}" viewBox="60 40 610 490" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`;
  const sparkle = (size = 40, cls = 'sparkle') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" d="M20 0 Q23 17 40 20 Q23 23 20 40 Q17 23 0 20 Q17 17 20 0Z"/></svg>`;

  /* Product art = studio photos in images/<id>-<view 1..3>.webp (relative URLs, works under /<repo>/). */
  const VIEWS = 3;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function product(p, view = 0) {
    const v = ((view % VIEWS) + VIEWS) % VIEWS + 1;
    return `<img class="pimg" src="images/${encodeURIComponent(p.imageId || p.id)}-${v}.webp" alt="Illustrative image of ${esc(p.name || 'the product')} (not an official product photo)" width="800" height="800" loading="lazy" decoding="async" onerror="this.onerror=null;this.style.visibility='hidden'">`;
  }

  const illus = '<span class="illus">Illustrative image</span>';
  /* Fill every [data-art] placeholder: data-art="ring:copper" */
  function hydrate(root = document) {
    root.querySelectorAll('[data-art]:not([data-done])').forEach(el => {
      const [id, view] = el.dataset.art.split(':');
      el.innerHTML = product({ id, name: el.dataset.alt || id.replace(/-/g, ' ') }, Number(view || 0)); el.dataset.done = '1';
    });
    root.querySelectorAll('[data-logo]:not([data-done])').forEach(el => { el.innerHTML = logo(); el.dataset.done = '1'; });
    root.querySelectorAll('[data-sparkle]:not([data-done])').forEach(el => { el.innerHTML = sparkle(Number(el.dataset.sparkle) || 40); el.dataset.done = '1'; });
  }
  window.LuxoraArt = { logo, sparkle, product, hydrate, VIEWS, illus };
  document.addEventListener('DOMContentLoaded', () => hydrate());
})();
