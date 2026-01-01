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
          <FormInput
            v-model="newDisplayName"
            label="New Display Name"
            type="text"
            placeholder="Enter new display name"
            required
          />
          <div class="btn-group">
            <Button type="submit" variant="success" full-width>Update Display Name</Button>
            <Button type="button" variant="secondary" full-width @click="cancelUpdate">Cancel</Button>
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
          <FormInput
            v-model="registerPassword"
            label="Password"
            type="password"
            placeholder="Choose a password"
            required
          />
          <FormInput
            v-model="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            required
          />
          <div class="btn-group">
            <Button type="submit" variant="success" full-width>Register Account</Button>
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
          <Button @click="handleDialogClose" variant="success">OK</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import FormInput from '@/components/common/FormInput.vue'
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

/* Navbar styles now in shared/navbars.css */

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

/* Form input styles now in FormInput component */

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

/* Button styles now in Button component */

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

/* Dialog styles now in shared/modals.css */

/* Responsive navbar styles now in shared/navbars.css */

@media (max-width: 600px) {

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
