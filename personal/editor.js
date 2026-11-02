(function () {
  'use strict';
  var KEY = 'sunjiahong-personal-original-v1';
  var draft = {}, dirty = false, editing = false;
  var bar = document.createElement('aside');
  bar.className = 'personal-editor'; bar.setAttribute('aria-label', '文字编辑工具栏');
  bar.innerHTML = '<button data-action="edit">✎ 编辑文字</button><div class="edit-actions" hidden><button data-action="bold" aria-label="加粗选中文字"><b>B</b> 加粗</button><button data-action="save">保存修改</button><button data-action="backup">备份文字</button><button data-action="import">导入备份</button><span role="status">修改仅保存在当前浏览器</span></div><input type="file" accept="application/json,.json" hidden>';
  document.body.appendChild(bar);
  var status = bar.querySelector('[role=status]');
  function clean(value) {
    var doc = new DOMParser().parseFromString(String(value), 'text/html');
    doc.querySelectorAll('script,style,iframe,object,img,svg').forEach(function(el){el.remove();});
    function walk(n) {
      if (n.nodeType === 3) return n.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if (n.nodeType !== 1) return '';
      var tag = n.tagName.toLowerCase(), content = Array.from(n.childNodes).map(walk).join('');
      if (tag === 'br') return '<br>';
      if (['b','strong','i','em','u'].includes(tag)) return '<'+tag+'>'+content+'</'+tag+'>';
      return content + (['div','p'].includes(tag) ? '<br>' : '');
    }
    return Array.from(doc.body.childNodes).map(walk).join('');
  }
  function map(selector,id) { var e=document.querySelector(selector); if(e)e.dataset.copy=id; }
  map('.hero-title','hero-name'); map('.hero-sub','hero-intro');
  ['origin','proof','depth'].forEach(function(id,i){
    map('#ch'+(i+1)+' .ch-title',id+'-title');
    document.querySelectorAll('#ch'+(i+1)+' .ch-body p:not(.lead)').forEach(function(p,j){p.dataset.copy=id+'-p-'+j;});
  });
  document.querySelectorAll('[data-flip]').forEach(function(card){
    var a=card.querySelector('.flip-back-link'); if(!a)return;
    var id=a.getAttribute('href');
    card.querySelector('.flip-back-title').dataset.copy=id+':title';
    card.querySelector('.wcard-name').dataset.copy=id+':title';
    card.querySelector('.flip-back-desc').dataset.copy=id+':note';
    card.querySelector('.flip-back-kicker').dataset.copy=id+':tag';
  });
  var counts={};
  var selector='[data-copy],.nav a,.hero-eyebrow,.stat-num,.stat-label,.kick,.ch-title,.ch-body p,.dark-source,.insight-quote,.insight-title,.insight-body,.row-key,.row-val,.res-h,.res-item-title,.res-item-sub,.res-li,.exp-date,.exp-org,.exp-li,.works-head,.works-sub,.wcard-badge,.wcard-name,.wcard-tags,.flip-back-kicker,.flip-back-title,.flip-back-desc,.footer-cta,.footer-meta span,.footer-links a';
  var elements=Array.from(document.querySelectorAll(selector)).filter(function(e){ return !e.closest('.marquee') && !e.parentElement.closest('[data-copy]') && !(e.matches('.exp-li')&&e.querySelector('[data-copy]')); });
  elements.forEach(function(e){
    if(!e.dataset.copy){ var section=e.closest('section,header,footer,nav'); var scope=section?.id||section?.getAttribute('aria-label')||section?.tagName||'page'; var prefix=scope+'-'+e.classList[0]; counts[prefix]=(counts[prefix]||0)+1; e.dataset.copy=prefix+'-'+counts[prefix]; }
    e.spellcheck=false;
  });
  try {
    var raw=new URLSearchParams(location.search).has('baseline')?'{}':localStorage.getItem(KEY), saved=JSON.parse(raw||'{}');
    if(!raw){ var old=JSON.parse(localStorage.getItem('sunjiahong-story-portfolio-v1')||'{}'); elements.forEach(function(e){if(typeof old[e.dataset.copy]==='string')saved[e.dataset.copy]=old[e.dataset.copy];}); }
    if(saved&&typeof saved==='object'&&!Array.isArray(saved))Object.keys(saved).forEach(function(id){if(typeof saved[id]==='string')draft[id]=clean(saved[id]);});
  } catch(e){status.textContent='无法读取存档；请先备份文字';}
  function apply(){ elements.forEach(function(e){if(Object.hasOwn(draft,e.dataset.copy))e.innerHTML=draft[e.dataset.copy];}); syncTitles(); }
  function syncTitles(){document.querySelectorAll('[data-flip]').forEach(function(card){var title=card.querySelector('.flip-back-title');var front=card.querySelector('.wcard-name');if(title&&front)front.innerHTML=title.innerHTML;});}
  apply();
  function save(){ try {localStorage.setItem(KEY,JSON.stringify(draft));dirty=false;status.textContent='已保存到当前浏览器 ✓';}catch(e){status.textContent='保存失败，请下载文字备份';} }
  function changed(e){draft[e.dataset.copy]=clean(e.innerHTML);dirty=true;status.textContent='有未保存修改';}
  elements.forEach(function(e){
    e.addEventListener('input',function(){changed(e);elements.forEach(function(other){if(other!==e&&other.dataset.copy===e.dataset.copy)other.innerHTML=e.innerHTML;});});
    e.addEventListener('paste',function(event){if(!editing)return;event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));});
  });
  document.addEventListener('click',function(e){if(editing&&e.target.closest('[data-copy],.flip-card')){e.preventDefault();e.stopPropagation();}},true);
  var range=null;
  document.addEventListener('selectionchange',function(){var s=window.getSelection();if(s&&s.rangeCount&&s.anchorNode?.parentElement?.closest('[contenteditable=true]'))range=s.getRangeAt(0).cloneRange();});
  bar.querySelector('[data-action=bold]').addEventListener('mousedown',function(e){e.preventDefault();});
  bar.addEventListener('click',function(e){
    var action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='edit'){
      if(editing)save(); editing=!editing;document.body.classList.toggle('editing',editing);
      bar.querySelector('[data-action=edit]').textContent=editing?'完成编辑':'✎ 编辑文字';
      bar.querySelector('.edit-actions').hidden=!editing;
      elements.forEach(function(el){el.contentEditable=String(editing);});
      if(editing&&window.gsap){gsap.killTweensOf('.fade-up,.hero-in');gsap.set('.fade-up,.hero-in',{opacity:1,clearProps:'transform'});}
      if(!editing){syncTitles();window.ScrollTrigger?.refresh();}
    } else if(action==='save')save();
    else if(action==='bold'){
      if(range){var s=window.getSelection();s.removeAllRanges();s.addRange(range);document.execCommand('bold');var el=s.anchorNode?.parentElement?.closest('[data-copy]');if(el)changed(el);}
    } else if(action==='backup'){
      var url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));
      var link=document.createElement('a');link.href=url;link.download='孙嘉鸿-个人网站文字备份.json';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
    } else if(action==='import')bar.querySelector('input').click();
  });
  bar.querySelector('input').addEventListener('change',async function(){
    try{var parsed=JSON.parse(await this.files[0].text());if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();
      if(!confirm('将备份中的文字合并到当前网页？同名字段会被替换，建议先备份当前文字。'))return;
      Object.entries(parsed).forEach(function(pair){if(typeof pair[1]==='string')draft[pair[0]]=clean(pair[1]);});apply();dirty=true;status.textContent='已导入，请保存修改';
    }catch(e){status.textContent='无法读取这份文字备份';}this.value='';
  });
  document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}});
  window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue='';}});
})();
