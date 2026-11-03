const burger = document.getElementById('burger'), links = document.getElementById('navLinks');
burger.addEventListener('click', () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
links.addEventListener('click', e => { if (e.target.tagName === 'A') { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
const dlg = document.getElementById('signin');
document.querySelectorAll('[data-signin]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); links.classList.remove('open'); dlg.showModal(); }));
