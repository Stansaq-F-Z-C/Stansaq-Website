(function () {
  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderPartnerBlock(partner, index, products) {
    var logo = partner.logoPath
      ? '<img src="' + partner.logoPath + '" alt="' + escapeHtml(partner.name) + ' logo" style="max-height:100%; max-width:100%; object-fit:contain;">'
      : escapeHtml(partner.name) + ' — logo';
    var apps = partner.applications.length
      ? '<ul class="tick-list">' + partner.applications.map(function (a) { return '<li>' + escapeHtml(a) + '</li>'; }).join('') + '</ul>'
      : '<p class="text-steel" style="font-size:14px;">No applications listed yet.</p>';

    var productsHtml = '';
    if (products.length) {
      productsHtml = (
        '<div style="margin-top:24px;">' +
          '<h4>Products from ' + escapeHtml(partner.name) + '</h4>' +
          '<div class="article-grid" style="margin-top:12px;">' +
            products.map(function (p) {
              var img = p.imagePath
                ? '<img src="' + p.imagePath + '" alt="" style="width:100%; height:100%; object-fit:cover;">'
                : '<span class="tag">No image yet</span>';
              return (
                '<article class="article-card">' +
                  '<div class="img-placeholder" style="height:150px;">' + img + '</div>' +
                  '<h3 style="font-size:16px;">' + escapeHtml(p.name) + '</h3>' +
                  '<p>' + escapeHtml(p.description || '') + '</p>' +
                '</article>'
              );
            }).join('') +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="solution-block">' +
        '<div class="solution-head">' +
          '<span class="idx">' + String(index + 1).padStart(2, '0') + '</span>' +
          '<div class="logo-slot">' + logo + '</div>' +
          '<h3>' + escapeHtml(partner.name) + '</h3>' +
          (partner.tagline ? '<p class="eyebrow" style="margin-bottom:0;">' + escapeHtml(partner.tagline) + '</p>' : '') +
        '</div>' +
        '<div>' +
          '<div class="solution-cols" style="grid-template-columns: 1.4fr 1fr;">' +
            '<div><h4>Description</h4><p class="text-steel" style="font-size:15px;">' + escapeHtml(partner.description || '') + '</p></div>' +
            '<div><h4>Applications</h4>' + apps + '</div>' +
          '</div>' +
          productsHtml +
        '</div>' +
      '</div>'
    );
  }

  async function init() {
    var listEl = document.getElementById('partners-dynamic-list');
    if (!listEl) return;

    try {
      var [partnersRes, productsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/products')
      ]);
      var partners = await partnersRes.json();
      var products = await productsRes.json();

      if (!partners.length) {
        listEl.innerHTML = '<p class="empty-state text-steel">No principal partners published yet.</p>';
      } else {
        listEl.innerHTML = partners.map(function (partner, i) {
          var linked = products.filter(function (p) { return p.partnerId === partner.id; });
          return renderPartnerBlock(partner, i, linked);
        }).join('');
      }

      var unassigned = products.filter(function (p) { return !p.partnerId; });
      var unassignedSection = document.getElementById('unassigned-products-section');
      var unassignedList = document.getElementById('unassigned-products-list');
      if (unassigned.length && unassignedSection && unassignedList) {
        unassignedSection.style.display = '';
        unassignedList.innerHTML = unassigned.map(function (p) {
          var img = p.imagePath
            ? '<img src="' + p.imagePath + '" alt="" style="width:100%; height:100%; object-fit:cover;">'
            : '<span class="tag">No image yet</span>';
          return (
            '<article class="article-card">' +
              '<div class="img-placeholder" style="height:190px;">' + img + '</div>' +
              '<h3>' + escapeHtml(p.name) + '</h3>' +
              '<p>' + escapeHtml(p.description || '') + '</p>' +
            '</article>'
          );
        }).join('');
      }

      // Re-run the reveal-on-scroll observer against the newly injected content.
      if (window.reapplyReveal) { window.reapplyReveal(); }
    } catch (err) {
      listEl.innerHTML = '<p class="empty-state text-steel">Could not load principal partners right now.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
