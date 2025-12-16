import axios from 'axios'
import { useAuthStore } from '@/stores/auth.js'

const apiClient = axios.create({
  baseURL: window.location.origin,
  timeout: 10000,
  withCredentials: true // Enable cookies for CSRF tokens
})

// CSRF token cache
let csrfToken = null

// Fetch CSRF token from server
const fetchCsrfToken = async () => {
  try {
    const response = await apiClient.get('/api/csrf-token')
    csrfToken = response.data.csrfToken
    return csrfToken
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error)
    return null
  }
}

// Add token and CSRF token to all requests
apiClient.interceptors.request.use(async (config) => {
  const authStore = useAuthStore()

  // Add auth token
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }

  // Add CSRF token for state-changing methods
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    if (!csrfToken) {
      await fetchCsrfToken()
    }
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken
    }
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect for admin/presenter auth failures, not player login failures
      // Player login errors should be handled by the component's try-catch
      const isPlayerLoginRequest = error.config?.url?.includes('/api/auth/player-login')
      const isPlayerPasswordReset = error.config?.url?.includes('/api/auth/set-new-password')

      if (!isPlayerLoginRequest && !isPlayerPasswordReset) {
        // Admin/Presenter token expired or invalid
        const authStore = useAuthStore()
        authStore.logout()
        window.location.href = '/'
      }
    }

    // Allow password reset errors (status 428) to propagate to components
    if (error.response?.status === 428) {
      return Promise.reject(error)
    }
    return Promise.reject(error)
  }
)

export function useApi() {
  const get = async (url, config = {}) => {
    return apiClient.get(url, config)
  }

  const post = async (url, data = {}, config = {}) => {
    return apiClient.post(url, data, config)
  }

  const put = async (url, data = {}, config = {}) => {
    return apiClient.put(url, data, config)
  }

  const delete_ = async (url, config = {}) => {
    return apiClient.delete(url, config)
  }

  const upload = async (url, formData, onUploadProgress) => {
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    })
  }

  return {
    get,
    post,
    put,
    delete: delete_,
    upload,
    client: apiClient
  }
}
