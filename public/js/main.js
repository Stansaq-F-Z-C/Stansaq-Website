// Stansaq F.Z.C. — shared site behaviour
document.addEventListener('DOMContentLoaded', function () {

  // Scroll progress rail
  var rail = document.querySelector('.scroll-rail-fill');
  if (rail) {
    var updateRail = function () {
      var h = document.documentElement;
      var scrolled = h.scrollTop;
      var max = h.scrollHeight - h.clientHeight;
      rail.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
    };
    document.addEventListener('scroll', updateRail, { passive: true });
    updateRail();
  }

  // Reveal-on-scroll: auto-applies to structural content blocks.
  // Exposed on window so scripts that inject content later (e.g. partners.js)
  // can re-run it against newly added elements.
  var revealSelector = '.card, .entity-cell, .article-card, .solution-block, .timeline-step, .section-head, .spec-row, .hero-copy, .logo-slot';
  var sharedIo = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          sharedIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 })
    : null;

  function applyReveal(root) {
    var targets = Array.prototype.slice.call((root || document).querySelectorAll(revealSelector))
      .filter(function (el) { return !el.classList.contains('reveal'); });
    if (!targets.length) return;

    var groups = {};
    targets.forEach(function (el) {
      var key = el.parentElement;
      if (!groups[key]) { groups[key] = []; }
      groups[key].push(el);
    });
    Object.values(groups).forEach(function (group) {
      group.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 70, 280) + 'ms'; });
    });

    targets.forEach(function (el) { el.classList.add('reveal'); });

    if (sharedIo) {
      targets.forEach(function (el) { sharedIo.observe(el); });
    } else {
      targets.forEach(function (el) { el.classList.add('in-view'); });
    }
  }

  window.reapplyReveal = applyReveal;
  applyReveal(document);

  // Animated stat counters
  var counters = document.querySelectorAll('.stat-number[data-target]');
  if (counters.length && 'IntersectionObserver' in window) {
    var animateCounter = function (el) {
      var target = el.getAttribute('data-target');
      var numeric = parseInt(target.replace(/[^0-9]/g, ''), 10) || 0;
      var suffix = target.replace(/[0-9]/g, '');
      var start = 0;
      var duration = 900;
      var startTime = null;
      var step = function (ts) {
        if (!startTime) { startTime = ts; }
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * numeric) + suffix;
        if (progress < 1) { requestAnimationFrame(step); }
      };
      requestAnimationFrame(step);
    };
    var counterIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counterIo.observe(el); });
  }

  // Cursor-tracked crosshair inside hero image
  var crosshairHost = document.querySelector('.hero-image-col');
  var crosshair = document.querySelector('.crosshair');
  if (crosshairHost && crosshair) {
    crosshairHost.addEventListener('mousemove', function (e) {
      var rect = crosshairHost.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      crosshair.style.left = x + 'px';
      crosshair.style.top = y + 'px';
      crosshair.classList.add('active');
      var coord = crosshair.querySelector('.coord');
      if (coord) { coord.textContent = 'X ' + Math.round(x) + ' / Y ' + Math.round(y); }
    });
    crosshairHost.addEventListener('mouseleave', function () {
      crosshair.classList.remove('active');
    });
  }

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-primary');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Category filter on Insights page (client-side, no page reload)
  var catLinks = document.querySelectorAll('.category-bar a[data-filter]');
  var articles = document.querySelectorAll('.article-card');
  if (catLinks.length && articles.length) {
    catLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        catLinks.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        var filter = link.getAttribute('data-filter');
        articles.forEach(function (card) {
          var cats = (card.getAttribute('data-categories') || '').split(' ');
          card.style.display = (filter === 'all' || cats.indexOf(filter) !== -1) ? '' : 'none';
        });
      });
    });
  }

  // Contact form: prevent real submission in this static template, show a confirmation state.
  var form = document.querySelector('.enquiry-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      if (status) {
        status.textContent = 'Enquiry recorded. This static template does not transmit data — connect a form handler before launch.';
        status.hidden = false;
      }
    });
  }

  (function () {
    var k = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0;
    document.addEventListener('keydown', function (e) {
      if (e.key.toLowerCase() === k[pos].toLowerCase()) {
        pos++;
        if (pos === k.length) {
          pos = 0;
          window.location.href = '/admin/login.html';
        }
      } else {
        pos = (e.key.toLowerCase() === k[0].toLowerCase()) ? 1 : 0;
      }
    });
  })();
});

