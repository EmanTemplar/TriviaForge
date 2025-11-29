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
            {{ answer.text }}
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
        <div v-if="participants.length === 0" class="empty-state">
          <em>No players yet</em>
        </div>
        <div v-for="player in participants" :key="player.id" class="player-item">
          <span class="player-name">{{ player.username }}</span>
          <span v-if="player.connected" class="player-status online">●</span>
          <span v-else class="player-status offline">●</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSocket } from '@/composables/useSocket.js'
import { useQuestionStore } from '@/stores/question.js'
import { useRoomStore } from '@/stores/room.js'
import { useUIStore } from '@/stores/ui.js'

const socket = useSocket()
const questionStore = useQuestionStore()
const roomStore = useRoomStore()
const uiStore = useUIStore()

const roomCode = ref(null)
const qrCodeUrl = ref(null)
const isConnected = ref(false)
const isQuestionDisplaying = ref(false)
const revealedAnswer = ref(null)

const currentQuestion = computed(() => roomStore.currentQuestion)
const currentQuestionAnswers = computed(() => {
  if (!currentQuestion.value) return []
  return questionStore.getAnswersForQuestion(currentQuestion.value.id) || []
})
const participants = computed(() => roomStore.participants)
const connectedPlayers = computed(() => roomStore.connectedParticipants)

// Initialize Socket.IO connection
onMounted(() => {
  const socketInstance = socket.connect()

  // Listen for room initialization
  socket.on('roomCreated', (data) => {
    roomCode.value = data.room_code
    qrCodeUrl.value = data.qr_code_url
    roomStore.setRoom(data.room, data.room_code, data.session_id)
    isConnected.value = true
    uiStore.addNotification(`Connected to room ${data.room_code}`, 'success')
  })

  // Listen for question presentation
  socket.on('questionPresented', (data) => {
    const question = {
      id: data.question_id,
      text: data.question_text
    }
    roomStore.setCurrentQuestion(question, data.question_index, data.total_questions)
    isQuestionDisplaying.value = true
    revealedAnswer.value = null
  })

  // Listen for answer reveal
  socket.on('answerRevealed', (data) => {
    revealedAnswer.value = {
      id: data.correct_answer_id,
      text: data.correct_answer_text
    }
  })

  // Listen for participant updates
  socket.on('participantsUpdated', (data) => {
    roomStore.updateParticipants(data.participants)
  })

  // Listen for room closed
  socket.on('roomClosed', () => {
    isQuestionDisplaying.value = false
    isConnected.value = false
    uiStore.addNotification('Room has been closed', 'info')
  })

  // Handle connection errors
  socket.on('connect_error', (error) => {
    isConnected.value = false
    uiStore.addNotification('Connection error - retrying...', 'warning')
  })
})

// Cleanup on unmount
onUnmounted(() => {
  roomStore.clearRoom()
})
</script>

<style scoped>
.display-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
  overflow: hidden;
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
  box-sizing: border-box;
}

.choice-display {
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  font-size: 1.5rem;
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

.player-status.online {
  color: #0f0;
}

.player-status.offline {
  color: #aaa;
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
