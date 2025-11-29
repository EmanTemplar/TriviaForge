// Utility Helper Functions

/**
 * Format a date to a readable string
 */
export function formatDate(date, format = 'short') {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } else if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  } else if (format === 'time') {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } else if (format === 'full') {
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return d.toString()
}

/**
 * Generate a random room code
 */
export function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correct, total) {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

/**
 * Validate email address
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate username (alphanumeric + underscore, 3-50 chars)
 */
export function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/
  return usernameRegex.test(username)
}

/**
 * Trim and sanitize text input
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return ''
  return text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (obj instanceof Object) {
    const cloned = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * Throttle function
 */
export function throttle(func, limit = 1000) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Wait for a specified time
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Get initials from a name
 */
export function getInitials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return ''
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Convert bytes to readable format
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get error message from axios error object
 */
export function getErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message
  } else if (error.message) {
    return error.message
  } else {
    return 'An unexpected error occurred'
  }
}

/**
 * Check if two objects are equal
 */
export function isEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

/**
 * Sort array of objects by property
 */
export function sortBy(arr, property, ascending = true) {
  return arr.sort((a, b) => {
    if (a[property] < b[property]) return ascending ? -1 : 1
    if (a[property] > b[property]) return ascending ? 1 : -1
    return 0
  })
}

/**
 * Group array of objects by property
 */
export function groupBy(arr, property) {
  return arr.reduce((acc, obj) => {
    const key = obj[property]
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(obj)
    return acc
  }, {})
}

/**
 * Flatten nested array
 */
export function flatten(arr) {
  return arr.reduce((acc, val) => {
    return acc.concat(Array.isArray(val) ? flatten(val) : val)
  }, [])
}

/**
 * Get unique values from array
 */
export function unique(arr) {
  return [...new Set(arr)]
}
