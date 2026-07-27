document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var errorMsg = document.getElementById('error-msg');
  errorMsg.style.display = 'none';
  var body = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value
  };
  try {
    var res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { errorMsg.style.display = 'block'; return; }
    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    errorMsg.textContent = 'Could not reach the server.';
    errorMsg.style.display = 'block';
  }
});
