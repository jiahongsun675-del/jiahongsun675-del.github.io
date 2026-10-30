(function(){
  'use strict';
  var reduced=matchMedia('(prefers-reduced-motion: reduce)'), lenis=null, raf=0;
  function startScroll(){
    if(lenis){lenis.destroy();lenis=null;}cancelAnimationFrame(raf);
    document.documentElement.classList.remove('smooth-scroll');
    if(reduced.matches||document.body.classList.contains('editing')||!window.Lenis)return;
    lenis=new Lenis({lerp:0.09,smoothWheel:true,syncTouch:false,wheelMultiplier:0.85,anchors:{offset:-80},prevent:function(node){return !!node.closest('.personal-editor,.flip-back,[contenteditable=true]');}});
    document.documentElement.classList.add('smooth-scroll');
    lenis.on('scroll',function(){window.ScrollTrigger?.update();});
    function tick(time){if(!document.hidden)lenis?.raf(time);raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);
  }
  startScroll();reduced.addEventListener('change',startScroll);
  new MutationObserver(startScroll).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('load',function(){lenis?.resize();window.ScrollTrigger?.refresh();});
  var surface=document.querySelector('.footer-play'), source=surface?.querySelector('.footer-letter-source'), display=surface?.querySelector('.footer-letters');
  if(!source||!display)return;
  var letters=[],frame=0,inside=false,px=-1000,py=-1000;
  function rebuild(){
    cancelAnimationFrame(frame);frame=0;display.replaceChildren();
    letters=Array.from(source.textContent).map(function(ch){var el=document.createElement('span');el.textContent=ch;display.appendChild(el);return{el:el,x:0,y:0,vx:0,vy:0};});
  }
  rebuild();new MutationObserver(rebuild).observe(source,{childList:true,subtree:true,characterData:true});
  function tick(){
    var moving=false,rect=surface.getBoundingClientRect();
    letters.forEach(function(l){
      var cx=l.el.offsetLeft+l.el.offsetWidth/2,cy=l.el.offsetTop+l.el.offsetHeight/2;
      var dx=px-cx,dy=py-cy,dist=Math.hypot(dx,dy),radius=Math.min(220,rect.width*.35);
      var power=inside?Math.pow(Math.max(0,1-dist/radius),2):0;
      var tx=-dx*power*.2,ty=-power*55;
      l.vx=(l.vx+(tx-l.x)*.09)*.72;l.vy=(l.vy+(ty-l.y)*.09)*.72;l.x+=l.vx;l.y+=l.vy;
      l.el.style.transform='translate3d('+l.x+'px,'+l.y+'px,0) rotate('+(l.x*.13)+'deg) scaleY('+(1+power*.14)+')';
      if(Math.abs(tx-l.x)+Math.abs(ty-l.y)+Math.abs(l.vx)+Math.abs(l.vy)>.03)moving=true;
    });
    frame=moving?requestAnimationFrame(tick):0;
  }
  function wake(){if(!frame)frame=requestAnimationFrame(tick);}
  surface.addEventListener('pointermove',function(e){if(e.pointerType==='touch'||reduced.matches||document.body.classList.contains('editing'))return;var r=surface.getBoundingClientRect();inside=true;px=e.clientX-r.left;py=e.clientY-r.top;wake();});
  surface.addEventListener('pointerleave',function(){inside=false;wake();});
  reduced.addEventListener('change',function(){inside=false;wake();});
})();
