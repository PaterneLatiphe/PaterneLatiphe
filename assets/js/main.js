/* PaterneLatiphe — progressive enhancement only.
   The page stays readable without this file, without the CDN and without motion. */

(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('has-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');
  var lowEnd =
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  var supports3d =
    window.CSS && window.CSS.supports && window.CSS.supports('transform', 'rotateX(1deg)');

  function onMotionChange(fn) {
    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', fn);
    } else if (typeof reduceMotion.addListener === 'function') {
      reduceMotion.addListener(fn);
    }
  }

  /* ------------------------------------------------------------------
     1. Canvas starfield: drift, twinkle and occasional shooting stars
     ------------------------------------------------------------------ */
  (function starfield() {
    var canvas = document.getElementById('particle-field');
    if (!canvas) return;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;

    var w = 0;
    var h = 0;
    var dpr = 1;
    var stars = [];
    var comets = [];
    var frame = 0;
    var last = 0;
    var nextComet = 0;

    function buildStars() {
      var count = Math.min(120, Math.max(48, Math.round((w * h) / 13000)));
      stars = [];
      for (var i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.25 + 0.35,
          base: Math.random() * 0.42 + 0.14,
          phase: Math.random() * Math.PI * 2,
          twinkle: Math.random() * 0.018 + 0.004,
          vx: (Math.random() - 0.5) * 0.07,
          vy: -(Math.random() * 0.075 + 0.018),
          gold: Math.random() > 0.86
        });
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      if (reduceMotion.matches) draw(0);
    }

    function maybeComet(now) {
      if (now < nextComet || comets.length >= 2) return;
      nextComet = now + 5500 + Math.random() * 9000;
      comets.push({
        x: Math.random() * w * 0.7,
        y: Math.random() * h * 0.55,
        length: 90 + Math.random() * 130,
        life: 0,
        ttl: 800 + Math.random() * 600,
        vx: 5.5 + Math.random() * 3.5,
        vy: 2.2 + Math.random() * 1.4
      });
    }

    function draw(now, dt) {
      var step = dt ? dt / 16.67 : 0;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < stars.length; i += 1) {
        var s = stars[i];
        if (!reduceMotion.matches) {
          s.phase += s.twinkle * step;
          s.x += s.vx * step;
          s.y += s.vy * step;
          if (s.y < -6) { s.y = h + 6; s.x = Math.random() * w; }
          if (s.x < -6) s.x = w + 6;
          if (s.x > w + 6) s.x = -6;
        }
        var alpha = s.base * (0.68 + 0.32 * Math.sin(s.phase));
        ctx.beginPath();
        ctx.fillStyle = s.gold
          ? 'rgba(232,200,138,' + alpha.toFixed(3) + ')'
          : 'rgba(242,240,234,' + alpha.toFixed(3) + ')';
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (reduceMotion.matches) return;

      maybeComet(now);
      for (var j = comets.length - 1; j >= 0; j -= 1) {
        var c = comets[j];
        c.life += dt || 16;
        c.x += c.vx * step;
        c.y += c.vy * step;
        var t = Math.min(1, c.life / c.ttl);
        var fade = Math.sin(Math.PI * t) * 0.55;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(232,200,138,' + fade.toFixed(3) + ')';
        ctx.lineWidth = 1.1;
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - c.length, c.y - c.length * 0.34);
        ctx.stroke();
        if (t >= 1) comets.splice(j, 1);
      }
    }

    function tick(now) {
      var dt = Math.min(now - last, 50);
      last = now;
      draw(now, dt);
      frame = window.requestAnimationFrame(tick);
    }

    function start() {
      window.cancelAnimationFrame(frame);
      if (reduceMotion.matches || document.hidden) {
        draw(0);
        return;
      }
      last = performance.now();
      nextComet = last + 2200;
      frame = window.requestAnimationFrame(tick);
    }

    var resizeFrame = 0;
    window.addEventListener('resize', function () {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(resize);
    }, { passive: true });

    document.addEventListener('visibilitychange', start);
    onMotionChange(start);

    resize();
    start();
  })();

  /* ------------------------------------------------------------------
     2. Scroll progress and slow sky parallax
     ------------------------------------------------------------------ */
  (function scrollSky() {
    var ticking = false;

    function update() {
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var y = window.pageYOffset || root.scrollTop || 0;
      var progress = Math.min(1, Math.max(0, y / max));
      root.style.setProperty('--progress', progress.toFixed(4));
      root.style.setProperty('--sky-shift', reduceMotion.matches ? '0px' : (-y * 0.018).toFixed(1) + 'px');
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    onMotionChange(update);
    update();
  })();

  /* ------------------------------------------------------------------
     3. Reveal on scroll (invisible only when JS is active)
     ------------------------------------------------------------------ */
  (function reveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    function finish(el) {
      el.classList.remove('reveal', 'in-view');
      el.classList.add('is-revealed');
    }

    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(finish);
      return;
    }

    items.forEach(function (el) {
      el.addEventListener('animationend', function (event) {
        if (event.target === el && event.animationName === 'rise') finish(el);
      });
    });

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    items.forEach(function (el) { observer.observe(el); });
  })();

  /* ------------------------------------------------------------------
     4. 3D tilt on cards, only when it is safe and visible
     ------------------------------------------------------------------ */
  (function cards3d() {
    var tiltObserver = null;

    function canTilt() {
      return !reduceMotion.matches && finePointer.matches && !lowEnd &&
        supports3d && typeof window.VanillaTilt !== 'undefined';
    }

    function destroyAll() {
      document.querySelectorAll('.tilt-card').forEach(function (el) {
        if (el.vanillaTilt && typeof el.vanillaTilt.destroy === 'function') {
          el.vanillaTilt.destroy();
        }
      });
    }

    function setup() {
      if (tiltObserver) { tiltObserver.disconnect(); tiltObserver = null; }
      destroyAll();
      if (!canTilt()) return;

      tiltObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          if (entry.isIntersecting && !el.vanillaTilt) {
            window.VanillaTilt.init(el, {
              max: 6,
              speed: 600,
              perspective: 1200,
              scale: 1.01,
              glare: false,
              gyroscope: false,
              reset: true
            });
          } else if (!entry.isIntersecting && el.vanillaTilt) {
            el.vanillaTilt.destroy();
          }
        });
      }, { rootMargin: '120px 0px', threshold: 0.01 });

      document.querySelectorAll('.tilt-card').forEach(function (el) {
        tiltObserver.observe(el);
      });
    }

    setup();
    onMotionChange(setup);
  })();

  /* ------------------------------------------------------------------
     5. Pointer parallax on the hero orbit
     ------------------------------------------------------------------ */
  (function orbitParallax() {
    var scene = document.querySelector('.orbit-scene');
    if (!scene || !finePointer.matches || !supports3d) return;

    scene.addEventListener('pointermove', function (event) {
      if (reduceMotion.matches) return;
      var box = scene.getBoundingClientRect();
      var x = (event.clientX - box.left) / box.width - 0.5;
      var y = (event.clientY - box.top) / box.height - 0.5;
      scene.style.setProperty('--px', (x * 12).toFixed(2) + 'deg');
      scene.style.setProperty('--py', (y * -12).toFixed(2) + 'deg');
    }, { passive: true });

    scene.addEventListener('pointerleave', function () {
      scene.style.setProperty('--px', '0deg');
      scene.style.setProperty('--py', '0deg');
    });
  })();

  /* ------------------------------------------------------------------
     6. Nav highlighting
     ------------------------------------------------------------------ */
  (function navHighlight() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));
    var targets = links.map(function (link) {
      return document.getElementById(link.getAttribute('href').slice(1));
    }).filter(Boolean);
    if (!targets.length || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle(
            'is-active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    targets.forEach(function (section) { observer.observe(section); });
  })();
})();
