const burger = document.getElementById('burger'), links = document.getElementById('navLinks');
burger.addEventListener('click', () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
links.addEventListener('click', e => { if (e.target.closest('a, button')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
