import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.js'

let socket = null
let heartbeatInterval = null
let onlineHandler = null
let offlineHandler = null

export function useSocket() {
  const isConnected = ref(false)
  const connectionError = ref(null)
  const authStore = useAuthStore()
  const currentRoomCode = ref(null)
  const currentUsername = ref(null)

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
    // If socket exists (even if disconnected), reuse it instead of creating a new one
    // This prevents multiple socket instances on mobile refresh
    if (socket) {
      console.log(`[SOCKET] Reusing existing socket (connected: ${socket.connected})`)
      if (!socket.connected) {
        console.log('[SOCKET] Triggering reconnection on existing socket')
        socket.connect()
      }
      return socket
    }

    console.log('[SOCKET] Creating new socket instance')
    socket = io(window.location.origin, {
      auth: {
        token: authStore.token
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

      // Restart heartbeat if we were in a room
      if (currentRoomCode.value) {
        startHeartbeat()
      }
    })

    socket.on('disconnect', () => {
      isConnected.value = false
      stopHeartbeat()
      console.log('Socket.IO disconnected')
    })

    socket.on('connect_error', (error) => {
      connectionError.value = error.message
      console.error('Socket.IO connection error:', error)
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

    return socket
  }

  const setRoomContext = (roomCode, username) => {
    currentRoomCode.value = roomCode
    currentUsername.value = username

    // Start heartbeat when joining a room
    if (roomCode && username && socket?.connected) {
      startHeartbeat()
    }
  }

  const clearRoomContext = () => {
    stopHeartbeat()
    currentRoomCode.value = null
    currentUsername.value = null
  }

  const disconnect = () => {
    console.log('[SOCKET] disconnect() called')
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
      socket.disconnect()
      socket = null
      isConnected.value = false
    } else {
      console.log('[SOCKET] disconnect() called but socket was already null')
    }
  }

  const emit = (eventName, ...args) => {
    if (socket?.connected) {
      socket.emit(eventName, ...args)
    } else {
      console.warn(`Socket.IO event "${eventName}" not sent: not connected`)
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

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    // Don't disconnect on unmount - keep connection alive for app lifetime
    // disconnect()
  })

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
    clearRoomContext
  }
}
