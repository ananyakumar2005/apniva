/**
 * api.js — Apniva shared API helper
 * Place this file in apniva-frontend/ alongside customer.html and seller.html
 *
 * Usage in HTML:  <script src="api.js"></script>
 *
 * Provides:
 *   API_BASE        — base URL string
 *   apiFetch()      — authenticated fetch wrapper
 *   getUser()       — returns parsed user object from localStorage
 *   getToken()      — returns JWT token string
 *   logout()        — clears session and redirects to index.html
 *   guardCustomer() — redirects away if not logged in as customer
 *   guardSeller()   — redirects away if not logged in as seller
 */

const API_BASE = 'http://localhost:5001/api';

function getToken() {
  return localStorage.getItem('apniva_token') || '';
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('apniva_user') || '{}');
  } catch {
    return {};
  }
}

/**
 * Authenticated fetch — automatically attaches Bearer token.
 * Returns parsed JSON. Throws on non-2xx responses.
 *
 * @param {string} path   - e.g. '/products' or '/cart'
 * @param {object} opts   - standard fetch options (method, body, etc.)
 */
async function apiFetch(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...opts, headers });
  const data = await res.json();

  if (!res.ok) {
    // Token expired or invalid → force logout
    if (res.status === 401) {
      logout();
    }
    throw new Error(data.message || `API error ${res.status}`);
  }
  return data;
}

function logout() {
  localStorage.removeItem('apniva_token');
  localStorage.removeItem('apniva_role');
  localStorage.removeItem('apniva_user');
  window.location.href = 'index.html';
}

function guardCustomer() {
  const role  = localStorage.getItem('apniva_role');
  const token = getToken();
  if (!token || !role) { window.location.href = 'index.html'; return; }
  if (role === 'seller') { window.location.href = 'seller.html'; return; }
}

function guardSeller() {
  const role  = localStorage.getItem('apniva_role');
  const token = getToken();
  if (!token || !role) { window.location.href = 'index.html'; return; }
  if (role === 'customer') { window.location.href = 'customer.html'; return; }
}