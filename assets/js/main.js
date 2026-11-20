/* PaterneLatiphe — progressive enhancement only.
   The page is fully readable without this file and without the CDN. */

(function () {
  'use strict';

  document.documentElement.classList.add('has-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');
  var lowEnd =
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  var supports3d =
    window.CSS && window.CSS.supports && window.CSS.supports('transform', 'rotateX(1deg)');

  var tiltObserver = null;

  function canTilt() {
    return (
      !reduceMotion.matches &&
      finePointer.matches &&
      !lowEnd &&
      supports3d &&
      typeof window.VanillaTilt !== 'undefined'
    );
  }

  function destroyAllTilts() {
    document.querySelectorAll('.tilt-card').forEach(function (el) {
      if (el.vanillaTilt && typeof el.vanillaTilt.destroy === 'function') {
        el.vanillaTilt.destroy();
      }
    });
  }

  function setupTilt() {
    if (tiltObserver) {
      tiltObserver.disconnect();
      tiltObserver = null;
    }
    destroyAllTilts();

    if (!canTilt()) {
      return; // CSS hover 3D remains active as a graceful fallback.
    }

    tiltObserver = new IntersectionObserver(
      function (entries) {
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
      },
      { rootMargin: '120px 0px', threshold: 0.01 }
    );

    document.querySelectorAll('.tilt-card').forEach(function (el) {
      tiltObserver.observe(el);
    });
  }

  setupTilt();

  // React to a user changing their motion preference at any time.
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', setupTilt);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(setupTilt);
  }

  // Subtle nav highlighting, no layout work.
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav a[href^="#"]')
  );
  var targets = navLinks
    .map(function (link) {
      var id = link.getAttribute('href').slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (targets.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle(
              'is-active',
              link.getAttribute('href') === '#' + entry.target.id
            );
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    targets.forEach(function (section) {
      navObserver.observe(section);
    });
  }
})();
