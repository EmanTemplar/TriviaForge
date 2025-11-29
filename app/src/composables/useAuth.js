import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()
  const isLoading = ref(false)
  const error = ref(null)

  const login = async (username, password, isAdmin = false) => {
    isLoading.value = true
    error.value = null

    try {
      const endpoint = isAdmin ? '/api/admin/login' : '/api/login'
      const response = await axios.post(endpoint, {
        username,
        password
      })

      const { token, user, role } = response.data

      authStore.setAuth(token, user, role)
      return { success: true, role }
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // Optional: notify server of logout
      if (authStore.token) {
        await axios.post('/api/logout', {}, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      authStore.logout()
      router.push({ name: 'login' })
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    isLoading.value = true
    error.value = null

    try {
      await axios.post('/api/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Password change failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const validateToken = async () => {
    if (!authStore.token) {
      return false
    }

    try {
      const response = await axios.get('/api/validate-token', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      return response.data.valid
    } catch (err) {
      authStore.logout()
      return false
    }
  }

  return {
    isLoading,
    error,
    login,
    logout,
    changePassword,
    validateToken
  }
}
