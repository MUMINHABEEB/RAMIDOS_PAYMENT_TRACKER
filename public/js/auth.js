// Auth Token & Session Management Helpers

const TOKEN_KEY = 'pay_tracker_token';
const USER_KEY = 'pay_tracker_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function logout() {
  clearAuth();
  window.location.href = '/login.html';
}

function isAuthenticated() {
  const token = getToken();
  return !!token;
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
  }
}

function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    window.location.href = '/index.html';
  }
}

// Fetch helper with Auth Bearer Token attached
async function authFetch(url, options = {}) {
  const token = getToken();
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Session expired or invalid token
    clearAuth();
    window.location.href = '/login.html?expired=true';
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}
