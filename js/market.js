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
  // Illustrative stock photos: real department inventory is not configured.
  const PREVIEW_PHOTOS = {
    "Fresh Vegetables": 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=max&w=900&q=86',
    "Farm Eggs": 'https://images.unsplash.com/photo-1635843086739-624d71f440b3?auto=format&fit=max&w=900&q=86',
    "Fresh Bananas": 'https://images.unsplash.com/photo-1675586677399-2dbd468cad2f?auto=format&fit=max&w=900&q=86',
    "Whole Milk": 'https://images.unsplash.com/photo-1639151082235-406d8eb262b9?auto=format&fit=max&w=900&q=86',
    "Premium Rice": 'https://images.unsplash.com/photo-1704916029292-ec7b5976204c?auto=format&fit=max&w=900&q=86',
    "Organic Tomatoes": 'https://images.unsplash.com/photo-1755405003720-c4c8935139da?auto=format&fit=max&w=900&q=86',
    "Everyday Clothing": 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&h=560&q=84',
    "Sneakers": 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&h=560&q=84',
    "Dresses": 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&h=560&q=84',
    "Handbags": 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&h=560&q=84',
    "Kitchen Essentials": 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&h=560&q=84',
    "Home Furniture": 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&h=560&q=84',
    "Table Lamps": 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&h=560&q=84',
    "Home Decor": 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&h=560&q=84',
    "Skin Care": 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&h=560&q=84',
    "Beauty Essentials": 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&h=560&q=84',
    "Fragrances": 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&h=560&q=84',
    "Sports Equipment": 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=700&h=560&q=84',
    "Basketballs": 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=700&h=560&q=84',
    "Fitness Gear": 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&h=560&q=84',
    "Toys & Games": 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=700&h=560&q=84',
    "Building Blocks": 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=700&h=560&q=84',
    "Toy Vehicles": 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=700&h=560&q=84',
    "Books": 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&h=560&q=84',
    "Notebooks": 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=700&h=560&q=84',
    "School Supplies": 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=700&h=560&q=84'
  };
  // Exact six packshots from the user's approved generated six-item image, arranged 3x2.
  const PACKSHOT_CELLS = {
    'Fresh Vegetables': [0,0], 'Farm Eggs': [1,0], 'Fresh Bananas': [2,0],
    'Whole Milk': [0,1], 'Premium Rice': [1,1], 'Organic Tomatoes': [2,1]
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dept='all', query='', menuOpen=false, allProducts=false;
  const match = (v,q) => v.toLowerCase().includes(q.toLowerCase());
  const detailLink = p => '#/market/p/'+encodeURIComponent(p.id);
  const previewLink = item => '#/market/item/'+encodeURIComponent(item[0]);
  const categories = () => departments.map(([id,name,emoji]) =>
    '<button type="button" class="fm-category '+(dept===id?'selected':'')+'" data-dept="'+id+'" aria-pressed="'+(dept===id)+'"><span class="fm-category-emoji fm-category-photo fm-category-photo--'+id+'" aria-hidden="true"><span class="fm-category-fallback">'+emoji+'</span></span><strong>'+name+'</strong></button>'
  ).join('');
  const dropdown = () => departments.map(([id,name,emoji]) =>
    '<button type="button" data-dept="'+id+'"><span aria-hidden="true">'+emoji+'</span> '+name+'</button>'
  ).join('');
  function electronicCard(p) {
    const soon = S.comingSoon(p);
    const price = soon ? '' : S.money(S.promoPrice(p).price);
    return '<article class="fm-product-card">'+
      '<a class="fm-product-photo" href="'+detailLink(p)+'" aria-label="View '+esc(p.name)+'">'+Art.product(p,0)+'</a>'+
      '<div class="fm-product-info"><small>'+esc(p.store)+'</small><h3><a href="'+detailLink(p)+'">'+esc(p.name)+'</a></h3>'+
      '<div class="fm-product-bottom">'+(price?'<strong>'+esc(price)+'</strong>':'')+
      (soon ? '<a class="fm-view-details" href="'+detailLink(p)+'">View details →</a>' : '<button type="button" class="fm-plus" data-market-add="'+esc(p.id)+'" aria-label="Add '+esc(p.name)+' to cart">+</button>')+
      '</div></div></article>';
  }
  function previewCard(p) {
    const category = Object.entries(previews).find(([,items])=>items.some(x=>x[0]===p[0]))?.[0] || 'catalog';
    const cell = PACKSHOT_CELLS[p[0]];
    const photo = PREVIEW_PHOTOS[p[0]];
    const picture = cell
      ? '<span class="fm-sprite-photo fm-sprite-'+cell[0]+'-'+cell[1]+'" role="img" aria-label="'+esc(p[0])+'"></span>'
      : photo ? '<img class="fm-preview-photo" src="'+esc(photo)+'" alt="'+esc(p[0])+'" loading="lazy" decoding="async">' : '';
    return '<article class="fm-product-card fm-product-card--preview">'+
      '<a class="fm-product-photo" href="'+previewLink(p)+'" aria-label="View '+esc(p[0])+' details"><span class="fm-preview-emoji" aria-hidden="true">'+p[1]+'</span>'+picture+'</a>'+
      '<div class="fm-product-info"><small>'+esc(category.charAt(0).toUpperCase()+category.slice(1))+'</small><h3><a href="'+previewLink(p)+'">'+esc(p[0])+'</a></h3></div></article>';
  }
  function mainProducts() {
    const q=query.trim();
    let real=products.filter(p=>dept==='all'||dept==='electronics');
    if(q) real=real.filter(p=>match([p.name,p.store,p.category,...(p.tags||[])].join(' '),q));
    let planned = (dept==='all' ? Object.values(previews).flat() : (previews[dept]||[]));
    if(q) planned=planned.filter(p=>match(p[0],q));
    let cards='';
    if(dept==='all' || dept==='electronics') cards+=real.slice(0,(q||allProducts)?60:10).map(electronicCard).join('');
    if(dept!=='electronics') cards+=planned.slice(0,(q||allProducts)?60:(dept==='all'?6:15)).map(previewCard).join('');
    const heading=q?'Search results':dept==='all'?'Popular Products':departments.find(d=>d[0]===dept)?.[1]||'Products';
    return '<section class="fm-products" id="fmProducts"><div class="fm-section-header"><div><h2>'+esc(heading)+'</h2>'+
      '<p>'+ (dept==='all'?'Explore Luxora products and categories':'Products from your selected department')+'</p></div><a href="#/market" data-market-all>View All <span aria-hidden="true">→</span></a></div>'+
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
          '<a href="#/market" data-market-browse>Shop</a><div class="fm-dropdown-wrap"><button type="button" id="fmMenuToggle" aria-expanded="'+menuOpen+'" aria-controls="fmDropdown">Categories <span aria-hidden="true">⌄</span></button>'+
          '<div class="fm-dropdown" id="fmDropdown" '+(menuOpen?'':'hidden')+'>'+dropdown()+'</div></div>'+
          '<a href="#/shop?cat=deals">Sale</a><a href="#/info">About</a></nav>'+
          '<nav class="fm-secondary" aria-label="Support menu"><a href="privacy.html">Policy</a><a href="#/help">FAQs</a><a href="#/help">ⓘ &nbsp;Help &amp; Support</a></nav>'+
        '</div></div></header>'+
        '<main class="fm-container">'+
          (home?'<section class="fm-hero" aria-label="Luxora grocery shopping promotional design"><img class="fm-hero-artwork" src="assets/luxora-reference-hero-hq.webp" alt="Luxora banner showing a shopper carrying bags of groceries, large lime-green Luxora lettering and a Fresh Vegetables promotional card"><a href="#/market" data-market-browse class="fm-hero-shop" aria-label="Shop products now"><span class="sr-only">Shop Now</span></a></section>'+
          '<div class="fm-benefits" aria-label="Shopping highlights">'+
            '<div><span>✿</span><strong>Peak Quality</strong><small>Explore curated products</small></div>'+
            '<div><span>▣</span><strong>New Products</strong><small>Discover new arrivals</small></div>'+
            '<div><span>♧</span><strong>Flash Savings</strong><small>See current deals</small></div>'+
            '<div><span>▧</span><strong>Delivery Pass</strong><small>Delivery information</small></div>'+
            '<div><span>♨</span><strong>Prepared Meals</strong><small>Explore categories</small></div>'+
          '</div><p class="fm-concept-note">Design preview: same-day delivery and grocery sales are not active. Checkout for existing items is in test mode.</p>':'')+
          '<section class="fm-categories" id="marketBrowse"><div class="fm-section-header"><div><h2>Shop by Category</h2><p>Find exactly what you need</p></div></div><div class="fm-category-list">'+categories()+'</div></section>'+
          mainProducts()+
        '</main>'+
        '<footer class="fm-footer"><span class="fm-footer-logo">Luxora</span><span>Online shopping demo · Checkout uses test payments · No real delivery orders</span><a href="#/assistant">Luxora AI</a></footer>'+
      '</div>';
    window.LuxoraMarketDetails?.render(root,{
      products,previews,packshots:PACKSHOT_CELLS,photos:PREVIEW_PHOTOS,store:S,art:Art
    });
    badgeCount();
  }
  function message(t) {
    const old=document.getElementById('fmToast');old?.remove();
    const el=document.createElement('div');el.id='fmToast';el.className='fm-toast';el.setAttribute('role','status');el.textContent=t;document.body.appendChild(el);
    setTimeout(()=>el.remove(),2600);
  }
  root.addEventListener('click',event=>{
    const selected=event.target.closest('[data-dept]');
    if(selected){dept=selected.dataset.dept;query='';menuOpen=false;allProducts=false;
      if(location.hash.startsWith('#/market/'))location.hash='#/market';
      render();root.querySelector('#fmProducts')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(event.target.closest('[data-market-home]')){dept='all';query='';menuOpen=false;allProducts=false;render();document.getElementById('viewMarket').scrollTop=0;return;}
    if(event.target.closest('[data-market-browse]')){
      event.preventDefault();dept='all';query='';menuOpen=false;allProducts=false;
      if(location.hash.startsWith('#/market/'))location.hash='#/market';
      render();root.querySelector('#fmProducts')?.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
    if(event.target.closest('[data-market-all]')){
      event.preventDefault();dept='all';query='';menuOpen=false;allProducts=true;
      if(location.hash.startsWith('#/market/'))location.hash='#/market';
      render();root.querySelector('#fmProducts')?.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
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
    query=root.querySelector('#marketQuery').value.trim();dept='all';menuOpen=false;allProducts=false;
    if(location.hash.startsWith('#/market/'))location.hash='#/market';
    render();root.querySelector('#fmProducts')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  // If an external photo fails, show the existing product emoji instead of a broken image.
  root.addEventListener('error', e=>{
    if(e.target instanceof HTMLImageElement && e.target.classList.contains('fm-preview-photo')) e.target.hidden=true;
  }, true);
  document.addEventListener('luxora:change',badgeCount);
  // Restore recognizable icons if the local category artwork cannot load.
  const categoryArtwork = new Image();
  categoryArtwork.onerror = () => root.classList.add('fm-category-art-failed');
  categoryArtwork.src = 'assets/luxora-category-studio.webp';
  window.LuxoraMarket={show:render};
  render();
})();