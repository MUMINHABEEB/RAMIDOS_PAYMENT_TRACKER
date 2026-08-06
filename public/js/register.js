document.addEventListener('DOMContentLoaded', () => {
  redirectIfAuthenticated();

  const registerForm = document.getElementById('registerForm');
  const alertContainer = document.getElementById('alertContainer');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!username || !email || !password || !confirmPassword) {
      showAlert('All fields are required. Please complete the form.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match. Please re-enter your password.', 'error');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (data.success) {
        setAuth(data.token, data.user);
        showAlert('Account created successfully! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 800);
      } else {
        showAlert(data.message || 'Registration failed. Please try again.', 'error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Registration request error:', error);
      showAlert('Network error or server unreachable. Please try again.', 'error');
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      btnText.textContent = 'Creating Account...';
      btnSpinner.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      btnText.textContent = 'Create Account';
      btnSpinner.classList.add('hidden');
    }
  }

  function showAlert(message, type = 'error') {
    alertContainer.innerHTML = '';
    const bgColors = {
      error: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };

    const icons = {
      error: '<i class="fas fa-exclamation-circle text-red-500 mr-2"></i>',
      success: '<i class="fas fa-check-circle text-emerald-500 mr-2"></i>'
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
