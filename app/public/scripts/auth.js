// Authentication Helper
// Save this as: public/scripts/auth.js

class Auth {
  constructor() {
    this.token = localStorage.getItem('trivia_auth_token');
  }

  async login(password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await res.json();
      this.token = data.token;
      localStorage.setItem('trivia_auth_token', this.token);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  async verify() {
    if (!this.token) return false;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token })
      });

      const data = await res.json();
      return data.valid === true;
    } catch (err) {
      console.error('Verify error:', err);
      return false;
    }
  }

  async logout() {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.token })
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }

    this.token = null;
    localStorage.removeItem('trivia_auth_token');
  }

  getToken() {
    return this.token;
  }

  // Add token to fetch requests
  async fetchWithAuth(url, options = {}) {
    const headers = {
      ...options.headers,
      'x-auth-token': this.token
    };

    return fetch(url, { ...options, headers });
  }
}

// Show login modal
function showLoginModal(onSuccess) {
  // Hide page content
  const mainContent = document.querySelector('main') || document.body;
  const originalDisplay = mainContent.style.display;
  mainContent.style.display = 'none';

  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: #1a1a1a; padding: 2rem; border-radius: 10px; max-width: 400px; width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
      <h2 style="margin-top: 0; color: #fff;">🔐 Admin Access Required</h2>
      <p style="color: #aaa; margin-bottom: 1.5rem;">Enter the admin password to continue</p>
      <input 
        type="password" 
        id="passwordInput" 
        placeholder="Enter password"
        style="
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          box-sizing: border-box;
        "
      />
      <div id="errorMsg" style="color: #f66; margin-bottom: 1rem; display: none; padding: 0.5rem; background: rgba(255,0,0,0.1); border-radius: 4px;"></div>
      <button 
        id="loginBtn"
        style="
          width: 100%;
          padding: 0.75rem;
          background: #007bff;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        "
        onmouseover="this.style.background='#0056b3'"
        onmouseout="this.style.background='#007bff'"
      >
        Login
      </button>
      <a href="player.html" style="
        display: block;
        text-align: center;
        margin-top: 1rem;
        color: #007bff;
        text-decoration: none;
      ">Go to Player Page Instead</a>
    </div>
  `;

  document.body.appendChild(modal);

  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMsg');

  const attemptLogin = async () => {
    const password = passwordInput.value.trim();
    if (!password) {
      errorMsg.textContent = 'Please enter a password';
      errorMsg.style.display = 'block';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    errorMsg.style.display = 'none';

    try {
      const auth = new Auth();
      await auth.login(password);
      document.body.removeChild(modal);
      mainContent.style.display = originalDisplay;
      if (onSuccess) onSuccess();
    } catch (err) {
      errorMsg.textContent = err.message || 'Invalid password';
      errorMsg.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
      passwordInput.value = '';
      passwordInput.focus();
    }
  };

  loginBtn.addEventListener('click', attemptLogin);
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });

  passwordInput.focus();
}

// Check authentication and show login if needed
async function requireAuth(onSuccess) {
  const auth = new Auth();
  const isValid = await auth.verify();

  if (isValid) {
    if (onSuccess) onSuccess();
  } else {
    showLoginModal(onSuccess);
  }
}

// Initialize auth - call this at the top of protected pages
window.auth = new Auth();
window.requireAuth = requireAuth;