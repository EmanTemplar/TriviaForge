import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.js'

let socket = null
let heartbeatInterval = null

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
          username: currentUsername.value
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
    if (socket?.connected) {
      return socket
    }

    socket = io(window.location.origin, {
      auth: {
        token: authStore.token
      },
      reconnection: true,
      reconnectionDelay: 1000,           // Start with 1 second delay
      reconnectionDelayMax: 10000,       // Max 10 seconds between attempts (increased from 5s)
      reconnectionAttempts: Infinity,    // Never give up reconnecting (was 5)
      timeout: 20000,                    // 20 second connection timeout
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      upgrade: true                      // Allow upgrading from polling to websocket
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
    stopHeartbeat()
    if (socket?.connected) {
      socket.disconnect()
      socket = null
      isConnected.value = false
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
