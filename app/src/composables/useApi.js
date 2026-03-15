import axios from 'axios'
import { useAuthStore } from '@/stores/auth.js'

// Debug logging (only active in development mode)
const DEBUG = import.meta.env.DEV
const debugLog = (...args) => {
  if (DEBUG) console.log('[API]', ...args)
}

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
apiClient.interceptors.request.use((config) => {
  debugLog('Request interceptor:', {
    url: config.url,
    method: config.method,
    isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
  })

  const authStore = useAuthStore()

  // Add auth token (admin token takes priority, then player token)
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  } else {
    const playerToken = localStorage.getItem('playerAuthToken')
    if (playerToken) {
      config.headers.Authorization = `Bearer ${playerToken}`
    }
  }

  // Add CSRF token for state-changing methods
  const method = config.method?.toLowerCase()
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    debugLog('POST request detected, checking CSRF token')
    // If CSRF token is already cached, use it synchronously
    if (csrfToken) {
      debugLog('Using cached CSRF token')
      config.headers['x-csrf-token'] = csrfToken
      return config
    }

    // Otherwise, fetch it asynchronously
    debugLog('Fetching CSRF token from server')
    return fetchCsrfToken().then(() => {
      if (csrfToken) {
        debugLog('CSRF token fetched successfully')
        config.headers['x-csrf-token'] = csrfToken
      } else {
        console.error('[API] Failed to fetch CSRF token')
      }
      return config
    }).catch((err) => {
      console.error('[API] Error fetching CSRF token:', err)
      // Continue with request even if CSRF fetch fails (for non-protected endpoints)
      return config
    })
  }

  // For GET/HEAD/OPTIONS, return synchronously
  return config
}, (error) => {
  console.error('[API] Request interceptor error:', error)
  return Promise.reject(error)
})

// Handle response errors
apiClient.interceptors.response.use(
  (response) => {
    debugLog('Response received:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText
    })
    return response
  },
  async (error) => {
    if (DEBUG) {
      console.error('[API] Response error:', {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data
      })
    }

    // CSRF token expired — clear cache, fetch fresh token, retry once
    if (error.response?.status === 403 && !error.config?._csrfRetried) {
      debugLog('CSRF token expired, refreshing and retrying request')
      csrfToken = null
      await fetchCsrfToken()
      if (csrfToken) {
        error.config._csrfRetried = true
        error.config.headers['x-csrf-token'] = csrfToken
        return apiClient.request(error.config)
      }
    }

    if (error.response?.status === 401) {
      // Only redirect for admin/presenter auth failures, not player auth failures
      // Player auth errors should be handled by the component's try-catch
      const url = error.config?.url || ''
      const isPlayerAuthRequest = url.includes('/api/auth/player-login')
        || url.includes('/api/auth/set-new-password')
        || url.includes('/api/auth/verify-player')
        || url.includes('/api/stats')

      if (!isPlayerAuthRequest) {
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
    if (!csrfToken) await fetchCsrfToken()
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
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
