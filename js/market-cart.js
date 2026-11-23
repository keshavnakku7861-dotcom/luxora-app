/* Shopping cart for the redesigned Luxora storefront.
   Uses the same cart and Worker-backed price catalog as the existing shop.
   The only checkout link opens the existing standalone Stripe TEST checkout. */
(() => {
  'use strict';
  let model = null, bound = false, rootRef = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const inCart = () => location.hash.split('?')[0] === '#/market/cart';
  const money = n => model.store.money(n);
  function page() {
    const {store:S,art:Art} = model;
    const changes = S.reprice(); // Clamp quantities and revalidate choices against Worker price catalog.
    const items = S.cart();
    const quote = S.quote('standard');
    document.title='Your Cart | Luxora';
    const notices=changes.length ? '<div class="fm-cart-alert" role="status">'+
      '<strong>Your cart was updated:</strong> '+
      changes.map(c=>'<span>'+esc(c.message)+'</span>').join(' ')+'</div>':'';
    if(!items.length) return '<section class="fm-cart-page">'+
      '<nav class="fm-detail-crumb" aria-label="Breadcrumb"><a href="#/market">← Continue Shopping</a></nav>'+
      '<div class="fm-cart-header"><h1>Your Cart</h1><p>0 items</p></div>'+notices+
      '<div class="fm-cart-empty"><div class="fm-cart-empty-icon" aria-hidden="true">🛒</div>'+
      '<h2>Your cart is empty</h2><p>Explore Luxora and add something you like.</p>'+
      '<a class="fm-cart-shop" href="#/market">Start Shopping <span aria-hidden="true">→</span></a></div></section>';
    const rows=items.map((line,idx)=>{
      const p=S.resolve(line);
      const info=S.info(line);
      const unit=info.price, total=unit*line.qty;
      const image=p ? Art.product(p,0): '<div class="fm-cart-noimage" aria-hidden="true">▣</div>';
      const options=[line.color&&p?S.colorName(p,line.color):'',line.size&&line.size!=='One size'?line.size:''].filter(Boolean).map(esc).join(' · ');
      return '<article class="fm-cart-item">'+
        '<a class="fm-cart-photo" href="#/market/p/'+encodeURIComponent(line.id)+'" aria-label="View '+esc(info.name)+'">'+image+'</a>'+
        '<div class="fm-cart-item-details"><p class="fm-cart-brand">'+esc(info.store)+'</p>'+
        '<h2><a href="#/market/p/'+encodeURIComponent(line.id)+'">'+esc(info.name)+'</a></h2>'+
        (options?'<p class="fm-cart-options">'+options+'</p>':'')+
        '<button class="fm-cart-remove" type="button" data-fm-cart-remove="'+idx+'" aria-label="Remove '+esc(info.name)+'">Remove</button></div>'+
        '<div class="fm-cart-item-actions"><strong class="fm-cart-item-price">'+esc(money(total))+'</strong>'+
        '<span class="fm-cart-unit">'+esc(money(unit))+' each</span>'+
        '<div class="fm-cart-quantity" role="group" aria-label="Quantity for '+esc(info.name)+'">'+
        '<button type="button" data-fm-cart-dec="'+idx+'" aria-label="Decrease quantity of '+esc(info.name)+'" '+(line.qty<=1?'disabled':'')+'>−</button>'+
        '<span aria-live="polite">'+line.qty+'</span>'+
        '<button type="button" data-fm-cart-inc="'+idx+'" aria-label="Increase quantity of '+esc(info.name)+'" '+(line.qty>=9?'disabled':'')+'>+</button></div></div></article>';
    }).join('');
    const count=S.count();
    const sub=quote.subtotalCents/100, ship=quote.shippingCents/100, total=quote.totalCents/100;
    const discount=quote.discountCents/100;
    const labels=[
      '<div class="fm-cart-summary-row"><span>Subtotal ('+count+' '+(count===1?'item':'items')+')</span><strong>'+esc(money(sub))+'</strong></div>',
      discount>0?'<div class="fm-cart-summary-row"><span>Promo savings</span><strong>−'+esc(money(discount))+'</strong></div>':'',
      '<div class="fm-cart-summary-row"><span>Estimated standard shipping</span><strong>'+(ship===0?'Free':esc(money(ship)))+'</strong></div>',
      '<div class="fm-cart-summary-total"><span>Estimated total</span><strong>'+esc(money(total))+'</strong></div>'
    ].join('');
    return '<section class="fm-cart-page">'+
      '<nav class="fm-detail-crumb" aria-label="Breadcrumb"><a href="#/market">← Continue Shopping</a></nav>'+
      '<div class="fm-cart-header"><h1>Your Cart</h1><p>'+count+' '+(count===1?'item':'items')+' in your cart</p></div>'+
      notices+
      '<div class="fm-cart-layout"><div class="fm-cart-items">'+rows+'</div>'+
      '<aside class="fm-cart-summary" aria-label="Order summary"><h2>Order Summary</h2>'+
      labels+
      '<button type="button" data-fm-cart-checkout class="fm-cart-checkout" '+(!quote.ok?'disabled':'')+'>Proceed to Test Checkout <span aria-hidden="true">→</span></button>'+
      (!quote.ok?'<p class="fm-cart-error">The cart must contain valid items before checkout.</p>':'')+
      '<p class="fm-cart-disclosure">Checkout runs in Stripe test mode. No real money is charged and no order is delivered.</p>'+
      '<p class="fm-cart-checkout-fallback" id="fmCartCheckoutFallback" hidden>Continue to the secure test checkout: <a href="checkout.html?src=cart" target="_blank" rel="noopener noreferrer">Open Test Checkout</a></p>'+
      '</aside></div></section>';
  }
  function rerender() {
    if(!rootRef || !inCart()) return;
    const container=rootRef.querySelector('.fm-container');
    if(container)container.innerHTML=page();
    const badge=model.store.count();
    rootRef.querySelectorAll('[data-cart-badge]').forEach(node=>{node.textContent=badge;node.hidden=!badge;});
  }
  function proceed(trigger) {
    const S=model.store;
    if(!S.cart().length || !S.quote('standard').ok)return;
    const url='checkout.html?src=cart';
    function open() {
      let tab=null;
      try {tab=window.open(url,'_blank');if(tab)tab.opener=null;} catch {}
      if(!tab){
        const fallback=rootRef.querySelector('#fmCartCheckoutFallback');
        if(fallback)fallback.hidden=false;
      }
    }
    const A=window.LuxoraAuth;
    if(A && typeof A.requireAccount==='function') A.requireAccount(trigger,()=>open());
    else open();
  }
  function attach(root) {
    rootRef=root;
    if(bound)return;
    bound=true;
    root.addEventListener('click',event=>{
      if(!inCart())return;
      const el=event.target.closest('[data-fm-cart-inc],[data-fm-cart-dec],[data-fm-cart-remove],[data-fm-cart-checkout]');
      if(!el)return;
      const S=model.store;
      if(el.hasAttribute('data-fm-cart-checkout')){proceed(el);return;}
      const attr=el.hasAttribute('data-fm-cart-remove')?'data-fm-cart-remove':el.hasAttribute('data-fm-cart-inc')?'data-fm-cart-inc':'data-fm-cart-dec';
      const index=Number(el.getAttribute(attr)),lines=S.cart();
      if(!Number.isInteger(index)||index<0||index>=lines.length)return;
      if(attr==='data-fm-cart-remove') S.removeLine(index);
      else if(attr==='data-fm-cart-inc' && lines[index].qty<9) S.setQty(index,lines[index].qty+1);
      else if(attr==='data-fm-cart-dec' && lines[index].qty>1) S.setQty(index,lines[index].qty-1);
      rerender();
    });
    // Update an open new-style cart if another part of Luxora changes it.
    document.addEventListener('luxora:external',rerender);
  }
  window.LuxoraMarketCart={
    render(root,data){model=data;attach(root);return page();},
    refresh:rerender
  };
})();