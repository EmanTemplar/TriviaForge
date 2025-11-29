<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="login-title">🎮 Trivia Forge</h1>
      <p class="login-subtitle">Admin & Presenter Access</p>

      <!-- Login Form -->
      <div v-if="!isLoggedIn" class="login-form">
        <FormInput
          v-model="username"
          label="Username"
          type="text"
          placeholder="username"
          :error="error"
          @keypress.enter="attemptLogin"
        />

        <FormInput
          v-model="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          @keypress.enter="attemptLogin"
        />

        <Button
          :is-loading="isLoading"
          full-width
          @click="attemptLogin"
        >
          Login
        </Button>
      </div>

      <!-- Access Buttons (After Login) -->
      <div v-else class="access-buttons">
        <h3 class="success-message">✓ Access Granted</h3>

        <div class="button-group">
          <RouterLink to="/admin" class="access-link admin-link">
            📝 Admin Panel - Manage Quizzes
          </RouterLink>

          <RouterLink to="/presenter" class="access-link presenter-link">
            🎯 Presenter - Host Game
          </RouterLink>

          <RouterLink to="/display" class="access-link display-link">
            📺 Display Screen - For Audience
          </RouterLink>
        </div>

        <Button
          variant="danger"
          full-width
          @click="performLogout"
        >
          Logout
        </Button>
      </div>

      <hr class="divider">

      <RouterLink to="/player" class="player-link">
        👥 Join as Player
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useUIStore } from '@/stores/ui.js'
import { useApi } from '@/composables/useApi.js'
import Button from '@/components/common/Button.vue'
import FormInput from '@/components/common/FormInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()
const { post } = useApi()

const username = ref('admin')
const password = ref('')
const error = ref(null)
const isLoading = ref(false)
const isLoggedIn = ref(false)

// Check if already authenticated
onMounted(async () => {
  if (authStore.token && authStore.userRole === 'admin') {
    isLoggedIn.value = true
  } else {
    // Clear any stale auth
    authStore.logout()
  }
})

const attemptLogin = async () => {
  error.value = null

  if (!username.value.trim() || !password.value.trim()) {
    error.value = 'Please enter username and password'
    return
  }

  isLoading.value = true

  try {
    const response = await post('/api/auth/login', {
      username: username.value.trim(),
      password: password.value.trim()
    })

    const data = response.data

    // Check if user is admin
    if (data.user?.account_type !== 'admin') {
      error.value = 'Admin access required'
      password.value = ''
      isLoading.value = false
      return
    }

    // Store auth
    authStore.setAuth(data.token, data.user.username, 'admin')
    isLoggedIn.value = true

    // Show success notification
    uiStore.addNotification(`Welcome back, ${data.user.username}!`, 'success')
  } catch (err) {
    const message = err.response?.data?.message || 'Invalid credentials'
    error.value = message
    password.value = ''

    // Show error notification
    uiStore.addNotification(message, 'error')
  } finally {
    isLoading.value = false
  }
}

const performLogout = async () => {
  isLoading.value = true

  try {
    // Notify server of logout (optional)
    if (authStore.token) {
      try {
        await post('/api/auth/logout', {})
      } catch (err) {
        console.error('Logout notification failed:', err)
      }
    }
  } finally {
    // Clear local auth
    authStore.logout()
    isLoggedIn.value = false
    username.value = 'admin'
    password.value = ''
    isLoading.value = false

    // Show notification
    uiStore.addNotification('Logged out successfully', 'info')
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
  padding: var(--spacing-md);
  position: relative;
  z-index: 100;
}

.login-box {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  padding: 3rem;
  border-radius: 20px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.login-title {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  text-align: center;
  color: #fff;
}

.login-subtitle {
  color: #aaa;
  margin-bottom: 2rem;
  text-align: center;
  font-size: var(--font-base);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.access-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.success-message {
  color: #0f0;
  text-align: center;
  margin: 0 0 1.5rem 0;
  font-size: var(--font-xl);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.access-link {
  padding: 1rem;
  border-radius: 10px;
  color: #fff;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.2s;
  text-align: center;
  display: block;
}

.admin-link {
  background: rgba(0, 123, 255, 0.3);
  border: 2px solid rgba(0, 123, 255, 0.5);
}

.admin-link:hover {
  background: rgba(0, 123, 255, 0.5);
  transform: translateY(-2px);
}

.presenter-link {
  background: rgba(0, 200, 0, 0.3);
  border: 2px solid rgba(0, 200, 0, 0.5);
}

.presenter-link:hover {
  background: rgba(0, 200, 0, 0.5);
  transform: translateY(-2px);
}

.display-link {
  background: rgba(255, 165, 0, 0.3);
  border: 2px solid rgba(255, 165, 0, 0.5);
}

.display-link:hover {
  background: rgba(255, 165, 0, 0.5);
  transform: translateY(-2px);
}

.divider {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.player-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  text-decoration: none;
  transition: all 0.2s;
  text-align: center;
  margin: 0 auto;
}

.player-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .login-box {
    padding: 2rem;
    border-radius: 15px;
  }

  .login-title {
    font-size: 2rem;
  }

  .login-subtitle {
    font-size: var(--font-sm);
  }
}
</style>
