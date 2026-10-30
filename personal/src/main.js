(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var staticMode = /[?&]static=1/.test(window.location.search) || /[?&]fxdemo=1/.test(window.location.search);
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---- chapter rail active state (no gsap needed) ---- */
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('[data-rail]'));
  if (railLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    railLinks.forEach(function (a) { byId[a.getAttribute('data-rail')] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = byId[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          railLinks.forEach(function (a) { a.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---- flip cards ---- */
  document.querySelectorAll('[data-flip]').forEach(function (card) {
    card.setAttribute('aria-expanded', 'false');
    card.addEventListener('click', function (e) {
      if (document.body.classList.contains('editing') || e.target.closest('a')) return;
      card.classList.toggle('flipped');
      card.setAttribute('aria-expanded', String(card.classList.contains('flipped')));
      card.querySelectorAll('a').forEach(function(a){ a.tabIndex = card.classList.contains('flipped') ? 0 : -1; });
    });
    card.addEventListener('keydown', function (e) {
      if (!document.body.classList.contains('editing') && !e.target.closest('a') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        card.classList.toggle('flipped');
      card.setAttribute('aria-expanded', String(card.classList.contains('flipped')));
      card.querySelectorAll('a').forEach(function(a){ a.tabIndex = card.classList.contains('flipped') ? 0 : -1; });
      }
    });
  });

  document.querySelectorAll('[data-flip] a').forEach(function(a){ a.tabIndex=-1; });
  if (prefersReduced || staticMode || !hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- hero intro ---- */
  var heroItems = document.querySelectorAll('.hero-in');
  if (heroItems.length) {
    gsap.fromTo(heroItems,
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out', stagger: 0.09, delay: 0.1, clearProps: 'transform' });
  }

  /* ---- scroll reveals ---- */
  document.querySelectorAll('.fade-up:not(.wcard)').forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, y: 26 },
      {
        opacity: 1, y: 0, duration: 0.75, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
  });

  /* ---- deal-from-deck (滚动抽卡) for work cards ---- */
  document.querySelectorAll('.wgrid').forEach(function (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.wcard'));
    if (!cards.length) return;
    var deal = gsap.timeline({ scrollTrigger: {
      trigger: grid, start: 'top 92%', end: 'top 38%', scrub: 0.65,
      invalidateOnRefresh: true
    }});
        var gr = grid.getBoundingClientRect();
        var deckX = gr.left + gr.width / 2;
        cards.forEach(function (card, i) {
          var cr = card.getBoundingClientRect();
          var dx = Math.max(-140, Math.min(140, (deckX - (cr.left + cr.width / 2)) * 0.4));
          deal.fromTo(card,
            { x: dx, y: 90 + i * 14, rotation: clampRot(dx), scale: 0.91, opacity: 0 },
            { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1, ease: 'power2.out' },
            i * 0.12);
        });
  });
  function clampRot(dx) {
    var r = dx * 0.04;
    return Math.max(-14, Math.min(14, r));
  }

  /* ---- ghost chapter numerals parallax ---- */
  document.querySelectorAll('.ghost-num').forEach(function (el) {
    gsap.fromTo(el, { yPercent: -62 }, {
      yPercent: -38, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
})();
