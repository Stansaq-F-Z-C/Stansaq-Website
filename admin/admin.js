(function () {
  var state = { partners: [], products: [], insights: [] };

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function checkSession() {
    var res = await fetch('/admin/api/session');
    var data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login.html';
      return;
    }
    document.getElementById('whoami').textContent = 'Signed in as ' + data.username;
  }

  document.getElementById('logout-btn').addEventListener('click', async function () {
    await fetch('/admin/api/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  // ---------------------------------------------------------------------
  // Partners
  // ---------------------------------------------------------------------
  var partnerForm = document.getElementById('partner-form');
  var partnerIdField = document.getElementById('partner-id');
  var partnerSubmitBtn = document.getElementById('partner-submit-btn');
  var partnerCancelBtn = document.getElementById('partner-cancel-btn');

  async function loadPartners() {
    var res = await fetch('/admin/api/partners');
    state.partners = await res.json();
    renderPartners();
    populatePartnerSelect();
  }

  function renderPartners() {
    var list = document.getElementById('partners-list');
    if (!state.partners.length) {
      list.innerHTML = '<p class="empty-state">No companies yet — add the first one above.</p>';
      return;
    }
    list.innerHTML = state.partners.map(function (p) {
      var thumb = p.logo_path
        ? '<img src="' + p.logo_path + '" alt="">'
        : 'No logo';
      return (
        '<div class="admin-row" data-id="' + p.id + '">' +
          '<div class="thumb">' + thumb + '</div>' +
          '<div><h4>' + escapeHtml(p.name) + '</h4><p>' + escapeHtml(p.tagline || '') + '</p></div>' +
          '<div class="row-actions">' +
            '<button type="button" data-action="edit-partner">Edit</button>' +
            '<button type="button" data-action="delete-partner" class="danger">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function populatePartnerSelect() {
    var select = document.getElementById('product-partner');
    var current = select.value;
    select.innerHTML = '<option value="">— None —</option>' + state.partners.map(function (p) {
      return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>';
    }).join('');
    select.value = current;
  }

  function resetPartnerForm() {
    partnerForm.reset();
    partnerIdField.value = '';
    partnerSubmitBtn.textContent = 'Add company';
    partnerCancelBtn.style.display = 'none';
  }

  partnerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = partnerIdField.value;
    var formData = new FormData(partnerForm);
    var url = id ? '/admin/api/partners/' + id : '/admin/api/partners';
    var method = id ? 'PUT' : 'POST';
    var res = await fetch(url, { method: method, body: formData });
    if (!res.ok) { alert('Could not save company.'); return; }
    resetPartnerForm();
    loadPartners();
  });

  partnerCancelBtn.addEventListener('click', resetPartnerForm);

  document.getElementById('partners-list').addEventListener('click', async function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var row = e.target.closest('.admin-row');
    var id = row.getAttribute('data-id');
    var partner = state.partners.find(function (p) { return String(p.id) === id; });

    if (btn.dataset.action === 'edit-partner') {
      partnerIdField.value = partner.id;
      document.getElementById('partner-name').value = partner.name || '';
      document.getElementById('partner-tagline').value = partner.tagline || '';
      document.getElementById('partner-description').value = partner.description || '';
      document.getElementById('partner-applications').value = partner.applications || '';
      partnerSubmitBtn.textContent = 'Save changes';
      partnerCancelBtn.style.display = 'inline-flex';
      partnerForm.scrollIntoView({ behavior: 'smooth' });
    }

    if (btn.dataset.action === 'delete-partner') {
      if (!confirm('Delete "' + partner.name + '"? Products linked to it will be unlinked, not deleted.')) return;
      var res = await fetch('/admin/api/partners/' + id, { method: 'DELETE' });
      if (!res.ok) { alert('Could not delete company.'); return; }
      loadPartners();
      loadProducts();
    }
  });

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------
  var productForm = document.getElementById('product-form');
  var productIdField = document.getElementById('product-id');
  var productSubmitBtn = document.getElementById('product-submit-btn');
  var productCancelBtn = document.getElementById('product-cancel-btn');

  async function loadProducts() {
    var res = await fetch('/admin/api/products');
    state.products = await res.json();
    renderProducts();
  }

  function partnerName(partnerId) {
    var p = state.partners.find(function (p) { return p.id === partnerId; });
    return p ? p.name : null;
  }

  function renderProducts() {
    var list = document.getElementById('products-list');
    if (!state.products.length) {
      list.innerHTML = '<p class="empty-state">No products yet — add the first one above.</p>';
      return;
    }
    list.innerHTML = state.products.map(function (p) {
      var thumb = p.image_path
        ? '<img src="' + p.image_path + '" alt="">'
        : 'No image';
      var linked = partnerName(p.partner_id);
      var meta = escapeHtml(p.description || '') + (linked ? ' · ' + escapeHtml(linked) : '');
      return (
        '<div class="admin-row" data-id="' + p.id + '">' +
          '<div class="thumb">' + thumb + '</div>' +
          '<div><h4>' + escapeHtml(p.name) + '</h4><p>' + meta + '</p></div>' +
          '<div class="row-actions">' +
            '<button type="button" data-action="edit-product">Edit</button>' +
            '<button type="button" data-action="delete-product" class="danger">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function resetProductForm() {
    productForm.reset();
    productIdField.value = '';
    productSubmitBtn.textContent = 'Add product';
    productCancelBtn.style.display = 'none';
  }

  productForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = productIdField.value;
    var formData = new FormData(productForm);
    var url = id ? '/admin/api/products/' + id : '/admin/api/products';
    var method = id ? 'PUT' : 'POST';
    var res = await fetch(url, { method: method, body: formData });
    if (!res.ok) { alert('Could not save product.'); return; }
    resetProductForm();
    loadProducts();
  });

  productCancelBtn.addEventListener('click', resetProductForm);

  document.getElementById('products-list').addEventListener('click', async function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var row = e.target.closest('.admin-row');
    var id = row.getAttribute('data-id');
    var product = state.products.find(function (p) { return String(p.id) === id; });

    if (btn.dataset.action === 'edit-product') {
      productIdField.value = product.id;
      document.getElementById('product-name').value = product.name || '';
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-partner').value = product.partner_id || '';
      productSubmitBtn.textContent = 'Save changes';
      productCancelBtn.style.display = 'inline-flex';
      productForm.scrollIntoView({ behavior: 'smooth' });
    }

    if (btn.dataset.action === 'delete-product') {
      if (!confirm('Delete "' + product.name + '"?')) return;
      var res = await fetch('/admin/api/products/' + id, { method: 'DELETE' });
      if (!res.ok) { alert('Could not delete product.'); return; }
      loadProducts();
    }
  });

  // ---------------------------------------------------------------------
  // Insights
  // ---------------------------------------------------------------------
  var insightForm = document.getElementById('insight-form');
  var insightIdField = document.getElementById('insight-id');
  var insightSubmitBtn = document.getElementById('insight-submit-btn');
  var insightCancelBtn = document.getElementById('insight-cancel-btn');

  async function loadInsights() {
    var res = await fetch('/admin/api/insights');
    state.insights = await res.json();
    renderInsights();
  }

  function renderInsights() {
    var list = document.getElementById('insights-list');
    if (!state.insights.length) {
      list.innerHTML = '<p class="empty-state">No insights yet — add the first one above.</p>';
      return;
    }
    list.innerHTML = state.insights.map(function (i) {
      var thumb = i.image_path
        ? '<img src="' + i.image_path + '" alt="">'
        : 'No image';
      var meta = escapeHtml(i.category || '') + (i.published_date ? ' · ' + escapeHtml(i.published_date) : '');
      return (
        '<div class="admin-row" data-id="' + i.id + '">' +
          '<div class="thumb">' + thumb + '</div>' +
          '<div><h4>' + escapeHtml(i.title) + '</h4><p>' + meta + '</p></div>' +
          '<div class="row-actions">' +
            '<button type="button" data-action="edit-insight">Edit</button>' +
            '<button type="button" data-action="delete-insight" class="danger">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function resetInsightForm() {
    insightForm.reset();
    insightIdField.value = '';
    insightSubmitBtn.textContent = 'Add insight';
    insightCancelBtn.style.display = 'none';
  }

  insightForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var id = insightIdField.value;
    var formData = new FormData(insightForm);
    var url = id ? '/admin/api/insights/' + id : '/admin/api/insights';
    var method = id ? 'PUT' : 'POST';
    var res = await fetch(url, { method: method, body: formData });
    if (!res.ok) { alert('Could not save insight.'); return; }
    resetInsightForm();
    loadInsights();
  });

  insightCancelBtn.addEventListener('click', resetInsightForm);

  document.getElementById('insights-list').addEventListener('click', async function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var row = e.target.closest('.admin-row');
    var id = row.getAttribute('data-id');
    var insight = state.insights.find(function (i) { return String(i.id) === id; });

    if (btn.dataset.action === 'edit-insight') {
      insightIdField.value = insight.id;
      document.getElementById('insight-title').value = insight.title || '';
      document.getElementById('insight-category').value = insight.category || '';
      document.getElementById('insight-excerpt').value = insight.excerpt || '';
      document.getElementById('insight-date').value = insight.published_date || '';
      insightSubmitBtn.textContent = 'Save changes';
      insightCancelBtn.style.display = 'inline-flex';
      insightForm.scrollIntoView({ behavior: 'smooth' });
    }

    if (btn.dataset.action === 'delete-insight') {
      if (!confirm('Delete "' + insight.title + '"?')) return;
      var res = await fetch('/admin/api/insights/' + id, { method: 'DELETE' });
      if (!res.ok) { alert('Could not delete insight.'); return; }
      loadInsights();
    }
  });

  // ---------------------------------------------------------------------
  checkSession().then(function () {
    loadPartners().then(function () {
      loadProducts();
      loadInsights();
    });
  });
})();
