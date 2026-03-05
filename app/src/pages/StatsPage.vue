<template>
  <div class="stats-page">
    <StatsNavbar :showLogout="isAuthenticated" @logout="handleLogout" />

    <div class="stats-container">
      <!-- Login form (not authenticated, no saved profile) -->
      <div v-if="!isAuthenticated && !initialLoading" class="auth-section">
        <div class="auth-card">
          <AppIcon name="bar-chart-3" size="2xl" class="auth-icon" />
          <h2>Player Stats</h2>
          <p class="auth-description">Log in with your registered player account to view your game statistics.</p>

          <form @submit.prevent="handleLoginFromForm" class="login-form">
            <div class="form-group">
              <label for="statsUsername">Username</label>
              <input
                id="statsUsername"
                v-model="usernameInput"
                type="text"
                placeholder="Enter your username"
                maxlength="50"
                :disabled="loggingIn"
              />
            </div>
            <div class="form-group">
              <label for="statsPassword">Password</label>
              <input
                id="statsPassword"
                v-model="passwordInput"
                type="password"
                placeholder="Enter your password"
                :disabled="loggingIn"
              />
            </div>
            <div v-if="loginError" class="login-error">{{ loginError }}</div>
            <button type="submit" class="btn-login" :disabled="loggingIn || !usernameInput.trim() || !passwordInput.trim()">
              <AppIcon v-if="loggingIn" name="loader" size="sm" class="spinner" />
              <AppIcon v-else name="log-in" size="sm" />
              {{ loggingIn ? 'Logging in...' : 'Log In' }}
            </button>
          </form>

          <div class="auth-links">
            <router-link to="/player" class="link-secondary">
              <AppIcon name="users" size="sm" /> Multiplayer
            </router-link>
            <router-link to="/solo" class="link-secondary">
              <AppIcon name="gamepad-2" size="sm" /> Solo Play
            </router-link>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="initialLoading" class="loading-state">
        <AppIcon name="loader" size="2xl" class="spinner" />
        <p>Loading your stats...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-state">
        <AppIcon name="alert-triangle" size="2xl" />
        <p>{{ error }}</p>
        <button class="btn-retry" @click="loadAllData">Try Again</button>
      </div>

      <!-- Stats content -->
      <template v-else>
        <h1 class="stats-title">
          <AppIcon name="bar-chart-3" size="lg" />
          {{ playerUsername }}'s Stats
        </h1>

        <StatsSummary :stats="summary" />
        <StatsCharts :chartData="chartData" />
        <GameHistoryTable
          :games="history"
          :loading="historyLoading"
          :page="currentPage"
          :totalPages="totalPages"
          :filter="typeFilter"
          @changePage="loadHistory"
          @changeFilter="handleFilterChange"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useApi } from '@/composables/useApi.js'
import AppIcon from '@/components/common/AppIcon.vue'
import StatsNavbar from '@/components/stats/StatsNavbar.vue'
import StatsSummary from '@/components/stats/StatsSummary.vue'
import StatsCharts from '@/components/stats/StatsCharts.vue'
import GameHistoryTable from '@/components/stats/GameHistoryTable.vue'

const { post } = useApi()

// Player-specific API client that always uses playerAuthToken (not admin token)
const playerApi = axios.create({
  baseURL: window.location.origin,
  timeout: 10000
})
playerApi.interceptors.request.use((config) => {
  const playerToken = localStorage.getItem('playerAuthToken')
  if (playerToken) {
    config.headers.Authorization = `Bearer ${playerToken}`
  }
  return config
})

// Wrapper for player-authenticated GET requests
const playerGet = (url, config = {}) => playerApi.get(url, config)

// Auth state
const isAuthenticated = ref(false)
const playerUsername = ref('')
const usernameInput = ref('')
const passwordInput = ref('')
const loginError = ref('')
const loggingIn = ref(false)

// Data state
const summary = ref({
  totalGames: 0,
  overallAccuracy: 0,
  bestScore: 0,
  winCount: 0,
  avgRank: null,
  playStreak: 0
})
const chartData = ref([])
const history = ref([])
const currentPage = ref(1)
const totalPages = ref(1)
const typeFilter = ref('all')

// Loading state
const initialLoading = ref(true)
const historyLoading = ref(false)
const error = ref(null)

// --- Auth flow ---

async function tryAutoLogin() {
  const token = localStorage.getItem('playerAuthToken')
  const savedUsername = localStorage.getItem('playerUsername')
  const accountType = localStorage.getItem('playerAccountType')

  // Pre-fill username from saved profile
  if (savedUsername) {
    usernameInput.value = savedUsername
  }

  if (token && accountType === 'registered') {
    try {
      await playerApi.post('/api/auth/verify-player', {})
      // Token is valid
      playerUsername.value = savedUsername || 'Player'
      isAuthenticated.value = true
      return true
    } catch {
      // Token expired — remove it but keep username for pre-fill
      localStorage.removeItem('playerAuthToken')
    }
  }
  return false
}

