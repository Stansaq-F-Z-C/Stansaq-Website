(function () {
  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function slugify(str) {
    return (str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function renderCard(insight) {
    var img = insight.imagePath
      ? '<img src="' + insight.imagePath + '" alt="" style="width:100%; height:100%; object-fit:cover;">'
      : '<span class="tag">No image yet</span>';
    var meta = escapeHtml(insight.category || 'General') + (insight.publishedDate ? ' / ' + formatDate(insight.publishedDate) : '');
    return (
      '<article class="article-card" data-categories="' + slugify(insight.category) + '">' +
        '<div class="img-placeholder">' + img + '</div>' +
        '<span class="meta">' + meta + '</span>' +
        '<h3>' + escapeHtml(insight.title) + '</h3>' +
        '<p>' + escapeHtml(insight.excerpt || '') + '</p>' +
      '</article>'
    );
  }

  function wireFilter(barEl, gridEl) {
    var links = barEl.querySelectorAll('a[data-filter]');
    var cards = gridEl.querySelectorAll('.article-card');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        links.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        var filter = link.getAttribute('data-filter');
        cards.forEach(function (card) {
          var cats = (card.getAttribute('data-categories') || '').split(' ');
          card.style.display = (filter === 'all' || cats.indexOf(filter) !== -1) ? '' : 'none';
        });
      });
    });
  }

  async function init() {
    var bar = document.getElementById('insights-category-bar');
    var grid = document.getElementById('insights-article-grid');
    if (!grid) return;

    try {
      var res = await fetch('/api/insights');
      var insights = await res.json();

      if (!insights.length) {
        grid.innerHTML = '<p class="empty-state text-steel">No insights published yet.</p>';
        return;
      }

      grid.innerHTML = insights.map(renderCard).join('');

      if (bar) {
        var seen = {};
        var categoryLinks = ['<a href="#" data-filter="all" class="active">All</a>'];
        insights.forEach(function (i) {
          var label = i.category || 'General';
          var slug = slugify(label);
          if (seen[slug]) return;
          seen[slug] = true;
          categoryLinks.push('<a href="#" data-filter="' + slug + '">' + escapeHtml(label) + '</a>');
        });
        bar.innerHTML = categoryLinks.join('');
      }

      if (window.reapplyReveal) { window.reapplyReveal(grid); }
      if (bar && grid) { wireFilter(bar, grid); }
    } catch (err) {
      grid.innerHTML = '<p class="empty-state text-steel">Could not load insights right now.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
