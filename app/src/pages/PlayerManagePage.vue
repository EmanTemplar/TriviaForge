<template>
  <div class="player-manage-page">
    <!-- Navbar -->
    <nav class="navbar">
      <div class="logo">TriviaForge - Player Account</div>
      <div class="hamburger" @click.stop="toggleMenu">&#9776;</div>
      <ul class="menu" :class="{ open: menuOpen }" id="menu">
        <li><RouterLink to="/player">Play</RouterLink></li>
        <li><RouterLink to="/display">Spectate</RouterLink></li>
      </ul>
    </nav>

    <!-- Main Content -->
    <div class="manage-container">
      <div class="manage-header">
        <h1>Player Account</h1>
        <p>Manage your player profile and settings</p>
      </div>

      <!-- Account Information -->
      <div class="account-section">
        <h2>Account Information</h2>
        <div class="info-row">
          <span class="info-label">Username:</span>
          <span class="info-value">{{ username || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Account Type:</span>
          <span class="info-value">{{ accountType === 'guest' ? 'Guest' : 'Registered' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Current Display Name:</span>
          <span class="info-value">{{ currentDisplayName || '-' }}</span>
        </div>
      </div>

      <!-- Update Display Name -->
      <div class="account-section">
        <h2>Update Display Name</h2>
        <p class="section-description">
          Your display name is what other players see during games.
        </p>
        <form @submit.prevent="updateDisplayName" class="form">
          <div class="form-group">
            <label for="newDisplayName">New Display Name</label>
            <input
              v-model="newDisplayName"
              type="text"
              id="newDisplayName"
              placeholder="Enter new display name"
              maxlength="50"
              required
            />
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-success">Update Display Name</button>
            <button type="button" class="btn btn-secondary" @click="cancelUpdate">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Register Account (for Guest users only) -->
      <div v-if="accountType === 'guest'" class="account-section register-section">
        <h2>Register Your Account</h2>
        <p class="section-description">
          Register to save your account permanently and access it from any device.
        </p>
        <form @submit.prevent="registerAccount" class="form">
          <div class="form-group">
            <label for="registerPassword">Password</label>
            <input
              v-model="registerPassword"
              type="password"
              id="registerPassword"
              placeholder="Choose a password"
              minlength="6"
              required
            />
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              id="confirmPassword"
              placeholder="Confirm your password"
              minlength="6"
              required
            />
          </div>
          <div class="btn-group">
            <button type="submit" class="btn btn-success">Register Account</button>
          </div>
        </form>
      </div>

      <!-- Player Statistics -->
      <div class="account-section">
        <h2>Player Statistics</h2>
        <div class="stats-placeholder">
          Statistics will be available in a future update
        </div>
      </div>

      <RouterLink to="/player" class="back-link">← Back to Player</RouterLink>
    </div>

    <!-- Dialog Modal -->
    <Modal :isOpen="showDialog" size="small" :title="dialogTitle" @close="handleDialogClose">
      <template #default>
        <p class="dialog-message">{{ dialogMessage }}</p>
      </template>
      <template #footer>
        <div class="dialog-buttons">
          <button @click="handleDialogClose" class="btn btn-success">OK</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import { useApi } from '@/composables/useApi.js'

const router = useRouter()
const { post } = useApi()

// UI State
const menuOpen = ref(false)
const showDialog = ref(false)
const dialogTitle = ref('')
const dialogMessage = ref('')

// User data
const username = ref('')
const accountType = ref('guest')
const currentDisplayName = ref('')
const newDisplayName = ref('')

// Registration form
const registerPassword = ref('')
const confirmPassword = ref('')

// Load user info from localStorage
const loadUserInfo = () => {
  const storedUsername = localStorage.getItem('playerUsername')
  const storedDisplayName = localStorage.getItem('playerDisplayName')
  const storedAccountType = localStorage.getItem('playerAccountType') || 'guest'

  if (!storedUsername) {
    // No user info - redirect to player page
    router.push('/player')
    return
  }

  username.value = storedUsername
  accountType.value = storedAccountType.toLowerCase()
  currentDisplayName.value = storedDisplayName || storedUsername
  newDisplayName.value = storedDisplayName || ''
}

// Update display name
const updateDisplayName = async () => {
  const trimmedName = newDisplayName.value.trim()

  if (!trimmedName) {
    showAlert('Please enter a display name.')
    return
  }

  // Update localStorage
  localStorage.setItem('playerDisplayName', trimmedName)
  currentDisplayName.value = trimmedName

  // Show success message
  showAlert(
    'Display name updated successfully!\n\nNote: This change will take effect the next time you join a room.',
    'Success'
  )
}

// Cancel update
const cancelUpdate = () => {
  newDisplayName.value = currentDisplayName.value
}

// Register account
const registerAccount = async () => {
  if (registerPassword.value !== confirmPassword.value) {
    showAlert('Passwords do not match!')
    return
  }

  if (registerPassword.value.length < 6) {
    showAlert('Password must be at least 6 characters long.')
    return
  }

  try {
    const response = await post('/api/auth/register-guest', {
      username: username.value,
      password: registerPassword.value
    })

    // Update account type in localStorage
    localStorage.setItem('playerAccountType', 'registered')

    // Save auth token for auto-login
    if (response.data.token) {
      localStorage.setItem('playerAuthToken', response.data.token)
    }

    // Update UI
    accountType.value = 'registered'

    // Clear password fields
    registerPassword.value = ''
    confirmPassword.value = ''

    showAlert(
      'Account registered successfully!\n\nYou can now log in with your username and password from any device.',
      'Registration Success'
    )
  } catch (err) {
    showAlert('Registration failed: ' + (err.response?.data?.error || err.message), 'Error')
    console.error('Registration error:', err)
  }
}

// Dialog functions
const showAlert = (message, title = 'Notification') => {
  dialogTitle.value = title
  dialogMessage.value = message
  showDialog.value = true
}

const handleDialogClose = () => {
  showDialog.value = false
}

// Menu toggle
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenuIfOutside = (e) => {
  const menu = document.getElementById('menu')
  const hamburger = e.target.closest('.hamburger')
  if (menu && menu.classList && menu.classList.contains('open') && !menu.contains(e.target) && !hamburger) {
    menuOpen.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadUserInfo()
  document.addEventListener('click', closeMenuIfOutside)
  document.addEventListener('touchstart', closeMenuIfOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuIfOutside)
  document.removeEventListener('touchstart', closeMenuIfOutside)
})
</script>

<style scoped>
.player-manage-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.navbar {
  background: var(--bg-secondary);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--info-border);
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--info-light);
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--info-light);
}

.menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
  align-items: center;
}

