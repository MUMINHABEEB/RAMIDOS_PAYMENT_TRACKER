document.addEventListener('DOMContentLoaded', () => {
  redirectIfAuthenticated();

  const loginForm = document.getElementById('loginForm');
  const alertContainer = document.getElementById('alertContainer');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  // Check URL parameters for session expiration notice
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === 'true') {
    showAlert('Your session has expired. Please log in again to continue.', 'warning');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;

    if (!identifier || !password) {
      showAlert('Please enter both your username/email and password.', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (data.success) {
        setAuth(data.token, data.user);
        showAlert('Login successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 800);
      } else {
        showAlert(data.message || 'Login failed. Please check your credentials.', 'error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login request error:', error);
      showAlert('Network error or server unreachable. Please try again.', 'error');
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      btnText.textContent = 'Authenticating...';
      btnSpinner.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      btnText.textContent = 'Log In';
      btnSpinner.classList.add('hidden');
    }
  }

  function showAlert(message, type = 'error') {
    alertContainer.innerHTML = '';
    const bgColors = {
      error: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200'
    };

    const icons = {
      error: '<i class="fas fa-exclamation-circle text-red-500 mr-2"></i>',
      success: '<i class="fas fa-check-circle text-emerald-500 mr-2"></i>',
      warning: '<i class="fas fa-triangle-exclamation text-amber-500 mr-2"></i>'
    };

    const alertDiv = document.createElement('div');
    alertDiv.className = `p-4 rounded-xl border ${bgColors[type]} flex items-center text-sm font-medium animate-fade-in`;
    alertDiv.innerHTML = `${icons[type]} <span>${message}</span>`;

    alertContainer.appendChild(alertDiv);
    alertContainer.classList.remove('hidden');
  }

  function hideAlert() {
    alertContainer.classList.add('hidden');
    alertContainer.innerHTML = '';
  }
});
