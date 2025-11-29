import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('authToken') || null)
  const username = ref(localStorage.getItem('username') || null)
  const userRole = ref(localStorage.getItem('userRole') || null)
  const isLoggedIn = computed(() => !!token.value)

  // Actions
  const setAuth = (authToken, user, role) => {
    token.value = authToken
    username.value = user
    userRole.value = role

    // Persist to localStorage
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('username', user)
    localStorage.setItem('userRole', role)
  }

  const logout = () => {
    token.value = null
    username.value = null
    userRole.value = null

    // Clear localStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('username')
    localStorage.removeItem('userRole')
  }

  return {
    token,
    username,
    userRole,
    isLoggedIn,
    setAuth,
    logout
  }
})
