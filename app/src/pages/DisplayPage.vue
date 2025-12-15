<template>
  <div class="display-container">
    <!-- Main Display Area -->
    <div class="main-display">
      <!-- Waiting State -->
      <div v-if="!isQuestionDisplaying" class="waiting-display">
        <h1 class="waiting-title">🎮 Trivia Forge</h1>
        <p class="waiting-text">Waiting for questions...</p>
      </div>

      <!-- Question Display -->
      <div v-else class="question-display-area">
        <h2 class="question-text">{{ currentQuestion?.text }}</h2>
        <div class="choices-display">
          <div
            v-for="(answer, index) in currentQuestionAnswers"
            :key="answer.id"
            :class="['choice-display', { 'choice-correct': revealedAnswer?.id === answer.id }]"
          >
            <strong>{{ String.fromCharCode(65 + index) }}.</strong> {{ answer.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="sidebar-display">
      <!-- QR Code & Room Info -->
      <div class="sidebar-section">
        <h3 class="sidebar-title">Join the Game!</h3>
        <img v-if="qrCodeUrl" :src="qrCodeUrl" :alt="`QR code for room ${roomCode}`" class="qr-code" />
        <div class="room-code">{{ roomCode || '----' }}</div>
        <p class="sidebar-hint">Scan QR or enter code</p>
      </div>

      <!-- Players List -->
      <h3 class="sidebar-title">Players ({{ connectedPlayers }})</h3>
      <div class="players-list">
        <div v-if="nonSpectatorPlayers.length === 0" class="empty-state">
          <em>No players yet</em>
        </div>
        <div v-for="player in nonSpectatorPlayers" :key="player.id" class="player-item">
          <span class="player-name">{{ player.name }}</span>
          <span class="player-status" :class="getConnectionStateClass(player)">{{ getConnectionSymbol(player) }}</span>
        </div>
      </div>

      <!-- Status -->
      <div class="status-display">
        <div v-if="isConnected" class="status-connected">
          ✓ Connected to room
        </div>
        <div v-else class="status-disconnected">
          ○ Waiting for connection
        </div>
      </div>
    </div>

    <!-- Room Code Modal -->
    <Modal :isOpen="showRoomCodeModal" @close="() => {}" title="Enter Room Code">
      <p style="color: #aaa; margin-bottom: 1.5rem;">
        Enter the room code to spectate the game
      </p>
      <FormInput
        v-model="roomCodeInput"
        label="Room Code"
        type="text"
        placeholder="Enter 4-character code"
        @keypress.enter="joinRoom"
      />
      <template #footer>
        <button class="btn-primary" @click="joinRoom">Join Room</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSocket } from '@/composables/useSocket.js'
import { useUIStore } from '@/stores/ui.js'
import Modal from '@/components/common/Modal.vue'
import FormInput from '@/components/common/FormInput.vue'

const route = useRoute()
const socket = useSocket()
const uiStore = useUIStore()

const roomCode = ref(null)
const qrCodeUrl = ref(null)
const isConnected = ref(false)
const isQuestionDisplaying = ref(false)
const revealedAnswer = ref(null)
const showRoomCodeModal = ref(false)
const roomCodeInput = ref('')
const currentQuestion = ref(null)
const currentPlayers = ref([])

// Connection state management for spectator display
const connectionState = ref('connected')
const isPageVisible = ref(true)
const awayTimeout = ref(null)
const disconnectTimeout = ref(null)
const questionDisplayTimeout = ref(null)

const currentQuestionAnswers = computed(() => {
  if (!currentQuestion.value || !currentQuestion.value.choices) return []
  return currentQuestion.value.choices.map((text, index) => ({
    id: index,
    text: text
  }))
})
const connectedPlayers = computed(() => {
  return currentPlayers.value.filter(p => p.connected && !p.isSpectator).length
})

const nonSpectatorPlayers = computed(() => {
  return currentPlayers.value.filter(p => !p.isSpectator)
})

// Helper functions for connection states
const getConnectionStateClass = (player) => {
  const state = player.connectionState || 'connected'
  return `status-${state}`
}

const getConnectionSymbol = (player) => {
  const state = player.connectionState || 'connected'
  switch (state) {
    case 'connected': return '●' // Green
    case 'away': return '●' // Orange
    case 'disconnected': return '●' // Red
    case 'warning': return '⚠' // Yellow warning
    default: return '○'
  }
}

// Join room as spectator
const joinRoom = async () => {
  const code = roomCodeInput.value.trim().toUpperCase()
  if (!code) {
    uiStore.addNotification('Please enter a room code', 'warning')
    return
  }

  roomCode.value = code
  showRoomCodeModal.value = false

  // Fetch QR code for the room
  try {
    const response = await fetch(`/api/qr/room/${code}`)
    const data = await response.json()
    if (data.qrCode) {
      qrCodeUrl.value = data.qrCode
    }
  } catch (error) {
    console.error('Failed to fetch QR code:', error)
  }

  // Join the socket.io room to receive presenter events
  socket.emit('joinRoom', { roomCode: code, username: 'Display', displayName: 'Spectator Display' })
  socket.setRoomContext(code, 'Display')
}

// Initialize Socket.IO connection
onMounted(() => {
  const socketInstance = socket.connect()

  // Check for room code in URL query parameter (from QR code)
  const roomFromUrl = route.query.room
  if (roomFromUrl) {
    roomCodeInput.value = roomFromUrl.toUpperCase()
    // Auto-join the room after socket connects
    setTimeout(() => {
      joinRoom()
    }, 500)
  } else {
    // Show room code modal on load if no room code
    showRoomCodeModal.value = true
  }

  // Listen for player list updates (confirms room join)
  socket.on('playerListUpdate', ({ roomCode: code, players }) => {
    if (roomCode.value && code === roomCode.value) {
      currentPlayers.value = players || []
      if (!isConnected.value) {
        isConnected.value = true
        uiStore.addNotification(`Connected to room ${code}`, 'success')
      }
    }
  })

  // Listen for room error
  socket.on('roomError', (message) => {
    uiStore.addNotification(message, 'error')
    showRoomCodeModal.value = true
    roomCode.value = null
    isConnected.value = false
  })

  // Listen for question presentation
  socket.on('questionPresented', ({ questionIndex, question }) => {
    console.log('[DISPLAY] Question presented:', questionIndex)

    // Clear any existing display timeout from previous question
    if (questionDisplayTimeout.value) {
      clearTimeout(questionDisplayTimeout.value)
      questionDisplayTimeout.value = null
    }

    // Store the current question with its choices
    currentQuestion.value = {
      text: question.text,
      choices: question.choices || [],
      correctChoice: question.correctChoice
    }
    isQuestionDisplaying.value = true
    revealedAnswer.value = null
  })

  // Listen for answer reveal
  socket.on('questionRevealed', ({ questionIndex, question, answerDisplayTime }) => {
    console.log('[DISPLAY] Answer revealed for question:', questionIndex)
    console.log('[DISPLAY] Answer display time from server:', answerDisplayTime)

    // Show the correct answer
    if (question.correctChoice !== undefined && currentQuestion.value) {
      currentQuestion.value.correctChoice = question.correctChoice
      revealedAnswer.value = {
        id: question.correctChoice,
        text: currentQuestion.value.choices[question.correctChoice]
      }
    }

    // Clear any existing timeout
    if (questionDisplayTimeout.value) {
      clearTimeout(questionDisplayTimeout.value)
    }

    // Auto-reset after timeout (from server quiz options, default 30 seconds)
    const displayTimeout = (answerDisplayTime || 30) * 1000 // Convert seconds to milliseconds
    console.log('[DISPLAY] Setting timeout for', displayTimeout / 1000, 'seconds')

    questionDisplayTimeout.value = setTimeout(() => {
      console.log('[DISPLAY] Timeout fired - clearing question display')
      isQuestionDisplaying.value = false
      revealedAnswer.value = null
      currentQuestion.value = null
      questionDisplayTimeout.value = null
    }, displayTimeout)
  })

  // Listen for room closed
  socket.on('roomClosed', () => {
    isQuestionDisplaying.value = false
    isConnected.value = false
    currentPlayers.value = []
    uiStore.addNotification('Room has been closed', 'info')
    showRoomCodeModal.value = true
    roomCode.value = null
  })

  // Handle connection errors
  socket.on('connect_error', (error) => {
    isConnected.value = false
    uiStore.addNotification('Connection error - retrying...', 'warning')
  })
})

// Cleanup on unmount
onUnmounted(() => {
  socket.disconnect()

  // Clear any pending timeouts
  if (questionDisplayTimeout.value) {
    clearTimeout(questionDisplayTimeout.value)
  }
})
</script>

<style scoped>
.display-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
  overflow: hidden;
  position: relative;
  z-index: 100;
}

