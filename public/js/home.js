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
          return '<a class="ticker-item" href="partners.html"><span class="dot"></span>' + escapeHtml(p.name) + '</a>';
        }).join('');
        // duplicated once so the CSS marquee (-50%) loops seamlessly
        ticker.innerHTML = items + items;
      }

      if (grid) {
        grid.innerHTML = partners.slice(0, 6).map(function (p, i) {
          var num = String(i + 1).padStart(2, '0');
          return (
            '<a class="entity-cell" href="partners.html"><span class="num">' + num + '</span><h3>' + escapeHtml(p.name) +
            '</h3><p>' + escapeHtml(p.tagline || '') + '</p></a>'
          );
        }).join('');
        if (window.reapplyReveal) { window.reapplyReveal(grid); }
      }
    } catch (err) {
      // Network or server issue — leave the static fallback content in place.
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function initInsights() {
    var grid = document.getElementById('home-insights-grid');
    if (!grid) return;
    try {
      var res = await fetch('/api/insights?limit=3');
      var insights = await res.json();

      if (!insights.length) {
        grid.innerHTML = '<p class="empty-state text-steel">No insights published yet.</p>';
        return;
      }

      grid.innerHTML = insights.map(function (i) {
        var img = i.imagePath
          ? '<img src="' + i.imagePath + '" alt="" style="width:100%; height:100%; object-fit:cover;">'
          : '<span class="tag">No image yet</span>';
        var meta = escapeHtml(i.category || 'General') + (i.publishedDate ? ' / ' + formatDate(i.publishedDate) : '');
        return (
          '<article class="article-card">' +
            '<div class="img-placeholder">' + img + '</div>' +
            '<span class="meta">' + meta + '</span>' +
            '<h3>' + escapeHtml(i.title) + '</h3>' +
            '<p>' + escapeHtml(i.excerpt || '') + '</p>' +
          '</article>'
        );
      }).join('');
      if (window.reapplyReveal) { window.reapplyReveal(grid); }
    } catch (err) {
      grid.innerHTML = '<p class="empty-state text-steel">Could not load insights right now.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('DOMContentLoaded', initInsights);
})();