.menu li {
  white-space: nowrap;
}

.menu a {
  color: var(--text-primary);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu a:hover {
  background: var(--info-bg-hover);
}

.manage-container {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
  overflow-y: auto;
}

.manage-header {
  text-align: center;
  margin-bottom: 3rem;
}

.manage-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.manage-header p {
  color: var(--text-tertiary);
  margin: 0;
  font-size: 1.1rem;
}

.account-section {
  background: var(--bg-overlay-05);
  padding: 2rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

.account-section h2 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
  font-size: 1.3rem;
}

.account-section.register-section {
  background: var(--info-bg-subtle);
  border-color: var(--info-border);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-tertiary);
  font-weight: 600;
}

.info-value {
  color: var(--info-light);
  font-weight: 500;
}

.section-description {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem;
  background: var(--bg-overlay-05);
  border: 1px solid var(--border-dark);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

.form-group input:focus {
  outline: none;
  background: var(--bg-overlay-08);
  border-color: var(--info-border-focus);
}

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  border: 1px solid transparent;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: var(--info-bg);
  border-color: var(--info-border);
  color: var(--text-primary);
  flex: 1;
}

.btn-primary:hover {
  background: var(--info-bg-hover);
  border-color: var(--info-border-hover);
}

.btn-success {
  background: var(--secondary-bg);
  border-color: var(--secondary-border);
  color: var(--secondary-light);
  flex: 1;
}

.btn-success:hover {
  background: var(--secondary-bg-hover);
  border-color: var(--secondary-border-hover);
}

.btn-secondary {
  background: var(--neutral-bg);
  border-color: var(--neutral-border);
  color: var(--text-tertiary);
  flex: 1;
}

.btn-secondary:hover {
  background: var(--neutral-bg-hover);
  border-color: var(--neutral-border-hover);
}

.stats-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.back-link {
  display: inline-block;
  color: var(--info-light);
  text-decoration: none;
  margin-top: 2rem;
  font-weight: 500;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--text-primary);
}

.dialog-message {
  margin: 0;
  color: var(--text-tertiary);
  text-align: center;
  white-space: pre-wrap;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Responsive Design */
/* Hide user separator line on desktop */
.menu li:nth-child(n+5) {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}

@media (max-width: 1024px) {
  .menu li:nth-child(n+5) {
    border-top: 1px solid var(--border-color);
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }

  .hamburger {
    display: block !important;
    z-index: 101;
  }

  .menu {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--info-border);
    padding: 1rem;
    gap: 0;
    display: none !important;
    z-index: 99;
  }

  .menu.open {
    display: flex !important;
  }

  .menu li {
    width: 100%;
    white-space: normal;
  }

  .menu a {
    display: block;
    padding: 0.75rem;
  }
}

@media (max-width: 900px) {
  .hamburger {
    display: block;
  }

  .menu {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--info-border);
    padding: 1rem;
    gap: 0;
    display: none;
  }

  .menu.open {
    display: flex;
  }

  .menu li {
    width: 100%;
    white-space: normal;
  }

  .menu a {
    display: block;
    padding: 0.75rem;
  }
}

@media (max-width: 600px) {
  .navbar {
    padding: 0.75rem;
  }

  .logo {
    font-size: 0.95rem;
  }

  .manage-container {
    padding: 1rem;
  }

  .manage-header {
    margin-bottom: 2rem;
  }

  .manage-header h1 {
    font-size: 1.5rem;
  }

  .manage-header p {
    font-size: 0.95rem;
  }

  .account-section {
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .account-section h2 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.75rem 0;
  }

  .info-label {
    margin-bottom: 0.5rem;
  }

  .btn-group {
    flex-direction: column;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.65rem 1rem;
  }
}
</style>
