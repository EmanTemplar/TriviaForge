import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.js'

// Debug logging (only active in development mode)
const DEBUG = import.meta.env.DEV
const debugLog = (...args) => {
  if (DEBUG) console.log('[SOCKET DEBUG]', ...args)
}

// CRITICAL: All refs must be module-scoped to match module-scoped socket
// This ensures event listeners always update the SAME refs that components are watching
let socket = null
let heartbeatInterval = null
let onlineHandler = null
let offlineHandler = null
let isConnecting = false  // Guard against concurrent socket creation

// Module-scoped reactive state (shared across all useSocket() calls)
const isConnected = ref(false)
const connectionError = ref(null)
const currentRoomCode = ref(null)
const currentUsername = ref(null)

// PHASE 1: Player Session ID Management
// Persistent UUID for player identification across reconnections
const PLAYER_ID_KEY = 'trivia_player_session_id'

/**
 * Generate a UUID v4 (fallback for browsers without crypto.randomUUID)
 * Compatible with HTTP and older browsers
 * @returns {string} UUID v4 string
 */
const generateUUID = () => {
  // Try crypto.randomUUID() first (modern browsers, HTTPS only)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch (e) {
      console.warn('[SOCKET] crypto.randomUUID() failed, using fallback')
    }
  }

  // Fallback: Manual UUID v4 generation (works on HTTP and all browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Get or generate a persistent Player Session ID
 * Uses localStorage with sessionStorage fallback for incognito mode
 * @returns {string} PlayerID (UUID format)
 */
const getOrCreatePlayerID = () => {
  try {
    // Try localStorage first (persists across sessions)
    let playerID = localStorage.getItem(PLAYER_ID_KEY)

    if (!playerID) {
      // Generate new PlayerID using UUID generator (with fallback for HTTP/old browsers)
      playerID = generateUUID()
      debugLog('Generated NEW PlayerID:', playerID)

      try {
        localStorage.setItem(PLAYER_ID_KEY, playerID)
        debugLog('PlayerID saved to localStorage')
      } catch (e) {
        // localStorage unavailable (incognito mode) - fallback to sessionStorage
        console.warn('[SOCKET] localStorage unavailable, using sessionStorage fallback')
        sessionStorage.setItem(PLAYER_ID_KEY, playerID)
        debugLog('PlayerID saved to sessionStorage (fallback)')
      }
    } else {
      debugLog('Using existing PlayerID from localStorage:', playerID)
    }

    return playerID
  } catch (error) {
    console.error('[SOCKET] Error managing PlayerID:', error)
    // Fallback: Generate temporary ID (won't persist across sessions)
    const tempID = generateUUID()
    console.warn('[SOCKET] Using temporary PlayerID (won\'t persist):', tempID)
    return tempID
  }
}