.main-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  overflow: hidden;
  min-width: 0;
}

.waiting-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.waiting-title {
  font-size: 4rem;
  margin: 0;
  color: #fff;
}

.waiting-text {
  font-size: 1.5rem;
  color: #aaa;
  margin: 0;
}

.question-display-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.3s ease-in;
}

.question-text {
  font-size: clamp(1.5rem, 5vw, 3rem);
  margin: 0 0 2rem 0;
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  color: #fff;
}

.choices-display {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  box-sizing: border-box;
}

.choice-display {
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  font-size: 1.5rem;
  text-align: center;
  transition: all 0.3s;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  line-height: 1.4;
  color: #fff;
}

.choice-display.choice-correct {
  background: rgba(0, 200, 0, 0.3);
  border-color: #0f0;
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.sidebar-display {
  width: 300px;
  min-width: 300px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow-y: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-section {
  text-align: center;
  margin-bottom: 2rem;
}

.sidebar-title {
  margin: 0 0 0.5rem 0;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
  font-size: var(--font-base);
  color: #fff;
  text-align: center;
}

.qr-code {
  width: 200px;
  height: 200px;
  background: white;
  padding: 10px;
  border-radius: 10px;
  margin-bottom: 1rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.room-code {
  font-size: 2rem;
  font-weight: bold;
  color: #0f0;
  margin-bottom: 0.5rem;
  letter-spacing: 2px;
}

.sidebar-hint {
  color: #aaa;
  font-size: 0.9rem;
  margin: 0;
}

.players-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.empty-state {
  color: #aaa;
  text-align: center;
  padding: 2rem 0;
  font-style: italic;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #fff;
  font-size: var(--font-sm);
}

.player-name {
  flex: 1;
  text-align: left;
}

.player-status {
  font-size: 1.5rem;
  margin-left: 0.5rem;
}

/* Connection states */
.player-status.status-connected {
  color: #0f0; /* Green */
}

.player-status.status-away {
  color: #ff8c00; /* Orange */
}

.player-status.status-disconnected {
  color: #f00; /* Red */
}

.player-status.status-warning {
  color: #ffd700; /* Yellow/Gold */
  animation: pulse-warning 1.5s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-display {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: #fff;
}

.status-connected {
  color: #0f0;
}

.status-disconnected {
  color: #aaa;
}

/* Modal button styles */
.btn-primary {
  padding: 0.75rem 1.5rem;
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  border-radius: 8px;
  color: #4fc3f7;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

@media (max-width: 768px) {
  .choices-display {
    grid-template-columns: 1fr;
  }

  .choice-display {
    font-size: 1.2rem;
    padding: 1.5rem;
  }

  .question-text {
    font-size: 2rem;
  }

  .sidebar-display {
    width: 100%;
    max-height: 40vh;
  }

  .display-container {
    flex-direction: column;
  }
}
</style>