async function handleLoginFromForm() {
  const username = usernameInput.value.trim()
  const password = passwordInput.value.trim()
  if (!username || !password) return

  loggingIn.value = true
  loginError.value = ''

  try {
    const response = await post('/api/auth/player-login', { username, password })

    // Store auth
    localStorage.setItem('playerAuthToken', response.data.token)
    localStorage.setItem('playerUsername', username)
    localStorage.setItem('playerAccountType', 'registered')

    playerUsername.value = username
    isAuthenticated.value = true
    passwordInput.value = ''

    // Load stats now
    await loadAllData()
  } catch (err) {
    if (err.response?.status === 428) {
      loginError.value = 'Your password needs to be reset. Please log in via the Multiplayer page first.'
    } else if (err.response?.status === 401) {
      loginError.value = 'Invalid username or password.'
    } else if (err.response?.status === 403) {
      loginError.value = 'This account is not a player account.'
    } else {
      loginError.value = 'Login failed. Please try again.'
    }
  } finally {
    loggingIn.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('playerAuthToken')
  localStorage.removeItem('playerUsername')
  localStorage.removeItem('playerDisplayName')
  localStorage.removeItem('playerAccountType')
  isAuthenticated.value = false
  playerUsername.value = ''
  usernameInput.value = ''
  passwordInput.value = ''
  summary.value = { totalGames: 0, overallAccuracy: 0, bestScore: 0, winCount: 0, avgRank: null, playStreak: 0 }
  chartData.value = []
  history.value = []
}

// --- Data loading ---

async function loadSummary() {
  const response = await playerGet('/api/stats/summary')
  summary.value = response.data.data
}

async function loadCharts() {
  const response = await playerGet('/api/stats/charts?days=30')
  chartData.value = response.data.data
}

async function loadHistory(page = 1) {
  historyLoading.value = true
  try {
    const response = await playerGet(`/api/stats/history?page=${page}&limit=15&type=${typeFilter.value}`)
    history.value = response.data.data
    currentPage.value = response.data.meta.pagination.page
    totalPages.value = response.data.meta.pagination.totalPages
  } catch (err) {
    console.error('[STATS] Failed to load history:', err)
  } finally {
    historyLoading.value = false
  }
}

function handleFilterChange(newFilter) {
  typeFilter.value = newFilter
  currentPage.value = 1
  loadHistory(1)
}

async function loadAllData() {
  initialLoading.value = true
  error.value = null
  try {
    await Promise.all([loadSummary(), loadCharts(), loadHistory(1)])
  } catch (err) {
    if (err.response?.status === 401) {
      // Token was valid at verify but expired during data load
      isAuthenticated.value = false
      localStorage.removeItem('playerAuthToken')
    } else {
      error.value = 'Failed to load your stats. Please try again.'
    }
  } finally {
    initialLoading.value = false
  }
}

// --- Init ---

onMounted(async () => {
  const loggedIn = await tryAutoLogin()
  if (loggedIn) {
    await loadAllData()
  } else {
    initialLoading.value = false
  }
})
</script>

<style scoped>
.stats-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.stats-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.stats-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  margin: 0 0 1.5rem;
  color: var(--text-primary);
}

/* Auth section */
.auth-section {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.auth-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.auth-icon {
  color: var(--info-light);
  margin-bottom: 0.5rem;
}

.auth-card h2 {
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.auth-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

/* Login form */
.login-form {
  text-align: left;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.form-group input {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--info-light);
}

.form-group input:disabled {
  opacity: 0.6;
}

.login-error {
  color: var(--danger-light);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--danger-bg-10, rgba(239, 68, 68, 0.1));
  border-radius: 6px;
}

.btn-login {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.7rem 1.2rem;
  background: var(--info-light);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-login:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-login:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Auth links */
.auth-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.link-secondary {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
}

.link-secondary:hover {
  color: var(--info-light);
}

/* Loading / Error states */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  color: var(--text-muted);
  gap: 0.75rem;
}

.loading-state p,
.error-state p {
  margin: 0;
}

.btn-retry {
  padding: 0.5rem 1.2rem;
  background: var(--info-light);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.btn-retry:hover {
  opacity: 0.9;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .stats-container {
    padding: 1rem;
  }
  .stats-title {
    font-size: 1.2rem;
  }
  .auth-card {
    padding: 1.5rem;
  }
}
</style>
