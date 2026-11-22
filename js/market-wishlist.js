/* Luxora marketplace wishlist — uses the original luxora.saved data, but
   every interaction stays within the redesigned #/market/... storefront. */
(() => {
  'use strict';
  let model=null, root=null, attached=false;
  const esc = value => String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isWishlist=()=>location.hash.split('?')[0]==='#/market/wishlist';
  const money=n=>model.store.money(n);
  const detail=id=>'#/market/p/'+encodeURIComponent(id);
  function page() {
    const {store:S,art:Art,products}=model;
    document.title='Wishlist | Luxora';
    const productsById=Object.fromEntries(products.map(p=>[p.id,p]));
    const saved=S.saved().filter(item=>productsById[item.id]);
    const top='<section class="fm-wishlist-page" aria-label="Your wishlist">'+
      '<nav class="fm-detail-crumb" aria-label="Breadcrumb"><a href="#/market">← Continue Shopping</a></nav>'+
      '<div class="fm-cart-header"><h1>My Wishlist</h1><p>'+saved.length+' saved '+(saved.length===1?'item':'items')+'</p></div>';
    if(!saved.length) return top+
      '<div class="fm-cart-empty fm-wishlist-empty"><div class="fm-wishlist-empty-icon" aria-hidden="true">♡</div>'+
      '<h2>Your wishlist is empty</h2><p>Save products you love and find them here later.</p>'+
      '<a class="fm-cart-shop" href="#/market">Browse Products <span aria-hidden="true">→</span></a></div></section>';
    const cards=saved.map(item=>{
      const original=productsById[item.id];
      const p=S.variant(original,item.color);
      const info=S.info(item);
      const canPurchase=!S.comingSoon(p);
      const selectedSize=S.needsSize(p)&&S.validSize(p,item.size);
      const needsSize=canPurchase&&S.needsSize(p)&&!selectedSize;
      const label=canPurchase?(needsSize?'Choose Size':'Move to Cart'):'View Details';
      const destination=detail(item.id);
      const color=(item.color&&p.colors?.includes(item.color))?S.colorName(p,item.color):'';
      const options=[color,item.size&&item.size!=='One size'&&selectedSize?item.size:''].filter(Boolean).map(esc).join(' · ');
      return '<article class="fm-wishlist-item">'+
        '<a class="fm-wishlist-image" href="'+destination+'" aria-label="View '+esc(info.name)+'">'+Art.product({...p,name:info.name,imageId:info.imageId},0)+'</a>'+
        '<div class="fm-wishlist-item-text"><small>'+esc(info.store)+'</small>'+
        '<h2><a href="'+destination+'">'+esc(info.name)+'</a></h2>'+
        (options?'<p class="fm-wishlist-options">'+options+'</p>':'')+
        '<div class="fm-wishlist-price">'+(canPurchase?esc(money(info.price)):'Browse only')+'</div>'+
        '</div>'+
        '<div class="fm-wishlist-actions">'+
          (canPurchase?'<button class="fm-wishlist-move" type="button" data-fm-wish-move="'+esc(item.id)+'">'+label+' <span aria-hidden="true">→</span></button>':
           '<a class="fm-wishlist-move" href="'+destination+'">'+label+' <span aria-hidden="true">→</span></a>')+
          '<button type="button" class="fm-wishlist-remove" data-fm-wish-remove="'+esc(item.id)+'" aria-label="Remove '+esc(info.name)+' from wishlist">Remove</button>'+
        '</div></article>';
    }).join('');
    return top+'<div class="fm-wishlist-grid">'+cards+'</div></section>';
  }
  function renderPage() {
    if(!root||!isWishlist())return;
    const container=root.querySelector('.fm-container');
    if(container)container.innerHTML=page();
  }
  function notify(message) {
    document.getElementById('fmWishlistToast')?.remove();
    const div=document.createElement('div');
    div.id='fmWishlistToast';div.className='fm-toast';div.setAttribute('role','status');div.textContent=message;
    document.body.append(div);
    setTimeout(()=>div.remove(),2500);
  }
  function syncSaveButtons(id) {
    const on=model.store.isSaved(id);
    root.querySelectorAll('[data-fm-save]').forEach(b=>{
      if(b.dataset.fmSave!==id)return;
      b.setAttribute('aria-pressed',String(on));
      b.setAttribute('aria-label',(on?'Remove':'Save')+' '+(b.dataset.fmName||'product')+(on?' from':' to')+' wishlist');
      b.textContent=on?'♥':'♡';
    });
  }
  function move(id) {
    const {store:S,products}=model;
    const x=S.saved().find(item=>item.id===id);
    const original=products.find(p=>p.id===id);
    if(!x||!original)return;
    const p=S.variant(original,x.color);
    if(S.comingSoon(p)){notify('This product is available to browse only.');return;}
    if(S.needsSize(p)&&!S.validSize(p,x.size)) {
      location.hash=detail(id);
      notify('Choose a size on the product page to add this item to your cart.');
      return;
    }
    const added=S.addToCart(p,{size:x.size,color:x.color});
    if(!added){notify('This item could not be added to your cart.');return;}
    S.removeSaved(id);
    renderPage();
    notify('Moved '+p.name+' to your cart.');
  }
  function attach() {
    if(attached||!root)return;attached=true;
    root.addEventListener('click',event=>{
      const btn=event.target.closest('[data-fm-save]');
      if(btn) {
        const {store:S,products}=model;
        const p=products.find(x=>x.id===btn.dataset.fmSave);
        if(!p)return;
        const opts={
          color:root.querySelector('#fmDetailColor')?.value||(p.colors||[])[0],
          size:root.querySelector('#fmDetailSize')?.value||undefined
        };
        const nowSaved=S.toggleSaved(p,opts);
        syncSaveButtons(p.id);
        notify(nowSaved?p.name+' saved to wishlist':p.name+' removed from wishlist');
        return;
      }
      const remove=event.target.closest('[data-fm-wish-remove]');
      if(remove&&isWishlist()){
        model.store.removeSaved(remove.dataset.fmWishRemove);
        renderPage();
        notify('Removed from wishlist.');
        return;
      }
      const moveBtn=event.target.closest('[data-fm-wish-move]');
      if(moveBtn&&isWishlist())move(moveBtn.dataset.fmWishMove);
    });
    document.addEventListener('luxora:external',renderPage);
  }
  window.LuxoraMarketWishlist={
    render(view,data){root=view;model=data;attach();return page();},
    refresh:renderPage
  };
})();