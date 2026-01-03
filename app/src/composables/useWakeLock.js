import { ref, onMounted, onUnmounted } from 'vue'

const DEBUG_MODE = import.meta.env.DEV

/**
 * Wake Lock API Composable
 * Prevents device screen from turning off during active trivia sessions
 *
 * Browser Support:
 * - Chrome 84+ (Desktop & Mobile)
 * - Edge 84+
 * - Safari 16.4+
 * - Brave (Chromium-based)
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
  const keepAliveInterval = ref(null)

  // Check if Wake Lock API is supported
  onMounted(() => {
    if ('wakeLock' in navigator) {
      isSupported.value = true
      if (DEBUG_MODE) console.log('[WAKE LOCK] Wake Lock API is supported')
    } else {
      if (DEBUG_MODE) console.log('[WAKE LOCK] Wake Lock API not supported in this browser')
    }
  })

  /**
   * Request a wake lock to keep screen on
   * @returns {Promise<boolean>} Success status
   */
  const requestWakeLock = async () => {
    if (!isSupported.value) {
      error.value = 'Wake Lock API not supported'
      console.error('[WAKE LOCK] API not supported - wake lock disabled')
      return false
    }

    // Check if page is visible before requesting
    if (document.visibilityState !== 'visible') {
      console.error('[WAKE LOCK] Cannot request wake lock - page is hidden')
      error.value = 'Page must be visible to activate wake lock'
      return false
    }

    try {
      // Request a screen wake lock
      wakeLock.value = await navigator.wakeLock.request('screen')
      isActive.value = true
      error.value = null

      console.log('[WAKE LOCK] ✅ Wake lock activated - screen should stay on')
      if (DEBUG_MODE) console.log('[WAKE LOCK] Device info:', {
        userAgent: navigator.userAgent,
        visibility: document.visibilityState,
        wakeLockType: wakeLock.value.type
      })

      // Listen for wake lock release and auto-reacquire if page is still visible
      wakeLock.value.addEventListener('release', async () => {
        if (DEBUG_MODE) console.log('[WAKE LOCK] Wake lock released')

        // Clear keep-alive interval when wake lock is released
        if (keepAliveInterval.value) {
          clearInterval(keepAliveInterval.value)
          keepAliveInterval.value = null
        }

        // Auto-reacquire if page is still visible (unexpected release)
        // This handles browser timeouts or other automatic releases
        if (document.visibilityState === 'visible' && isActive.value) {
          if (DEBUG_MODE) console.log('[WAKE LOCK] Page still visible - attempting to re-acquire')
          try {
            // Small delay to avoid rapid re-request loops
            await new Promise(resolve => setTimeout(resolve, 100))
            wakeLock.value = await navigator.wakeLock.request('screen')
            if (DEBUG_MODE) console.log('[WAKE LOCK] Successfully re-acquired wake lock')
          } catch (err) {
            console.error('[WAKE LOCK] Failed to re-acquire:', err.message)
            isActive.value = false
          }
        } else {
          // Expected release (page hidden or manually released)
          isActive.value = false
        }
      })

      return true
    } catch (err) {
      error.value = err.message
      isActive.value = false

      // Common errors:
      // - NotAllowedError: User denied permission or page not visible
      // - AbortError: Wake lock was aborted
      console.error('[WAKE LOCK] ❌ Failed to activate:', {
        error: err.name,
        message: err.message,
        visibility: document.visibilityState,
        userAgent: navigator.userAgent.substring(0, 100)
      })

      return false
    }
  }

  /**
   * Release the current wake lock
   */
  const releaseWakeLock = async () => {
    // Clear keep-alive interval
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value)
      keepAliveInterval.value = null
    }

    if (wakeLock.value !== null) {
      try {
        await wakeLock.value.release()
        wakeLock.value = null
        isActive.value = false
        error.value = null
        if (DEBUG_MODE) console.log('[WAKE LOCK] Wake lock manually released')
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
    // Only re-request if we previously had a wake lock active
    if (isActive.value && document.visibilityState === 'visible') {
      if (DEBUG_MODE) console.log('[WAKE LOCK] Page became visible - re-requesting wake lock')
      try {
        wakeLock.value = await navigator.wakeLock.request('screen')
        if (DEBUG_MODE) console.log('[WAKE LOCK] Wake lock re-acquired after visibility change')
      } catch (err) {
        console.error('[WAKE LOCK] Failed to re-acquire wake lock:', err.message)
        isActive.value = false
      }
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
