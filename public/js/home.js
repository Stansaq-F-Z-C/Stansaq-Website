(function () {
  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function init() {
    var ticker = document.getElementById('ticker-track');
    var grid = document.getElementById('home-partners-grid');
    var statPartners = document.getElementById('stat-partners');
    if (!ticker && !grid && !statPartners) return;

    try {
      var res = await fetch('/api/partners');
      var partners = await res.json();
      if (!partners.length) return; // keep the static fallback markup if nothing is published yet

      if (statPartners) {
        statPartners.setAttribute('data-target', String(partners.length));
      }

      if (ticker) {
        var items = partners.map(function (p) {
          return '<span class="ticker-item"><span class="dot"></span>' + escapeHtml(p.name) + '</span>';
        }).join('');
        // duplicated once so the CSS marquee (-50%) loops seamlessly
        ticker.innerHTML = items + items;
      }

      if (grid) {
        grid.innerHTML = partners.slice(0, 6).map(function (p, i) {
          var num = String(i + 1).padStart(2, '0');
          return (
            '<div class="entity-cell"><span class="num">' + num + '</span><h3>' + escapeHtml(p.name) +
            '</h3><p>' + escapeHtml(p.tagline || '') + '</p></div>'
          );
        }).join('');
        if (window.reapplyReveal) { window.reapplyReveal(grid); }
      }
    } catch (err) {
      // Network or server issue — leave the static fallback content in place.
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
