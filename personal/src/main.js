(function(){
'use strict';
var modal=document.createElement('dialog');
modal.className='work-preview';modal.setAttribute('aria-label','作品预览');
modal.innerHTML='<header><h2></h2><button type="button" aria-label="关闭预览">关闭 ×</button></header><p class="preview-description"></p><div class="preview-content" data-lenis-prevent></div><a class="preview-original" target="_blank" rel="noopener">打开完整原件 ↗</a>';
document.body.appendChild(modal);
var opener;
function close(){modal.close();opener?.focus();}
modal.querySelector('button').onclick=close;
modal.addEventListener('click',function(e){if(e.target===modal)close();});
modal.addEventListener('close',function(){modal.querySelector('.preview-content').replaceChildren();});
var cursor=document.createElement('div');cursor.className='work-cursor';cursor.textContent='预览 ↗';cursor.setAttribute('aria-hidden','true');document.body.appendChild(cursor);
var moveX=window.gsap?gsap.quickTo(cursor,'x',{duration:.35,ease:'power2.out'}):null;
var moveY=window.gsap?gsap.quickTo(cursor,'y',{duration:.35,ease:'power2.out'}):null;
var writingCard=document.querySelector('a[href="/portfolio/wechat-writing-collection.docx"]')?.closest('.wcard');
if(writingCard){var oldGroup=writingCard.closest('.wgroup');document.querySelector('.wgrid').appendChild(writingCard);oldGroup.remove();}
document.querySelectorAll('.wgrid').forEach(function(grid){
 var cards=Array.from(grid.querySelectorAll('.wcard'));
 grid.classList.add('stories-track');cards[0]?.classList.add('is-active');
 function select(card){if(document.body.classList.contains('editing'))return;cards.forEach(function(c){c.classList.toggle('is-active',c===card);});}
 cards.forEach(function(card){
  card.setAttribute('aria-label','预览：'+card.querySelector('.wcard-name').textContent);
  card.removeAttribute('aria-expanded');
  card.addEventListener('pointerenter',function(){select(card);});
  card.addEventListener('focus',function(){select(card);});
  card.addEventListener('pointermove',function(e){if(e.pointerType==='touch'||document.body.classList.contains('editing'))return;cursor.classList.add('visible');moveX?.(e.clientX);moveY?.(e.clientY);});
  card.addEventListener('pointerleave',function(){cursor.classList.remove('visible');});
  async function preview(e){
   if(document.body.classList.contains('editing')||e.target.closest('.flip-back-link'))return;
   e.preventDefault();opener=card;cursor.classList.remove('visible');
   var link=card.querySelector('.flip-back-link')||card,href=link.getAttribute('href');
   modal.querySelector('h2').textContent=card.querySelector('.wcard-name').textContent;
   modal.querySelector('.preview-description').textContent=card.querySelector('.flip-back-desc')?.textContent||card.querySelector('.wcard-tags').textContent;
   modal.querySelector('.preview-original').href=href;
   var content=modal.querySelector('.preview-content');content.replaceChildren();
   if(/\.pdf$/i.test(href)){
    var loading=document.createElement('p');loading.textContent='正在加载作品页面…';content.appendChild(loading);
    modal.showModal();
    try{
     var response=await fetch('/portfolio/previews/manifest.json');if(!response.ok)throw Error();
     var pages=(await response.json())[href];if(!pages?.length)throw Error();
     if(!modal.open||modal.querySelector('.preview-original').getAttribute('href')!==href)return;
     content.replaceChildren();pages.forEach(function(src,i){var img=document.createElement('img');img.src=src;img.alt='作品第 '+(i+1)+' 页';img.loading='lazy';content.appendChild(img);});
    }catch(error){loading.textContent='预览暂时无法加载，请通过下方链接打开原件。';}
    return;
   }else{
    var cover=card.querySelector('.wcard-img img');
    if(cover){var img=document.createElement('img');img.src=cover.src;img.alt=cover.alt;content.appendChild(img);}
    else{content.appendChild(card.querySelector('.doc-cover').cloneNode(true));}
    if(/\.docx$/i.test(href)){
     modal.showModal();
     var note=document.createElement('p');note.textContent='正在加载原稿正文…';content.appendChild(note);
     try{var textResponse=await fetch(href.replace('/portfolio/','/portfolio/previews/').replace('.docx','.txt'));if(!textResponse.ok)throw Error();var text=await textResponse.text();
      if(!modal.open||modal.querySelector('.preview-original').getAttribute('href')!==href)return;
      content.replaceChildren();var article=document.createElement('article');article.className='preview-writing';text.split(/\n+/).filter(Boolean).forEach(function(line){var p=document.createElement('p');p.textContent=line;article.appendChild(p);});content.appendChild(article);
     }catch(error){note.textContent='正文暂时无法加载，可通过下方入口查看 Word 原件。';}
     return;
    }
   }
   modal.showModal();
  }
  card.addEventListener('click',preview);
  card.addEventListener('keydown',function(e){if(e.target===card&&(e.key==='Enter'||e.key===' '))preview(e);});
 });
});
if(!window.gsap||!window.ScrollTrigger)return;
gsap.registerPlugin(ScrollTrigger);
var mm=gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)',function(){
 gsap.fromTo('.hero-in',{y:32,opacity:0},{y:0,opacity:1,duration:1,ease:'power3.out',stagger:.09,clearProps:'transform'});
 var targets=Array.from(document.querySelectorAll('.fade-up:not(.wcard),.ch-body p,.insight-title,.insight-body,.row-key,.row-val,.res-item-title,.res-item-sub'));
 targets=targets.filter(function(el){return !el.parentElement.closest('.fade-up')&&!el.closest('.wcard');});
 targets.forEach(function(el){el.classList.add('motion-copy');gsap.fromTo(el,{y:28,opacity:0,clipPath:'inset(0 0 100% 0)'},{y:0,opacity:1,clipPath:'inset(0 0 0% 0)',duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 93%',once:true}});});
});
})();
