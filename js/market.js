/* Luxora FreshMart-inspired marketplace storefront.
   The uploaded reference art is decorative. All new department inventory is preview-only;
   existing electronics and Stripe TEST mode remain connected to Luxora's store. */
(() => {
  const root = document.getElementById('marketRoot');
  if (!root) return;
  const S = window.LuxoraStore, Art = window.LuxoraArt;
  const products = [...(window.LuxoraOffline?.products || []), ...(window.LuxoraOffline?.drops || [])];
  const departments = [
    ['groceries','Groceries','🥬'],['electronics','Electronics','🎧'],
    ['fashion','Fashion','👕'],['home','Home & Kitchen','🍳'],
    ['beauty','Beauty','🧴'],['sports','Sports','⚽'],
    ['toys','Toys & Games','🧸'],['books','Books','📚']
  ];
  const previews = {
    groceries:[['Fresh Vegetables','🥬'],['Farm Eggs','🥚'],['Fresh Bananas','🍌'],['Whole Milk','🥛'],['Premium Rice','🍚'],['Organic Tomatoes','🍅']],
    fashion:[['Everyday Clothing','👕'],['Sneakers','👟'],['Dresses','👗'],['Handbags','👜']],
    home:[['Kitchen Essentials','🍳'],['Home Furniture','🛋️'],['Table Lamps','💡'],['Home Decor','🪴']],
    beauty:[['Skin Care','🧴'],['Beauty Essentials','💄'],['Fragrances','🌺']],
    sports:[['Sports Equipment','⚽'],['Basketballs','🏀'],['Fitness Gear','🏋️']],
    toys:[['Toys & Games','🧸'],['Building Blocks','🧱'],['Toy Vehicles','🚗']],
    books:[['Books','📚'],['Notebooks','📓'],['School Supplies','🎒']]
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dept='all', query='', menuOpen=false;
  const match = (v,q) => v.toLowerCase().includes(q.toLowerCase());
  const detailLink = p => '#/shop/p/'+encodeURIComponent(p.id);
  const categories = () => departments.map(([id,name,emoji]) =>
    '<button type="button" class="fm-category '+(dept===id?'selected':'')+'" data-dept="'+id+'" aria-pressed="'+(dept===id)+'"><span class="fm-category-emoji" aria-hidden="true">'+emoji+'</span><strong>'+name+'</strong></button>'
  ).join('');
  const dropdown = () => departments.map(([id,name,emoji]) =>
    '<button type="button" data-dept="'+id+'"><span aria-hidden="true">'+emoji+'</span> '+name+'</button>'
  ).join('');
  function electronicCard(p) {
    const soon = S.comingSoon(p);
    const price = soon ? 'Coming soon' : S.money(S.promoPrice(p).price);
    return '<article class="fm-product-card">'+
      '<a class="fm-product-photo" href="'+detailLink(p)+'" aria-label="View '+esc(p.name)+'">'+Art.product(p,0)+'</a>'+
      '<div class="fm-product-info"><small>'+esc(p.store)+'</small><h3><a href="'+detailLink(p)+'">'+esc(p.name)+'</a></h3>'+
      '<div class="fm-product-bottom"><strong>'+esc(price)+'</strong>'+
      (soon ? '<span class="fm-soon">Coming soon</span>' : '<button type="button" class="fm-plus" data-market-add="'+esc(p.id)+'" aria-label="Add '+esc(p.name)+' to cart">+</button>')+
      '</div></div></article>';
  }
  function previewCard(p) {
    return '<article class="fm-product-card fm-product-card--preview"><div class="fm-product-photo" role="img" aria-label="'+esc(p[0])+'"><span class="fm-preview-emoji">'+p[1]+'</span></div>'+
      '<div class="fm-product-info"><small>Upcoming category</small><h3>'+esc(p[0])+'</h3><span class="fm-soon">Coming soon</span></div></article>';
  }
  function mainProducts() {
    const q=query.trim();
    let real=products.filter(p=>dept==='all'||dept==='electronics');
    if(q) real=real.filter(p=>match([p.name,p.store,p.category,...(p.tags||[])].join(' '),q));
    let planned = (dept==='all' ? Object.values(previews).flat() : (previews[dept]||[]));
    if(q) planned=planned.filter(p=>match(p[0],q));
    let cards='';
    if(dept==='all' || dept==='electronics') cards+=real.slice(0,q?30:10).map(electronicCard).join('');
    if(dept!=='electronics') cards+=planned.slice(0,q?30:dept==='all'?5:15).map(previewCard).join('');
    const heading=q?'Search results':dept==='all'?'Popular Products':departments.find(d=>d[0]===dept)?.[1]||'Products';
    return '<section class="fm-products" id="fmProducts"><div class="fm-section-header"><div><h2>'+esc(heading)+'</h2>'+
      '<p>'+ (dept==='all'?'Explore Luxora products and upcoming departments':'Products from your selected department')+'</p></div><a href="#/shop">View All <span aria-hidden="true">→</span></a></div>'+
      '<div class="fm-products-grid">'+(cards||'<p class="fm-empty">No products found. Try another search or category.</p>')+'</div></section>';
  }
  function badgeCount() {
    const n = S?.count?.() || 0;
    root.querySelectorAll('[data-cart-badge]').forEach(el=>{el.textContent=String(n);el.hidden=!n;});
  }
  function render() {
    const home = dept==='all' && !query;
    root.innerHTML = '<div class="fm-site">'+
      '<header class="fm-header"><div class="fm-header-inner">'+
        '<div class="fm-header-main">'+
          '<div class="fm-header-left"><span class="fm-lang" title="English (United States)">🇺🇸 <strong>En</strong> <span aria-hidden="true">⌄</span></span>'+
          '<form class="fm-search" role="search" id="marketSearch"><label for="marketQuery" class="sr-only">Search Luxora products</label><span aria-hidden="true" class="fm-search-icon">⌕</span><input id="marketQuery" type="search" placeholder="Search grocery items..." value="'+esc(query)+'"></form></div>'+
          '<a class="fm-logo" data-market-home href="#/market" aria-label="Luxora homepage">Luxora<span class="fm-logo-arc" aria-hidden="true"></span></a>'+
          '<div class="fm-header-right"><a href="#/saved" class="fm-utility" title="Wishlist"><span aria-hidden="true">♡</span> Wishlist</a>'+
          '<a href="#/cart" class="fm-utility" title="Cart"><span aria-hidden="true">🛒</span> Cart <b data-cart-badge hidden>0</b></a>'+
          '<button type="button" class="fm-avatar" data-signin aria-label="Sign in or account">👤 <span aria-hidden="true">⌄</span></button></div>'+
        '</div>'+
        '<div class="fm-header-sub"><nav class="fm-primary" aria-label="Main menu">'+
          '<a href="#/shop">Shop</a><div class="fm-dropdown-wrap"><button type="button" id="fmMenuToggle" aria-expanded="'+menuOpen+'" aria-controls="fmDropdown">Categories <span aria-hidden="true">⌄</span></button>'+
          '<div class="fm-dropdown" id="fmDropdown" '+(menuOpen?'':'hidden')+'>'+dropdown()+'</div></div>'+
          '<a href="#/shop?cat=deals">Sale</a><a href="#/info">About</a></nav>'+
          '<nav class="fm-secondary" aria-label="Support menu"><a href="privacy.html">Policy</a><a href="#/help">FAQs</a><a href="#/help">ⓘ &nbsp;Help &amp; Support</a></nav>'+
        '</div></div></header>'+
        '<main class="fm-container">'+
          (home?'<section class="fm-hero" aria-label="Luxora grocery shopping promotional design"><img class="fm-hero-artwork" src="assets/luxora-reference-hero.webp" alt="Luxora banner showing a shopper carrying bags of groceries, large lime-green Luxora lettering and a Fresh Vegetables promotional card"><a href="#/shop" class="fm-hero-shop" aria-label="Shop products now"><span class="sr-only">Shop Now</span></a></section>'+
          '<div class="fm-benefits" aria-label="Shopping highlights">'+
            '<div><span>✿</span><strong>Peak Quality</strong><small>Explore curated products</small></div>'+
            '<div><span>▣</span><strong>New Products</strong><small>Discover new arrivals</small></div>'+
            '<div><span>♧</span><strong>Flash Savings</strong><small>See current deals</small></div>'+
            '<div><span>▧</span><strong>Delivery Pass</strong><small>Coming soon</small></div>'+
            '<div><span>♨</span><strong>Prepared Meals</strong><small>Coming soon</small></div>'+
          '</div><p class="fm-concept-note">Design preview: same-day delivery and grocery sales are not active. Checkout for existing items is in test mode.</p>':'')+
          '<section class="fm-categories" id="marketBrowse"><div class="fm-section-header"><div><h2>Shop by Category</h2><p>Find exactly what you need</p></div></div><div class="fm-category-list">'+categories()+'</div></section>'+
          mainProducts()+
        '</main>'+
        '<footer class="fm-footer"><span class="fm-footer-logo">Luxora</span><span>Online shopping demo · Checkout uses test payments · No real delivery orders</span><a href="#/assistant">Luxora AI</a></footer>'+
      '</div>';
    badgeCount();
  }
  function message(t) {
    const old=document.getElementById('fmToast');old?.remove();
    const el=document.createElement('div');el.id='fmToast';el.className='fm-toast';el.setAttribute('role','status');el.textContent=t;document.body.appendChild(el);
    setTimeout(()=>el.remove(),2600);
  }
  root.addEventListener('click',event=>{
    const selected=event.target.closest('[data-dept]');
    if(selected){dept=selected.dataset.dept;query='';menuOpen=false;render();root.querySelector('#fmProducts')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(event.target.closest('[data-market-home]')){dept='all';query='';menuOpen=false;render();document.getElementById('viewMarket').scrollTop=0;return;}
    if(event.target.closest('#fmMenuToggle')){menuOpen=!menuOpen;render();return;}
    const add=event.target.closest('[data-market-add]');
    if(add){
      const p=products.find(x=>x.id===add.dataset.marketAdd);
      if(!p)return;
      if(S.needsSize(p)){location.hash=detailLink(p);return;}
      const line=S.addToCart(p);
      message(line?p.name+' added to cart':'This item cannot be purchased yet');
      badgeCount();
    }
  });
  root.addEventListener('submit',e=>{
    if(e.target.id!=='marketSearch')return;
    e.preventDefault();
    query=root.querySelector('#marketQuery').value.trim();dept='all';menuOpen=false;render();root.querySelector('#fmProducts')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.addEventListener('luxora:change',badgeCount);
  window.LuxoraMarket={show:render};
  render();
})();