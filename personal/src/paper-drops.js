/* PaperDrops-style liquid flowmap distortion on work card covers.
   Mouse movement paints velocity into a flowmap RT (ping-pong, decaying);
   the display shader displaces image UVs by the flowmap with a subtle RGB split.
   Degrades gracefully: no WebGL / static mode / reduced motion => plain <img>. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var staticMode = /[?&]static=1/.test(window.location.search);
  var demoMode = /[?&]fxdemo=1/.test(window.location.search);
  if (reduced || staticMode || typeof window.THREE === 'undefined') return;

  var VERT = [
    'varying vec2 vUv;',
    'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');

  var SPLAT_FRAG = [
    'varying vec2 vUv;',
    'uniform vec2 uVel; uniform float uStrength; uniform float uAspect;',
    'void main(){',
    '  float d = length((vUv - 0.5) * vec2(uAspect, 1.0));',
    '  float a = smoothstep(0.5, 0.05, d) * uStrength;',
    '  vec3 c = vec3(uVel * 0.5 + 0.5, 1.0);',
    '  gl_FragColor = vec4(c * a, a);',
    '}'
  ].join('\n');

  var DISPLAY_FRAG = [
    'varying vec2 vUv;',
    'uniform sampler2D uTex; uniform sampler2D uFlow;',
    'uniform vec2 uScale; uniform vec2 uOffset;',
    'void main(){',
    '  vec4 f = texture2D(uFlow, vUv);',
    '  vec2 flow = (f.rg - 0.5) * 2.0 * f.a;',
    '  vec2 uv = vUv * uScale + uOffset;',
    '  vec2 d = flow * 0.032;',
    '  vec3 col;',
    '  col.r = texture2D(uTex, uv + d * 1.08).r;',
    '  col.g = texture2D(uTex, uv + d).g;',
    '  col.b = texture2D(uTex, uv + d * 0.92).b;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function makeRT(w, h) {
    return new THREE.WebGLRenderTarget(Math.max(2, w >> 1), Math.max(2, h >> 1), {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false
    });
  }

  var loader = new THREE.TextureLoader();
  var cards = [];   // initialized instances
  var pending = []; // containers waiting for first hover

  function PaperDrop(container) {
    this.el = container;
    this.img = container.querySelector('img');
    this.aspect = 1;
    this.ready = false;
    this.visible = false;
    this.last = null;
    this.splats = [];
    this.pool = [];
    this.demoT = 0;
    this.anchorTop = container.classList.contains('feat');

    var src = this.img.currentSrc || this.img.src;
    var self = this;
    loader.load(src, function (tex) {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      self.tex = tex;
      self.imgAspect = tex.image.width / tex.image.height;
      self.build();
    });
  }

  PaperDrop.prototype.build = function () {
    var w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.aspect = w / h;

    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 1);
    var c = this.renderer.domElement;
    c.style.position = 'absolute';
    c.style.inset = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.display = 'block';
    c.style.pointerEvents = 'none';
    this.el.appendChild(c);

    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // flowmap scene: fullscreen fade quad + splat pool
    this.flowScene = new THREE.Scene();
    this.rtRead = makeRT(w, h);
    this.rtWrite = makeRT(w, h);
    this.fadeMat = new THREE.MeshBasicMaterial({
      map: this.rtRead.texture, transparent: true, opacity: 0.962,
      depthTest: false, depthWrite: false
    });
    this.flowScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.fadeMat));

    // display scene
    this.dispScene = new THREE.Scene();
    this.dispMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: this.tex },
        uFlow: { value: this.rtRead.texture },
        uScale: { value: new THREE.Vector2(1, 1) },
        uOffset: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: VERT, fragmentShader: DISPLAY_FRAG,
      depthTest: false, depthWrite: false
    });
    this.dispScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.dispMat));

    this.fitCover();
    this.ready = true;
    this.img.style.opacity = '0';
  };

  PaperDrop.prototype.fitCover = function () {
    var ca = this.aspect, ia = this.imgAspect || 1;
    var sx = 1, sy = 1;
    if (ca > ia) { sy = ia / ca; } else { sx = ca / ia; }
    this.dispMat.uniforms.uScale.value.set(sx, sy);
    this.dispMat.uniforms.uOffset.value.set((1 - sx) / 2, this.anchorTop ? 0 : (1 - sy) / 2);
  };

  PaperDrop.prototype.resize = function () {
    if (!this.ready || document.body.classList.contains('editing') || document.hidden) return;
    var w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.aspect = w / h;
    this.renderer.setSize(w, h);
    this.rtRead.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.rtWrite.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.fitCover();
  };

  PaperDrop.prototype.getSplat = function () {
    if (this.pool.length) return this.pool.pop();
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uVel: { value: new THREE.Vector2() },
        uStrength: { value: 1 },
        uAspect: { value: this.aspect }
      },
      vertexShader: VERT, fragmentShader: SPLAT_FRAG,
      transparent: true, blending: THREE.AdditiveBlending,
      depthTest: false, depthWrite: false
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), mat);
    mesh.visible = false;
    this.flowScene.add(mesh);
    return mesh;
  };

  PaperDrop.prototype.splat = function (ux, uy, vx, vy, strength) {
    var mesh = this.getSplat();
    mesh.visible = true;
    mesh.position.set(ux * 2 - 1, uy * 2 - 1, 0);
    mesh.material.uniforms.uVel.value.set(
      THREE.MathUtils.clamp(vx, -1, 1),
      THREE.MathUtils.clamp(vy, -1, 1)
    );
    mesh.material.uniforms.uStrength.value = strength;
    mesh.material.uniforms.uAspect.value = this.aspect;
    this.splats.push({ mesh: mesh, life: strength });
  };

  PaperDrop.prototype.onMove = function (e) {
    if (!this.ready || document.body.classList.contains('editing') || this.el.closest('.flipped') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var rect = this.el.getBoundingClientRect();
    var ux = (e.clientX - rect.left) / rect.width;
    var uy = 1 - (e.clientY - rect.top) / rect.height;
    var vx = 0, vy = 0;
    if (this.last) {
      vx = (ux - this.last.x) * 9;
      vy = (uy - this.last.y) * 9;
    }
    this.last = { x: ux, y: uy };
    var speed = Math.min(1, Math.sqrt(vx * vx + vy * vy) * 2.2);
    this.splat(ux, uy, vx, vy, 0.16 + speed * 0.5);
  };

  PaperDrop.prototype.frame = function () {
    if (!this.ready || document.body.classList.contains('editing') || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (demoMode && this.visible) {
      this.demoT += 0.03;
      var t = this.demoT;
      this.splat(0.5 + 0.38 * Math.sin(t), 0.5 + 0.32 * Math.cos(t * 1.3), 0.5 * Math.cos(t), -0.5 * Math.sin(t), 0.45);
    }

    var i, s;
    for (i = this.splats.length - 1; i >= 0; i--) {
      s = this.splats[i];
      s.life *= 0.72;
      if (s.life < 0.02) {
        s.mesh.visible = false;
        this.pool.push(s.mesh);
        this.splats.splice(i, 1);
      } else {
        s.mesh.material.uniforms.uStrength.value = s.life;
      }
    }

    this.fadeMat.map = this.rtRead.texture;
    this.renderer.setRenderTarget(this.rtWrite);
    this.renderer.render(this.flowScene, this.cam);
    this.renderer.setRenderTarget(null);

    var tmp = this.rtRead;
    this.rtRead = this.rtWrite;
    this.rtWrite = tmp;

    this.dispMat.uniforms.uFlow.value = this.rtRead.texture;
    this.renderer.render(this.dispScene, this.cam);
  };

  /* ---- collect targets: all cover images except long-image pan cards ---- */
  var targets = document.querySelectorAll('.wcard-img:not(.pan)');
  if (!targets.length) return;

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var inst = en.target.__paperDrop;
          if (inst) inst.visible = en.isIntersecting;
        });
      }, { rootMargin: '80px' })
    : null;

  Array.prototype.forEach.call(targets, function (el) {
    if (!el.querySelector('img')) return;
    if (demoMode) {
      var inst = new PaperDrop(el);
      el.__paperDrop = inst;
      cards.push(inst);
      if (io) io.observe(el); else inst.visible = true;
    } else {
      pending.push(el);
      el.addEventListener('pointerenter', function init() {
        el.removeEventListener('pointerenter', init);
        var inst = new PaperDrop(el);
        el.__paperDrop = inst;
        cards.push(inst);
        if (io) io.observe(el); else inst.visible = true;
        el.addEventListener('pointermove', function (e) { inst.onMove(e); });
        el.addEventListener('pointerdown', function(e) { inst.onMove(e); });
        el.addEventListener('pointerleave', function () { inst.last = null; });
      });
    }
  });

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (en) {
        var inst = en.target.__paperDrop;
        if (inst) inst.resize();
      });
    });
    Array.prototype.forEach.call(targets, function (el) { ro.observe(el); });
  }

  (function loop() {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].visible || demoMode) cards[i].frame();
    }
    window.requestAnimationFrame(loop);
  })();
})();
