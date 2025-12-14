import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Wake Lock API Composable
 * Prevents device screen from turning off during active trivia sessions
 *
 * Browser Support:
 * - Chrome 84+ (Desktop & Mobile)
 * - Edge 84+
 * - Safari 16.4+
 * - NOT supported in: Firefox, older browsers
 *
 * Usage:
 * const { isSupported, isActive, requestWakeLock, releaseWakeLock } = useWakeLock()
 */
export function useWakeLock() {
  const isSupported = ref(false)
  const isActive = ref(false)
  const wakeLock = ref(null)
  const error = ref(null)

  // Check if Wake Lock API is supported
  onMounted(() => {
    if ('wakeLock' in navigator) {
      isSupported.value = true
      console.log('[WAKE LOCK] Wake Lock API is supported')
    } else {
      console.log('[WAKE LOCK] Wake Lock API not supported in this browser')
    }
  })

  /**
   * Request a wake lock to keep screen on
   * @returns {Promise<boolean>} Success status
   */
  const requestWakeLock = async () => {
    if (!isSupported.value) {
      error.value = 'Wake Lock API not supported'
      return false
    }

    try {
      // Request a screen wake lock
      wakeLock.value = await navigator.wakeLock.request('screen')
      isActive.value = true
      error.value = null

      console.log('[WAKE LOCK] Wake lock activated - screen will stay on')

      // Listen for wake lock release (e.g., when tab loses visibility)
      wakeLock.value.addEventListener('release', () => {
        console.log('[WAKE LOCK] Wake lock released')
        isActive.value = false
      })

      return true
    } catch (err) {
      error.value = err.message
      isActive.value = false

      // Common errors:
      // - NotAllowedError: User denied permission or page not visible
      // - AbortError: Wake lock was aborted
      console.error('[WAKE LOCK] Failed to activate wake lock:', err.message)

      return false
    }
  }

  /**
   * Release the current wake lock
   */
  const releaseWakeLock = async () => {
    if (wakeLock.value !== null) {
      try {
        await wakeLock.value.release()
        wakeLock.value = null
        isActive.value = false
        error.value = null
        console.log('[WAKE LOCK] Wake lock manually released')
      } catch (err) {
        console.error('[WAKE LOCK] Error releasing wake lock:', err.message)
      }
    }
  }

  /**
   * Re-request wake lock when page becomes visible again
   * Wake locks are automatically released when page is hidden
   */
  const handleVisibilityChange = async () => {
    if (wakeLock.value !== null && document.visibilityState === 'visible') {
      console.log('[WAKE LOCK] Page became visible - re-requesting wake lock')
      await requestWakeLock()
    }
  }

  // Set up visibility change listener
  onMounted(() => {
    if (isSupported.value) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  // Clean up on component unmount
  onUnmounted(() => {
    releaseWakeLock()
    if (isSupported.value) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  return {
    isSupported,
    isActive,
    error,
    requestWakeLock,
    releaseWakeLock
  }
}