export function useSocket() {
  const authStore = useAuthStore()

  const startHeartbeat = () => {
    // Clear any existing heartbeat interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }

    // Send heartbeat every 15 seconds
    heartbeatInterval = setInterval(() => {
      if (socket?.connected && currentRoomCode.value) {
        socket.emit('heartbeat', {
          roomCode: currentRoomCode.value,
          username: currentUsername.value,
          timestamp: Date.now() // Add timestamp for round-trip latency calculation
        })
      }
    }, 15000) // 15 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  const connect = () => {
    debugLog('connect() called', {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      isConnecting,
      timestamp: new Date().toISOString()
    })

    // If socket exists (even if disconnected), reuse it instead of creating a new one
    // This prevents multiple socket instances on mobile refresh
    if (socket) {
      console.log(`[SOCKET] Reusing existing socket (connected: ${socket.connected})`)
      debugLog('Reusing socket - socket.id:', socket.id)
      if (!socket.connected) {
        console.log('[SOCKET] Triggering reconnection on existing socket')
        debugLog('Calling socket.connect() on existing socket')
        socket.connect()
      }
      return socket
    }

    // CRITICAL: Guard against concurrent socket creation
    // If another call to connect() is already creating a socket, wait for it
    if (isConnecting) {
      console.log('[SOCKET] Socket creation already in progress - skipping duplicate call')
      debugLog('Concurrent connect() blocked')
      return null
    }

    isConnecting = true
    console.log('[SOCKET] Creating new socket instance')

    // PHASE 1: Get or create persistent PlayerID
    const playerID = getOrCreatePlayerID()
    debugLog('Creating NEW socket with auth token:', authStore.token ? 'present' : 'MISSING')
    debugLog('PlayerID for socket auth:', playerID)

    socket = io(window.location.origin, {
      auth: {
        token: authStore.token,
        playerID: playerID  // PHASE 1: Include PlayerID in socket auth
      },
      // MOBILE-OPTIMIZED RECONNECTION
      reconnection: true,
      reconnectionDelay: 500,            // REDUCED: 1000ms → 500ms (faster first retry)
      reconnectionDelayMax: 5000,        // REDUCED: 10000ms → 5000ms (cap at 5s instead of 10s)
      reconnectionAttempts: Infinity,    // Never give up reconnecting
      timeout: 15000,                    // REDUCED: 20000ms → 15000ms (faster failure detection)

      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      upgrade: true,                     // Allow upgrading from polling to websocket
      closeOnBeforeunload: false,        // CRITICAL for iOS Safari - prevents disconnect on page hide

      // NEW: Explicit ping/pong configuration
      pingInterval: 25000,               // Send ping every 25 seconds
      pingTimeout: 20000                 // Wait 20 seconds for pong response
    })

    socket.on('connect', () => {
      isConnected.value = true
      connectionError.value = null
      console.log('Socket.IO connected')
      debugLog('Socket CONNECT event fired', {
        socketId: socket.id,
        currentRoomCode: currentRoomCode.value,
        currentUsername: currentUsername.value,
        isConnectedRef: isConnected.value,
        timestamp: new Date().toISOString()
      })

      // Restart heartbeat if we were in a room
      if (currentRoomCode.value) {
        debugLog('Restarting heartbeat for room:', currentRoomCode.value)
        startHeartbeat()
      }
    })

    socket.on('disconnect', () => {
      isConnected.value = false
      stopHeartbeat()
      console.log('Socket.IO disconnected')
      debugLog('Socket DISCONNECT event fired', {
        currentRoomCode: currentRoomCode.value,
        currentUsername: currentUsername.value,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('connect_error', (error) => {
      connectionError.value = error.message
      console.error('Socket.IO connection error:', error)
      debugLog('Socket CONNECT_ERROR event', {
        error: error.message,
        authToken: authStore.token ? 'present' : 'MISSING',
        timestamp: new Date().toISOString()
      })
    })

    // Listen for heartbeat acknowledgment (optional - for debugging)
    socket.on('heartbeat-ack', () => {
      // Heartbeat successful - connection is healthy
    })

    // Network change event listeners for instant reconnection
    if (!onlineHandler) {
      onlineHandler = () => {
        console.log('[CONNECTION] Network online detected')
        if (socket && !socket.connected) {
          socket.connect()
        }
      }
    }

    if (!offlineHandler) {
      offlineHandler = () => {
        console.log('[CONNECTION] Network offline detected')
        isConnected.value = false
      }
    }

    // Register network listeners (remove old ones first to prevent duplicates)
    window.removeEventListener('online', onlineHandler)
    window.removeEventListener('offline', offlineHandler)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)

    // Clear connecting flag - socket is now created
    isConnecting = false
    console.log('[SOCKET] Socket creation complete')

    return socket
  }

  const setRoomContext = (roomCode, username) => {
    debugLog('setRoomContext called', {
      roomCode,
      username,
      socketConnected: socket?.connected,
      previousRoomCode: currentRoomCode.value,
      previousUsername: currentUsername.value,
      timestamp: new Date().toISOString()
    })
    currentRoomCode.value = roomCode
    currentUsername.value = username

    // Start heartbeat when joining a room
    if (roomCode && username && socket?.connected) {
      debugLog('Starting heartbeat after setRoomContext')
      startHeartbeat()
    }
  }

  const clearRoomContext = () => {
    debugLog('clearRoomContext called', {
      previousRoomCode: currentRoomCode.value,
      previousUsername: currentUsername.value,
      timestamp: new Date().toISOString()
    })
    stopHeartbeat()
    currentRoomCode.value = null
    currentUsername.value = null
  }

  const disconnect = () => {
    console.log('[SOCKET] disconnect() called')
    debugLog('disconnect() called', {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      currentRoomCode: currentRoomCode.value,
      currentUsername: currentUsername.value,
      timestamp: new Date().toISOString()
    })
    stopHeartbeat()

    // Clean up network event listeners
    if (onlineHandler) {
      window.removeEventListener('online', onlineHandler)
    }
    if (offlineHandler) {
      window.removeEventListener('offline', offlineHandler)
    }

    if (socket) {
      console.log(`[SOCKET] Disconnecting and destroying socket (was connected: ${socket.connected})`)
      debugLog('Destroying socket - socket.id:', socket.id)
      socket.disconnect()
      socket = null
      isConnected.value = false
    } else {
      console.log('[SOCKET] disconnect() called but socket was already null')
    }

    // Clear connecting flag to allow new connections
    isConnecting = false
  }

  const emit = (eventName, ...args) => {
    debugLog('emit() called', {
      eventName,
      args,
      socketConnected: socket?.connected,
      socketId: socket?.id,
      timestamp: new Date().toISOString()
    })
    if (socket?.connected) {
      socket.emit(eventName, ...args)
    } else {
      console.warn(`Socket.IO event "${eventName}" not sent: not connected`)
      debugLog('EMIT BLOCKED - socket not connected')
    }
  }

  const on = (eventName, callback) => {
    if (socket) {
      socket.on(eventName, callback)
    }
  }

  const off = (eventName, callback) => {
    if (socket) {
      socket.off(eventName, callback)
    }
  }

  const once = (eventName, callback) => {
    if (socket) {
      socket.once(eventName, callback)
    }
  }

  // NOTE: Lifecycle hooks removed from composable to prevent multiple registrations
  // Connection management is now handled by the component using this composable

  return {
    socket: () => socket,
    isConnected,
    connectionError,
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
    setRoomContext,
    clearRoomContext,
    getPlayerID: getOrCreatePlayerID  // PHASE 1: Expose PlayerID getter
  }
}
