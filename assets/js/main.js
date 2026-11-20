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

  /* Small ES5 helpers: one clock, one scheduler, guarded numbers. */
  /* Shared motion vocabulary: reuse the CSS tokens when they exist, so the
     tilt feels exactly like the hover/entrance animations (same easing, same
     ~0.5s tempo). Defaults keep the page intact if the tokens are absent. */
  var EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  var tiltSpeed = 500;
  var cssVars = window.getComputedStyle ? window.getComputedStyle(root) : null;
  if (cssVars) {
    var cssEase = (cssVars.getPropertyValue('--ease-ui') || '').trim();
    if (cssEase.indexOf('cubic-bezier') === 0) EASING = cssEase;
    var cssSlow = (cssVars.getPropertyValue('--t-slow') || '').trim();
    var slowSeconds = parseFloat(cssSlow);
    if (cssSlow.indexOf('ms') !== -1 && isFinite(slowSeconds)) slowSeconds /= 1000;
    if (isFinite(slowSeconds) && slowSeconds >= 0.2 && slowSeconds <= 1) {
      tiltSpeed = Math.round(slowSeconds * 1000);
    }
  }

  var raf = window.requestAnimationFrame || function (fn) {
    return window.setTimeout(function () { fn(Date.now()); }, 16);
  };
  var caf = window.cancelAnimationFrame || function (id) { window.clearTimeout(id); };
  var now = (window.performance && typeof window.performance.now === 'function')
    ? function () { return window.performance.now(); }
    : function () { return Date.now(); };

  function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function clamp(value, min, max) {
    if (!isNumber(value)) return min;
    return value < min ? min : (value > max ? max : value);
  }

  /* Shared registries: a single scroll/resize listener and a single frame,
     instead of one RAF loop per feature. Nothing is ever added mid-flight. */
  var motionCallbacks = [];
  var pointerCallbacks = [];
  var scrollCallbacks = [];
  var scrollFrame = 0;

  function onMotionChange(fn) {
    if (typeof fn === 'function') motionCallbacks.push(fn);
  }
  function onPointerChange(fn) {
    if (typeof fn === 'function') pointerCallbacks.push(fn);
  }
  function onScroll(fn) {
    if (typeof fn === 'function') scrollCallbacks.push(fn);
  }

  function watchMedia(mq, fn) {
    if (!mq || typeof fn !== 'function') return;
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', fn);
    else if (typeof mq.addListener === 'function') mq.addListener(fn);
  }

  function notify(list) {
    for (var i = 0; i < list.length; i += 1) list[i]();
  }

  watchMedia(reduceMotion, function () { notify(motionCallbacks); });
  watchMedia(finePointer, function () { notify(pointerCallbacks); });

  function runScrollFrame() {
    scrollFrame = 0;
    notify(scrollCallbacks);
  }
  function requestScrollFrame() {
    if (!scrollFrame) scrollFrame = raf(runScrollFrame);
  }
  window.addEventListener('scroll', requestScrollFrame, { passive: true });
  window.addEventListener('resize', requestScrollFrame, { passive: true });

  /* ------------------------------------------------------------------
     1. Canvas starfield: drift, twinkle and occasional shooting stars
     ------------------------------------------------------------------ */
  (function starfield() {
    var canvas = document.getElementById('particle-field');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var w = 0;
    var h = 0;
    var dpr = 1;
    var stars = [];
    var comets = [];
    var frame = 0;
    var lastDraw = 0;
    var nextComet = 0;
    var frameInterval = lowEnd ? 33 : 0;

    function paused() {
      return reduceMotion.matches || document.hidden || w < 1 || h < 1;
    }

    function buildStars() {
      var area = w * h;
      var maxStars = lowEnd ? 70 : 120;
      var count = Math.min(maxStars, Math.max(area ? 32 : 0, Math.round(area / (lowEnd ? 20000 : 13000))));
      stars = [];
      for (var i = 0; i < count; i += 1) {
        var depth = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.35 + depth * 1.1,
          base: Math.random() * 0.42 + 0.14,
          phase: Math.random() * Math.PI * 2,
          twinkle: Math.random() * 0.018 + 0.004,
          vx: (Math.random() - 0.5) * 0.07 * (0.5 + depth),
          vy: -(Math.random() * 0.075 + 0.018) * (0.5 + depth),
          gold: Math.random() > 0.86
        });
      }
    }

    function resize() {
      /* Measure the element itself: window.innerWidth can include a scrollbar
         and an inline pixel width would fight the responsive CSS. */
      var box = canvas.getBoundingClientRect();
      var nextW = Math.max(1, Math.round(box.width || canvas.clientWidth || window.innerWidth || 1));
      var nextH = Math.max(1, Math.round(box.height || canvas.clientHeight || window.innerHeight || 1));
      var nextDpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.6);
      if (nextW === w && nextH === h && nextDpr === dpr) return;
      w = nextW;
      h = nextH;
      dpr = nextDpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      comets.length = 0;
      nextComet = now() + 2200;
      buildStars();
      if (paused()) draw(0, 0);
    }

    function maybeComet(time) {
      if (w < 1 || h < 1 || time < nextComet || comets.length >= 2) return;
      nextComet = now() + 7000 + Math.random() * 8000;
      comets.push({
        x: Math.random() * w * 0.7,
        y: Math.random() * h * 0.55,
        length: 90 + Math.random() * 130,
        life: 0,
        ttl: 1000 + Math.random() * 600,
        vx: 5.2 + Math.random() * 3.2,
        vy: 2.1 + Math.random() * 1.3
      });
    }

    function draw(time, dt) {
      var step = dt > 0 ? Math.min(dt, 50) / 16.67 : 0;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < stars.length; i += 1) {
        var s = stars[i];
        if (step && !reduceMotion.matches) {
          var shimmer = Math.sin(s.phase);
          s.x += (s.vx + shimmer * 0.006) * step;
          s.y += s.vy * step;
          if (!isNumber(s.x) || !isNumber(s.y)) {
            s.x = Math.random() * w;
            s.y = Math.random() * h;
          }
          if (s.y < -6) { s.y = h + 6; s.x = Math.random() * w; }
          if (s.x < -6) s.x = w + 6;
          if (s.x > w + 6) s.x = -6;
          s.phase += s.twinkle * step;
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

      maybeComet(time);
      for (var j = comets.length - 1; j >= 0; j -= 1) {
        var c = comets[j];
        c.life += dt > 0 ? dt : 16.67;
        c.x += c.vx * step;
        c.y += c.vy * step;
        var t = clamp(c.life / c.ttl, 0, 1);
        var fade = Math.sin(Math.PI * t) * 0.45;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(232,200,138,' + fade.toFixed(3) + ')';
        ctx.lineWidth = 1.1;
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - c.length, c.y - c.length * 0.34);
        ctx.stroke();
        if (t >= 1 || !isNumber(c.x) || !isNumber(c.y)) comets.splice(j, 1);
      }
    }

    function tick(time) {
      /* Self-stopping safety net: even if a motion/visibility event is missed,
         a frozen starfield never keeps a 60fps loop alive. */
      if (reduceMotion.matches || document.hidden) {
        frame = 0;
        comets.length = 0;
        draw(0, 0);
        return;
      }
      frame = raf(tick);
      if (frameInterval && time - lastDraw < frameInterval) return;
      var dt = lastDraw ? clamp(time - lastDraw, 0, 50) : 16.67;
      lastDraw = time;
      draw(time, dt);
    }

    function start() {
      caf(frame);
      frame = 0;
      lastDraw = 0;
      if (paused()) {
        comets.length = 0;
        draw(0, 0);
        return;
      }
      nextComet = now() + 2200;
      frame = raf(tick);
    }

    var resizeFrame = 0;
    window.addEventListener('resize', function () {
      caf(resizeFrame);
      resizeFrame = raf(function () { resizeFrame = 0; resize(); });
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
    var skyInitialised = false;

    function update() {
      var viewport = window.innerHeight || root.clientHeight || 1;
      var max = Math.max(1, (root.scrollHeight || 0) - viewport);
      var y = window.pageYOffset || root.scrollTop || 0;
      if (!isNumber(y)) y = 0;
      root.style.setProperty('--progress', clamp(y / max, 0, 1).toFixed(4));
      /* When motion is turned off mid-scroll, keep the last offset instead of
         snapping the band back to zero: reduced state = frozen, not jumped. */
      if (reduceMotion.matches && skyInitialised) return;
      root.style.setProperty(
        '--sky-shift',
        reduceMotion.matches ? '0px' : clamp(-y * 0.018, -2000, 2000).toFixed(1) + 'px'
      );
      skyInitialised = true;
    }

    onScroll(update);
    onMotionChange(update);
    update();
  })();

  /* ------------------------------------------------------------------
     3. Reveal on scroll (invisible only when JS is active)
     ------------------------------------------------------------------ */
  (function reveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;
    var observer = null;

    function finish(el) {
      if (!el || !el.classList || !el.classList.contains('reveal')) return;
      el.removeEventListener('animationend', onEnd);
      if (el.__revealTimer) {
        window.clearTimeout(el.__revealTimer);
        el.__revealTimer = 0;
      }
      el.classList.remove('reveal', 'in-view');
      el.classList.add('is-revealed');
    }

    function onEnd(event) {
      if (event.target === this) finish(this);
    }

    function finishAll() {
      items.forEach(finish);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

    items.forEach(function (el) { el.addEventListener('animationend', onEnd); });

    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      finishAll();
      return;
    }

    observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
        /* Safety net if the animation is interrupted or never fires. */
        entry.target.__revealTimer = window.setTimeout(function () {
          entry.target.__revealTimer = 0;
          finish(entry.target);
        }, 1600);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    items.forEach(function (el) { observer.observe(el); });

    onMotionChange(function () {
      if (reduceMotion.matches) finishAll();
    });
  })();

  /* ------------------------------------------------------------------
     4. 3D tilt on cards, only when it is safe and visible
     ------------------------------------------------------------------ */
  (function cards3d() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.tilt-card'));
    if (!cards.length) return;
    var tiltObserver = null;

    function canTilt() {
      return !reduceMotion.matches && finePointer.matches && !lowEnd && supports3d &&
        typeof window.VanillaTilt !== 'undefined' &&
        typeof window.VanillaTilt.init === 'function' && 'IntersectionObserver' in window;
    }

    function destroyAll() {
      cards.forEach(function (el) {
        if (el.vanillaTilt && typeof el.vanillaTilt.destroy === 'function') {
          try { el.vanillaTilt.destroy(); } catch (ignore) { /* keep the page usable */ }
        }
      });
    }

    function setup() {
      if (tiltObserver) {
        tiltObserver.disconnect();
        tiltObserver = null;
      }
      destroyAll();
      if (!canTilt()) return;

      tiltObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          if (entry.isIntersecting && !el.vanillaTilt) {
            try {
              window.VanillaTilt.init(el, {
                max: 6,
                speed: tiltSpeed,
                easing: EASING,
                perspective: 1200,
                scale: 1.01,
                glare: false,
                gyroscope: false,
                reset: true
              });
            } catch (ignore) { /* enhancement is optional */ }
          } else if (!entry.isIntersecting && el.vanillaTilt) {
            try { el.vanillaTilt.destroy(); } catch (ignore) { /* ignore */ }
          }
        });
      }, { rootMargin: '120px 0px', threshold: 0.01 });

      cards.forEach(function (el) { tiltObserver.observe(el); });
    }

    setup();
    onMotionChange(setup);
    onPointerChange(setup);
  })();

  /* ------------------------------------------------------------------
     5. Pointer parallax on the hero orbit (max. one read per frame)
     ------------------------------------------------------------------ */
  (function orbitParallax() {
    var scene = document.querySelector('.orbit-scene');
    if (!scene || !supports3d) return;
    var attached = false;
    var frame = 0;
    var pending = null;

    function reset() {
      scene.style.setProperty('--px', '0deg');
      scene.style.setProperty('--py', '0deg');
    }

    function apply() {
      frame = 0;
      if (!pending || reduceMotion.matches) {
        pending = null;
        return;
      }
      var point = pending;
      pending = null;
      var box = scene.getBoundingClientRect();
      if (!(box.width > 0) || !(box.height > 0)) return;
      var x = clamp((point.x - box.left) / box.width - 0.5, -0.5, 0.5);
      var y = clamp((point.y - box.top) / box.height - 0.5, -0.5, 0.5);
      scene.style.setProperty('--px', (x * 12).toFixed(2) + 'deg');
      scene.style.setProperty('--py', (y * -12).toFixed(2) + 'deg');
    }

    function onMove(event) {
      if (reduceMotion.matches) return;
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = raf(apply);
    }

    function onLeave() {
      pending = null;
      if (frame) {
        caf(frame);
        frame = 0;
      }
      reset();
    }

    function sync() {
      var shouldAttach = finePointer.matches && !reduceMotion.matches;
      if (shouldAttach && !attached) {
        scene.addEventListener('pointermove', onMove, { passive: true });
        scene.addEventListener('pointerleave', onLeave);
        scene.addEventListener('pointercancel', onLeave);
        attached = true;
      } else if (!shouldAttach && attached) {
        scene.removeEventListener('pointermove', onMove);
        scene.removeEventListener('pointerleave', onLeave);
        scene.removeEventListener('pointercancel', onLeave);
        attached = false;
      }
      if (!shouldAttach) onLeave();
    }

    sync();
    onMotionChange(sync);
    onPointerChange(sync);
  })();

  /* ------------------------------------------------------------------
     6. Nav highlighting — reading line, cleared at the top of the page
     ------------------------------------------------------------------ */
  (function navHighlight() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));
    var header = document.querySelector('.site-header');
    var pairs = [];
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (target) pairs.push({ link: link, target: target });
    });
    if (!pairs.length) return;
    var current = null;

    function update() {
      var y = window.pageYOffset || root.scrollTop || 0;
      if (!isNumber(y)) y = 0;
      var viewport = window.innerHeight || root.clientHeight || 1;
      var offset = header ? clamp(header.offsetHeight || 76, 0, 160) : 76;
      var line = y + offset + viewport * 0.22;
      var active = null;
      var activeTop = -Infinity;

      pairs.forEach(function (pair) {
        var top = pair.target.getBoundingClientRect().top + y;
        if (isNumber(top) && top <= line && top > activeTop) {
          active = pair;
          activeTop = top;
        }
      });

      if (active === current) return;
      pairs.forEach(function (pair) {
        pair.link.classList.remove('is-active');
        pair.link.removeAttribute('aria-current');
      });
      if (active) {
        active.link.classList.add('is-active');
        active.link.setAttribute('aria-current', 'location');
      }
      current = active;
    }

    onScroll(update);
    update();
  })();

  /* ------------------------------------------------------------------
     7. In-page targets become programmatically focusable (no behaviour
        change without JS, no extra tab stop, no focus trap).
     ------------------------------------------------------------------ */
  (function anchorTargets() {
    var links = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    });
  })();
})();
