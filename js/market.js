/* Luxora Market — visual storefront modeled on GreatStack's InstantMart tutorial.
   Existing catalog items use LuxoraStore's price allowlist and Stripe TEST checkout.
   Other departments are clearly labeled previews; no invented prices or orders. */
(function () {
  const root = document.getElementById('marketRoot');
  if (!root) return;
  const S = window.LuxoraStore;
  const Art = window.LuxoraArt;
  const products = [...(window.LuxoraOffline && window.LuxoraOffline.products || []), ...(window.LuxoraOffline && window.LuxoraOffline.drops || [])];
  const depts = [
    { id:'groceries', name:'Groceries', emoji:'🥑' },
    { id:'electronics', name:'Electronics', emoji:'🎧' },
    { id:'fashion', name:'Fashion', emoji:'👕' },
    { id:'home', name:'Home & Living', emoji:'🛋️' },
    { id:'beauty', name:'Beauty', emoji:'🧴' },
    { id:'sports', name:'Sports', emoji:'⚽' },
    { id:'toys', name:'Toys & Games', emoji:'🧸' },
    { id:'books', name:'Books', emoji:'📚' }
  ];
  /* Illustrative collections only. No payment is possible until the seller's inventory,
     official price catalog, stock, and fulfillment support are configured. */
  const previews = {
    groceries: [['Fresh Avocados','🥑'],['Strawberries','🍓'],['Bananas','🍌'],['Fresh Milk','🥛'],['Artisan Bread','🍞'],['Carrots','🥕']],
    fashion: [['Everyday T-Shirts','👕'],['Casual Sneakers','👟'],['Denim Collection','👖'],['Handbags','👜'],['Summer Dresses','👗']],
    home: [['Modern Sofa','🛋️'],['Table Lighting','💡'],['Home Plants','🪴'],['Dining Essentials','🍽️'],['Bed Linen','🛏️']],
    beauty: [['Skincare Essentials','🧴'],['Beauty Sets','💄'],['Fragrance','🌸'],['Self Care','🧼']],
    sports: [['Soccer Equipment','⚽'],['Basketball','🏀'],['Running Shoes','👟'],['Yoga & Fitness','🧘']],
    toys: [['Building Blocks','🧱'],['Plush Toys','🧸'],['Toy Vehicles','🚗'],['Puzzles','🧩']],
    books: [['Books & Reading','📚'],['Notebooks','📓'],['Art Supplies','🎨'],['School Essentials','🎒']]
  };
  const escapeHTML = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let active = 'all', search = '';
  const isElectronics = id => ['smart-rings','smartwatches','earbuds','headphones','tablets','e-readers','smart-home','luxora-originals'].includes(id);
  const eligible = p => isElectronics(p.category);
  const match = (name,term) => name.toLowerCase().includes(term.toLowerCase().trim());
  function categoryCards() {
    return depts.map(d => '<button type="button" class="market-category" data-dept="'+d.id+'" aria-pressed="'+(active===d.id)+'"><span class="market-category-icon" aria-hidden="true">'+d.emoji+'</span><strong>'+escapeHTML(d.name)+'</strong></button>').join('');
  }
  function realCard(p) {
    const soon = S.comingSoon(p);
    const price = soon ? 'Coming soon' : S.money(S.promoPrice(p).price);
    return '<article class="market-card">' +
      '<a class="market-card-image" href="#/shop/p/'+encodeURIComponent(p.id)+'" aria-label="View '+escapeHTML(p.name)+'">'+Art.product(p,0)+'</a>' +
      '<small style="padding-top:12px">'+escapeHTML(p.store)+'</small>' +
      '<h3><a href="#/shop/p/'+encodeURIComponent(p.id)+'">'+escapeHTML(p.name)+'</a></h3>'+
      '<small>'+(soon?'Product preview':escapeHTML(S.checked(p)))+'</small>'+
      '<div class="market-card-bottom"><span class="market-price">'+price+'</span>'+
      (soon ? '<button type="button" disabled class="market-add" aria-label="Coming soon">·</button>' : '<button type="button" data-market-add="'+escapeHTML(p.id)+'" class="market-add" aria-label="Add '+escapeHTML(p.name)+' to cart">+</button>')+
      '</div></article>';
  }
  function previewCard(item) {
    return '<article class="market-card"><div class="market-card-image"><span class="market-emoji" role="img" aria-label="'+escapeHTML(item[0])+'">'+item[1]+'</span></div>'+
      '<span class="market-label">Coming soon</span><h3>'+escapeHTML(item[0])+'</h3>'+
      '<small>Catalog preview — not yet for sale</small>'+
      '<div class="market-card-bottom"><span class="market-price">Price to be announced</span><button type="button" class="market-add" disabled aria-label="Not available">·</button></div></article>';
  }
  function heading(title,desc,extra) {
    return '<div class="market-heading"><div><h2>'+title+'</h2><p>'+desc+'</p></div>'+(extra||'')+'</div>';
  }
  function productSection() {
    const term=search.trim();
    let list = products.filter(eligible);
    if (term) list = list.filter(p=>match([p.name,p.store,p.category,(p.tags||[]).join(' ')].join(' '),term));
    const allPreviews = Object.values(previews).flat();
    if (active==='all' || active==='electronics') {
      const samples = term && active==='all' ? allPreviews.filter(p=>match(p[0],term)) : [];
      const title = term?'Search results':'Popular Electronics';
      const description = term ? 'Available electronics and clearly marked upcoming products' : 'Shop the electronics already listed in Luxora';
      const content = list.slice(0,active==='all'&&!term?10:25).map(realCard).join('') +
        samples.map(previewCard).join('');
      return '<section class="market-section" id="marketProducts">'+heading(title,description,'<a href="#/shop">View all available electronics →</a>')+
        '<div class="market-grid">'+(content || '<div class="market-empty"><h3>No products found</h3><p>Try a different search or department.</p></div>')+'</div></section>';
    }
    const selection = (previews[active]||[]).filter(p=>!term || match(p[0],term));
    const title = depts.find(d=>d.id===active)?.name || 'Coming soon';
    return '<section class="market-section" id="marketProducts">'+heading(escapeHTML(title), 'A preview of upcoming Luxora departments. Items here are not available for checkout.')+
      '<div class="market-grid">'+(selection.length?selection.map(previewCard).join(''):'<div class="market-empty"><h3>No preview items matched</h3><p>Try another search or department.</p></div>')+'</div></section>';
  }
  function render() {
    const home=active==='all';
    root.innerHTML =
      '<div class="market-promo">The new Luxora marketplace is in preview • Existing checkout remains in TEST mode • No real orders or deliveries</div>'+
      '<header class="market-header"><div class="market-nav">'+
        '<a href="#/market" data-market-home class="market-brand"><span class="market-brand-mark" aria-hidden="true">✦</span>Luxora</a>'+
        '<nav class="market-links" aria-label="Shop navigation"><a href="#/market" data-market-home>Home</a><a href="#/shop">Products</a><a class="sale" href="#/shop?cat=deals">Deals</a></nav>'+
        '<form class="market-search" id="marketSearch" role="search"><button aria-label="Search">⌕</button><label class="sr-only" for="marketQuery">Search products</label><input id="marketQuery" type="search" placeholder="Search for anything..." value="'+escapeHTML(search)+'"></form>'+
        '<div class="market-actions"><a class="market-action ai" href="#/assistant" title="Ask Luxora AI">✧ <span>Ask AI</span></a><a class="market-action" href="#/saved" title="Saved">♡</a><a class="market-action" href="#/cart" title="Open cart">🛒 <span data-cart-badge hidden>0</span></a><button type="button" data-signin class="market-action" title="Sign in">♙</button></div>'+
      '</div></header>'+
      '<main class="market-wrap">'+
        (home ?
        '<section class="market-hero" aria-label="Shopping at Luxora"><div class="market-hero-content"><span class="market-hero-kicker">✦ Great finds for every day</span><h1>Everything you love,<br><em>all in one place</em></h1><p>Discover groceries, electronics, style and home essentials at Luxora. Shop available electronics now and explore upcoming departments.</p><div class="market-hero-buttons"><a href="#/shop">Shop Now →</a><a href="#/market" data-market-browse>Browse Categories</a></div></div><div class="market-hero-art" aria-hidden="true"><span class="food">🥑</span><span class="food">🍊</span><span class="food">🛍️</span></div></section>'+
        '<section class="market-features" aria-label="Luxora advantages"><div class="market-feature"><span class="market-feature-icon">🛍️</span><div><strong>Shop more categories</strong><p>Electronics now, more on the way</p></div></div><div class="market-feature"><span class="market-feature-icon">✨</span><div><strong>AI shopping help</strong><p>Ask Luxora for recommendations</p></div></div><div class="market-feature"><span class="market-feature-icon">♡</span><div><strong>Save your favorites</strong><p>Keep products in one place</p></div></div><div class="market-feature"><span class="market-feature-icon">🔒</span><div><strong>Test checkout</strong><p>Try the shopping flow safely</p></div></div></section>'
        : '')+
        '<section class="market-section" id="marketBrowse">'+heading('Browse Categories','Find exactly what you need in one place')+'<div class="market-categories">'+categoryCards()+'</div></section>'+
        productSection()+
        (home?'<section class="market-section">'+heading('Fresh Grocery Essentials','A first look at the groceries planned for Luxora','<button type="button" data-dept="groceries">Explore groceries →</button>')+'<div class="market-grid">'+previews.groceries.slice(0,5).map(previewCard).join('')+'</div></section>':'')+
        '<section class="market-banner"><div><h2>A smarter way to shop</h2><p>Luxora AI can help compare the electronics we currently list. Grocery and other categories will be added when suppliers, inventory, pricing and delivery are ready.</p></div><a href="#/assistant">Explore Luxora AI →</a></section>'+
      '</main><footer class="market-bottom"><strong>✦ Luxora</strong><p>Marketplace design preview. Existing electronics can be explored; new categories are coming soon. Stripe checkout is in test mode.</p></footer>';
    if (S && S.count) {root.querySelectorAll('[data-cart-badge]').forEach(b=>{const n=S.count();b.textContent=String(n);b.hidden=!n;});}
  }
  root.addEventListener('click',e=>{
    const dep=e.target.closest('[data-dept]');
    if(dep){active=dep.dataset.dept;search='';render();document.getElementById('viewMarket').scrollTop=0;return;}
    if(e.target.closest('[data-market-home]')) {active='all';search='';render();document.getElementById('viewMarket').scrollTop=0;return;}
    if(e.target.closest('[data-market-browse]')) {e.preventDefault();root.querySelector('#marketBrowse')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    const add=e.target.closest('[data-market-add]');
    if(add) {
      const p=products.find(v=>v.id===add.dataset.marketAdd);
      if(!p) return;
      if(S.needsSize(p)){location.hash='#/shop/p/'+encodeURIComponent(p.id);return;}
      const line=S.addToCart(p);
      notice(line ? p.name+' added to cart':'This item cannot be purchased through Luxora yet');
      root.querySelectorAll('[data-cart-badge]').forEach(b=>{const n=S.count();b.textContent=String(n);b.hidden=!n;});
    }
  });
  root.addEventListener('submit',e=>{
    if(e.target.id!=='marketSearch') return;
    e.preventDefault();
    search=root.querySelector('#marketQuery').value.trim();
    active='all';
    render();
    root.querySelector('#marketProducts')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  function notice(msg) {
    const old=document.getElementById('marketToast');if(old)old.remove();
    const el=document.createElement('div');el.id='marketToast';el.className='market-toast';el.setAttribute('role','status');el.textContent=msg;document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }
  document.addEventListener('luxora:change',()=>root.querySelectorAll('[data-cart-badge]').forEach(b=>{const n=S.count();b.textContent=String(n);b.hidden=!n;}));
  window.LuxoraMarket = {show:render};
  render();
})();