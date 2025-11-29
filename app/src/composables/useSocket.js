import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.js'

let socket = null

export function useSocket() {
  const isConnected = ref(false)
  const connectionError = ref(null)
  const authStore = useAuthStore()

  const connect = () => {
    if (socket?.connected) {
      return socket
    }

    socket = io(window.location.origin, {
      auth: {
        token: authStore.token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      isConnected.value = true
      connectionError.value = null
      console.log('Socket.IO connected')
    })

    socket.on('disconnect', () => {
      isConnected.value = false
      console.log('Socket.IO disconnected')
    })

    socket.on('connect_error', (error) => {
      connectionError.value = error.message
      console.error('Socket.IO connection error:', error)
    })

    return socket
  }

  const disconnect = () => {
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
    once
  }
}
