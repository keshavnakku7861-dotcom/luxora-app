/* Product details inside the redesigned Luxora marketplace.
   This is a visual-only page for preview departments and a test-cart page
   for products explicitly allowed by LuxoraStore. No legacy #/shop/p routes. */
(function () {
  'use strict';
  let model = null, wasDetail = false, catalogScroll = 0, listenersAttached = false;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function selected() {
    const path = (location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/');
    if(path[0] !== 'market') return null;
    if(path[1] === 'sale' || path[1] === 'about') return {kind:path[1]};
    if(!['p','item'].includes(path[1]) || !path[2]) return null;
    let key;
    try { key = decodeURIComponent(path.slice(2).join('/')); } catch { return {kind:'missing'}; }
    if (path[1] === 'p') {
      const item = model.products.find(p => p.id === key);
      return item ? {kind:'product',item} : {kind:'missing'};
    }
    for (const [category,items] of Object.entries(model.previews)) {
      const item = items.find(p => p[0] === key);
      if (item) return {kind:'preview',item,category};
    }
    return {kind:'missing'};
  }
  function pictureForPreview(item) {
    const cell = model.packshots[item[0]];
    if (cell) return '<span class="fm-preview-emoji" aria-hidden="true">'+item[1]+'</span>'+
      '<span class="fm-sprite-photo fm-sprite-'+cell[0]+'-'+cell[1]+'" role="img" aria-label="'+esc(item[0])+'"></span>';
    const photo=model.photos[item[0]];
    return '<span class="fm-preview-emoji" aria-hidden="true">'+item[1]+'</span>'+
      (photo ? '<img class="fm-preview-photo" src="'+esc(photo)+'" alt="'+esc(item[0])+'" loading="lazy" decoding="async">' : '');
  }
  function salePage() {
    const {store:S,art:Art}=model;
    // Limit sale claims to products with a higher recorded list price than the current checkout price.
    const deals=model.products.filter(p=>{
      if(S.comingSoon(p))return false;
      const list=Number(p.listPrice), current=S.promoPrice(p).price;
      return Number.isFinite(list)&&list>0&&Number.isFinite(current)&&current<list;
    });
    const cards=deals.map(p=>{
      const price=S.promoPrice(p).price, old=Number(p.listPrice);
      return '<article class="fm-product-card">'+
        '<a class="fm-product-photo" href="#/market/p/'+encodeURIComponent(p.id)+'" aria-label="View '+esc(p.name)+'">'+Art.product(p,0)+'</a>'+
        '<div class="fm-product-info"><small>'+esc(p.store)+'</small>'+
        '<h3><a href="#/market/p/'+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3>'+
        '<div class="fm-product-bottom"><strong>'+esc(S.money(price))+'</strong>'+
        '<del class="fm-sale-old">'+esc(S.money(old))+'</del></div></div></article>';
    }).join('');
    document.title='Sale | Luxora';
    return '<section class="fm-subpage fm-sale-page">'+
      '<nav class="fm-detail-crumb"><a href="#/market">← Back to shopping</a></nav>'+
      '<h1>Sale</h1><p class="fm-subpage-lead">Browse discounted products in the Luxora demo catalog.</p>'+
      (deals.length?'<div class="fm-products-grid">'+cards+'</div>':
       '<div class="fm-subpage-empty"><h2>No current catalog discounts</h2><p>Browse the full selection instead.</p><a href="#/market">Browse products</a></div>')+
      '<p class="fm-detail-muted">These are catalog prices, not live retailer offers. Prices and availability may change. Checkout remains in test mode.</p>'+
      '</section>';
  }
  function aboutPage() {
    document.title='About | Luxora';
    return '<section class="fm-subpage fm-about-page">'+
      '<nav class="fm-detail-crumb"><a href="#/market">← Back to shopping</a></nav>'+
      '<div class="fm-about-panel"><p class="fm-about-kicker">ABOUT LUXORA</p>'+
      '<h1>Shopping made simpler.</h1>'+
      '<p class="fm-subpage-lead">Luxora brings products from multiple categories together in one clean shopping experience.</p>'+
      '<p>Explore electronics, browse grocery and lifestyle collections, and find product information in a modern, easy-to-use store.</p>'+
      '<p>Luxora is currently a shopping-app demo. Some categories use illustrative images and do not yet offer ordering. The existing checkout uses test payments; no real orders or deliveries are placed.</p>'+
      '<a class="fm-about-shop" href="#/market">Explore products <span aria-hidden="true">→</span></a>'+
      '</div></section>';
  }
  function productDetails(sel) {
    if (sel.kind === 'missing') return '<section class="fm-detail-missing"><h1>Product not found</h1><p><a href="#/market">← Back to shopping</a></p></section>';
    const {store:S,art:Art}=model;
    const live=sel.kind==='product', p=sel.item;
    const name=live ? p.name : p[0];
    const category=live ? p.store || 'Electronics' : sel.category[0].toUpperCase()+sel.category.slice(1);
    const photo=live ? Art.product(p,0) : pictureForPreview(p);
    let info='';
    if (live) {
      const noCheckout=S.comingSoon(p);
      const color=(p.colors||[])[0];
      const price=noCheckout?'':'<p class="fm-detail-price" id="fmDetailPrice">'+esc(S.money(S.promoPrice(p,color).price))+'</p>';
      const desc=p.description ? '<p class="fm-detail-description">'+esc(p.description)+'</p>' : '';
      const highlights=(p.highlights||[]).slice(0,5);
      const featureList=highlights.length ? '<ul class="fm-detail-highlights">'+highlights.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>' : '';
      const colors=!noCheckout && (p.colors||[]).length>1 ?
        '<label class="fm-detail-label">Finish<select id="fmDetailColor">'+p.colors.map(v=>'<option value="'+esc(v)+'">'+esc(S.colorName(p,v))+'</option>').join('')+'</select></label>' : '';
      const sizes=!noCheckout && S.needsSize(p) ?
        '<label class="fm-detail-label">Size<select id="fmDetailSize" required><option value="">Choose size</option>'+
        S.sellableSizes(p).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'</select></label>' : '';
      const controls=noCheckout?'<p class="fm-detail-muted">This product is for browsing only. Ordering is not enabled.</p>':
        '<div class="fm-detail-options">'+colors+sizes+
        '<label class="fm-detail-label fm-detail-qty">Quantity<select id="fmDetailQty">'+
        Array.from({length:9},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('')+
        '</select></label></div>'+
        '<button type="button" class="fm-detail-add" data-fm-detail-add="'+esc(p.id)+'">Add to Cart <span aria-hidden="true">→</span></button>'+
        '<p class="fm-detail-muted">Luxora checkout is in test mode. No real payment or delivery.</p>';
      info=price+desc+featureList+controls;
    } else {
      info='<p class="fm-detail-description">'+esc(name)+' — explore this category in Luxora.</p>'+
        '<p class="fm-detail-muted">Illustrative product image. Pricing, stock, and ordering are not yet configured for this category.</p>';
    }
    document.title=name+' | Luxora';
    return '<section class="fm-detail" aria-label="'+esc(name)+'">'+
      '<nav class="fm-detail-crumb" aria-label="Breadcrumb"><a href="#/market">← Back to products</a><span>/</span><span>'+esc(category)+'</span></nav>'+
      '<div class="fm-detail-layout"><div class="fm-detail-image '+(live?'fm-detail-image--live':'fm-detail-image--preview')+'">'+photo+'</div>'+
      '<div class="fm-detail-copy"><p class="fm-detail-category">'+esc(category)+'</p><h1>'+esc(name)+'</h1>'+info+'</div></div></section>';
  }
  function notify(text) {
    document.getElementById('fmProductToast')?.remove();
    const el=document.createElement('div');
    el.className='fm-toast';el.id='fmProductToast';el.setAttribute('role','status');el.textContent=text;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),2600);
  }
  function attach(root) {
    if (listenersAttached) return;
    listenersAttached=true;
    root.addEventListener('click',event=>{
      const btn=event.target.closest('[data-fm-detail-add]');
      if(!btn)return;
      const {store:S}=model;
      const item=model.products.find(p=>p.id===btn.dataset.fmDetailAdd);
      if(!item || S.comingSoon(item)) return;
      const size=root.querySelector('#fmDetailSize')?.value;
      if(S.needsSize(item) && !size) {notify('Select a size before adding to cart.');root.querySelector('#fmDetailSize')?.focus();return;}
      const color=root.querySelector('#fmDetailColor')?.value || (item.colors||[])[0];
      const qty=Number(root.querySelector('#fmDetailQty')?.value)||1;
      const added=S.addToCart(item,{color,size,qty});
      notify(added?item.name+' added to cart':'This product cannot be added to cart.');
      if(added)root.querySelectorAll('[data-cart-badge]').forEach(b=>{const count=S.count();b.textContent=String(count);b.hidden=!count;});
    });
    root.addEventListener('change',event=>{
      if(event.target.id!=='fmDetailColor')return;
      const sel=selected();
      if(!sel || sel.kind!=='product')return;
      const {store:S,art:Art}=model;
      const c=event.target.value, item=sel.item;
      const price=root.querySelector('#fmDetailPrice');
      if(price)price.textContent=S.money(S.promoPrice(item,c).price);
      const img=root.querySelector('.fm-detail-image--live');
      if(img)img.innerHTML=Art.product(S.variant(item,c),0);
    });
  }
  window.LuxoraMarketDetails={
    render(root,data) {
      model=data;
      attach(root);
      const sel=selected(), view=document.getElementById('viewMarket');
      if(sel && !wasDetail)catalogScroll=view.scrollTop;
      if(sel) {
        const content=sel.kind==='sale'?salePage():sel.kind==='about'?aboutPage():productDetails(sel);
        root.querySelector('.fm-container').innerHTML=content;
        view.scrollTop=0;
      } else if(wasDetail) {
        view.scrollTop=catalogScroll;
      }
      wasDetail=!!sel;
    }
  };
})();