import axios from 'axios'
import { useAuthStore } from '@/stores/auth.js'

const apiClient = axios.create({
  baseURL: window.location.origin,
  timeout: 10000
})

// Add token to all requests
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
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
      // Token expired or invalid
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/'
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
