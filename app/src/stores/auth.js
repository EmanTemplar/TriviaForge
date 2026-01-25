import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('authToken') || null)
  const username = ref(localStorage.getItem('username') || null)
  const userRole = ref(localStorage.getItem('userRole') || null)
  const userId = ref(parseInt(localStorage.getItem('userId')) || null)
  const isRootAdmin = ref(localStorage.getItem('isRootAdmin') === 'true')
  const isLoggedIn = computed(() => !!token.value)

  // Actions
  const setAuth = (authToken, user, role, id = null, rootAdmin = false) => {
    token.value = authToken
    username.value = user
    userRole.value = role
    userId.value = id
    isRootAdmin.value = rootAdmin

    // Persist to localStorage
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('username', user)
    localStorage.setItem('userRole', role)
    if (id) localStorage.setItem('userId', id.toString())
    localStorage.setItem('isRootAdmin', rootAdmin.toString())
  }

  const logout = () => {
    token.value = null
    username.value = null
    userRole.value = null
    userId.value = null
    isRootAdmin.value = false

    // Clear localStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('username')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('isRootAdmin')
  }

  return {
    token,
    username,
    userRole,
    userId,
    isRootAdmin,
    isLoggedIn,
    setAuth,
    logout
  }
})
