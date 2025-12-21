<template>
  <div class="presenter-page">
    <!-- Navigation Bar -->
    <nav class="navbar">
      <div class="logo">Trivia Presenter</div>
      <div class="room-code" v-if="currentRoomCode">Room: {{ currentRoomCode }}</div>
      <div v-else class="room-code"></div>
      <div class="hamburger" @click.stop="toggleMenu" id="hamburger">&#9776;</div>
      <ul class="menu" :class="{ open: menuOpen }" id="menu">
        <li><RouterLink to="/admin">Admin</RouterLink></li>
        <li><RouterLink to="/player">Player</RouterLink></li>
        <li><RouterLink to="/presenter/room">Presenter</RouterLink></li>
        <li><RouterLink to="/display">Spectate</RouterLink></li>
        <li class="username-item">
          <span>{{ authStore.username || 'Admin' }}</span>
        </li>
        <li>
          <a href="#" @click.prevent="logout" style="color: #f66;">Logout</a>
        </li>
      </ul>
    </nav>

    <!-- Main Content -->
    <div class="presenter-container">
      <!-- Left Column: Create Room + Resume Session + Active Rooms -->
      <section class="presenter-sidebar">
        <!-- Create Room -->
        <div class="presenter-widget">
          <h2>Create Room</h2>
          <select v-model="selectedQuizFilename" @change="closeMenuIfOutside">
            <option value="">Select a quiz</option>
            <option v-for="quiz in quizzes" :key="quiz.filename" :value="quiz.filename">
              {{ quiz.title }}
            </option>
          </select>
          <button @click="makeRoomLive" :disabled="!selectedQuizFilename">Make Live</button>
          <button @click="showQRModal" :disabled="!currentRoomCode">Show Player QR Code</button>
        </div>

        <!-- Resume Session -->
        <div class="presenter-widget">
          <h2>Resume Session</h2>
          <select v-model="selectedSessionFilename">
            <option value="">{{ incompleteSessions.length === 0 ? 'No incomplete sessions' : 'Select session to resume' }}</option>
            <option v-for="session in incompleteSessions" :key="session.filename" :value="session.filename">
              {{ session.quizTitle }} ({{ session.roomCode }}) - {{ session.status === 'interrupted' ? '⚠️ Interrupted' : '⏸️ In Progress' }} - {{ formatSessionDate(session) }}
            </option>
          </select>
          <button @click="resumeSession" :disabled="incompleteSessions.length === 0 || !selectedSessionFilename">Resume</button>
        </div>

        <!-- Active Rooms -->
        <div class="presenter-widget flex-grow">
          <h2>Active Rooms</h2>
          <div class="active-rooms-list">
            <div v-if="activeRooms.length === 0" class="empty-state"><em>No active rooms</em></div>
            <div v-for="room in activeRooms" :key="room.roomCode" class="roomCard" :class="{ activeRoom: room.roomCode === currentRoomCode }" @click="viewRoom(room.roomCode)">
              <div><strong>{{ room.quizTitle }}</strong> ({{ room.roomCode }})</div>
              <div>{{ room.playerCount }} player(s)</div>
              <button @click.stop="closeRoom(room.roomCode)">Close</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Middle Column: Quiz Display -->
      <section id="quizDisplay" class="quiz-display">
        <h2 id="quizTitle">{{ currentQuizTitle || 'No Quiz Loaded' }}</h2>
        <div v-if="currentQuestions.length > 0" id="questionsSection" class="questions-section">
          <div id="questionsList" class="questions-list">
            <div v-for="(question, idx) in currentQuestions" :key="idx"
                 class="questionCard"
                 :class="{ presented: idx === currentQuestionIndex }"
                 @click="selectQuestion(idx)">
              <div class="question-header">
                <strong>Q{{ idx + 1 }}:</strong> {{ question.text }}
                <span v-if="idx === presentedQuestionIndex" class="status-badge live">● LIVE</span>
                <span v-else-if="presentedQuestions.includes(idx)" class="status-badge presented">✓ Presented</span>
                <span v-if="revealedQuestions.includes(idx)" class="status-badge revealed">✓ Revealed</span>
              </div>
              <ul>
                <li v-for="(choice, choiceIdx) in question.choices" :key="choiceIdx"
                    :style="question.correctChoice === choiceIdx ? { color: '#0f0' } : {}">
                  {{ choice }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Presenter Controls -->
          <div class="presenter-controls">
            <div class="presenter-controls-row">
              <button @click="previousQuestion">← Previous</button>
              <button @click="nextQuestion">Next →</button>
              <button @click="presentQuestion">Present Question to Players</button>
              <button @click="revealAnswer" :disabled="presentedQuestionIndex === null">Reveal Answer</button>
            </div>
            <button class="btn-complete" @click="completeQuiz" :disabled="!currentRoomCode">Complete Quiz & Save Results</button>
          </div>
        </div>
        <div v-else class="empty-state">
          <em>No quiz loaded</em>
        </div>
      </section>

      <!-- Right Column: Connected Players -->
      <section class="presenter-players">
        <h2>Connected Players</h2>
        <button v-if="currentRoomCode" class="btn-standings" @click="showPresenterProgress">📊 Standings</button>
        <div id="playerList" class="live-feed">
          <div v-if="nonSpectatorPlayers.length === 0" class="empty-state"><em>No players yet</em></div>
          <div v-for="player in nonSpectatorPlayers" :key="player.name" class="player-item">
            <span class="player-status" :class="getConnectionStateClass(player)">{{ getConnectionSymbol(player) }}</span>
            {{ player.name }}
            <span v-if="player.connectionState === 'warning'" class="player-warning-icon" title="Rapid switching detected">⚠️</span>
            <span v-if="player.choice !== null" class="player-answered">✓</span>
            <div class="player-menu-container">
              <button class="btn-player-menu" @click="togglePlayerMenu(player.name)" title="Player actions">⋮</button>
              <div v-if="playerMenuOpen === player.name" class="player-menu">
                <button @click="kickPlayer(player.name)" class="menu-item menu-item-kick">
                  <span class="menu-icon">👢</span> Kick Player
                </button>
                <button @click="banDisplayName(player.name)" class="menu-item menu-item-ban">
                  <span class="menu-icon">🚫</span> Ban Display Name
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- QR Code Modal -->
    <Modal :isOpen="showQRCodeModal" size="medium" title="Scan to Join" @close="showQRCodeModal = false">
      <template #default>
        <div class="qr-content">
          <img v-if="qrCodeData" :src="qrCodeData" alt="QR Code" class="qr-image" />
          <p v-if="qrCodeUrl" class="qr-url">{{ qrCodeUrl }}</p>
          <p v-if="!qrCodeData" class="loading">Generating QR code...</p>
        </div>
      </template>
    </Modal>

    <!-- Presenter Progress Modal (Live Standings) -->
    <Modal :isOpen="showProgressModal" size="large" title="📊 Live Standings" @close="showProgressModal = false">
      <template #default>
        <div class="progress-modal-content">
          <!-- Overall Stats Summary -->
          <div v-if="progressStats" class="overall-stats">
            <div class="stat-card">
              <div class="stat-value">{{ progressStats.totalPlayers }}</div>
              <div class="stat-label">Players</div>
            </div>
            <div class="stat-card correct">
              <div class="stat-value">{{ progressStats.totalCorrect }}</div>
              <div class="stat-label">Total Correct</div>
            </div>
            <div class="stat-card incorrect">
              <div class="stat-value">{{ progressStats.totalIncorrect }}</div>
              <div class="stat-label">Total Incorrect</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ progressStats.overallAccuracy }}%</div>
              <div class="stat-label">Class Accuracy</div>
            </div>
            <div class="stat-card orange">
              <div class="stat-value">{{ progressStats.avgCorrect }}</div>
              <div class="stat-label">Avg per Player</div>
            </div>
          </div>

          <!-- Standings Table -->
          <div v-if="sortedPlayers.length > 0" class="standings-wrapper">
            <h4>Player Standings</h4>
            <table class="standings-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Player</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Accuracy</th>
                  <th>Answered</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(player, idx) in sortedPlayers" :key="player.name" :class="['standings-row', getRankClass(idx)]">
                  <td class="rank">{{ getMedal(idx) || idx + 1 }}</td>
                  <td class="player-name">{{ player.name }}</td>
                  <td class="correct">{{ player.correct }}</td>
                  <td class="incorrect">{{ player.answered - player.correct }}</td>
                  <td class="accuracy">{{ getAccuracy(player) }}%</td>
                  <td class="answered">{{ player.answered }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty state -->
          <div v-else class="empty-state-standings">
            <div class="empty-icon">📝</div>
            <p>No players have answered yet!</p>
            <p class="empty-hint">Standings will appear here once you present questions and players start answering.</p>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Custom Dialog Modal -->
    <Modal :isOpen="showDialog" size="small" :title="dialogTitle" @close="handleDialogCancel">
      <template #default>
        <p class="dialog-message">{{ dialogMessage }}</p>
      </template>
      <template #footer>
        <div class="dialog-buttons">
          <button v-if="dialogType === 'confirm'" @click="handleDialogCancel" class="btn-secondary">Cancel</button>
          <button @click="handleDialogConfirm" :class="['btn-primary', { 'btn-danger': dialogType === 'confirm' }]">
            {{ dialogType === 'confirm' ? 'Confirm' : 'OK' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Answer Reveal Modal -->
    <Modal :isOpen="showAnswerRevealModal" size="large" title="Answer Revealed!" @close="showAnswerRevealModal = false">
      <template #default>
        <div v-if="answerRevealData" class="answer-reveal-content">
          <div class="correct-answer-box">
            <div class="label">Correct Answer:</div>
            <div class="answer">{{ answerRevealData.question.choices[answerRevealData.question.correctChoice] }}</div>
          </div>

          <div class="answer-stats">
            <div><strong>{{ answerRevealData.correctCount }}/{{ answerRevealData.answeredCount }}</strong> correct</div>
            <div><strong>{{ answerRevealData.correctPercentage }}%</strong> accuracy</div>
            <div><strong>{{ answerRevealData.totalPlayers - answerRevealData.answeredCount }}</strong> no answer</div>
          </div>

          <div v-if="answerRevealData.results.length > 0" class="player-responses">
            <div class="label">Player Responses:</div>
            <table class="response-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Answer</th>
                  <th style="width: 60px;">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in answerRevealData.results" :key="result.name" :class="getResultRowClass(result, answerRevealData.question)">
                  <td class="player-name">{{ result.name }}</td>
                  <td class="answer-text">{{ result.choice !== null ? answerRevealData.question.choices[result.choice] : 'No answer' }}</td>
                  <td class="result-icon">{{ getResultIcon(result) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="dialog-buttons">
          <button @click="showAnswerRevealModal = false" class="btn-primary">Close</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import { useSocket } from '@/composables/useSocket.js'
import { useApi } from '@/composables/useApi.js'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const socket = useSocket()
const { post, get } = useApi()
const authStore = useAuthStore()

// UI State
const menuOpen = ref(false)
const showQRCodeModal = ref(false)
const showProgressModal = ref(false)
const showDialog = ref(false)
const showAnswerRevealModal = ref(false)

// Dialog state
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogType = ref('alert') // 'alert' or 'confirm'
let dialogResolve = null

// Quiz and Room state
const selectedQuizFilename = ref('')
const quizzes = ref([])
const currentRoomCode = ref(null)
const currentQuizFilename = ref(null) // Track quiz filename for reconnection
const currentQuizTitle = ref('')
const currentQuestions = ref([])
const currentQuestionIndex = ref(-1)
const presentedQuestionIndex = ref(null)
const presentedQuestions = ref([])
const revealedQuestions = ref([])

// Session state
const selectedSessionFilename = ref('')
const incompleteSessions = ref([])

// Players and progress
const connectedPlayers = ref([])
const activeRooms = ref([])
const progressStats = ref(null)
const sortedPlayers = ref([])

// Computed: Filter out spectators from connected players
const nonSpectatorPlayers = computed(() => {
  return connectedPlayers.value.filter(p => !p.isSpectator)
})

// Answer reveal modal data
const answerRevealData = ref(null)

// QR Code
const qrCodeData = ref(null)
const qrCodeUrl = ref(null)
const playerMenuOpen = ref(null) // Track which player's menu is open

// Load quizzes on mount
const loadQuizzes = async () => {
  try {
    const response = await get('/api/quizzes')
    quizzes.value = response.data
  } catch (err) {
    console.error('Error loading quizzes:', err)
  }
}

// Load incomplete sessions
const loadIncompleteSessions = async () => {
  try {
    const response = await get('/api/sessions/incomplete')
    incompleteSessions.value = response.data
  } catch (err) {
    console.error('Error loading incomplete sessions:', err)
  }
}

// Format session date for display
const formatSessionDate = (session) => {
  const date = session.resumedAt ? new Date(session.resumedAt) : new Date(session.createdAt)
  const dateLabel = session.resumedAt ? 'Resumed' : 'Started'
  const icon = session.resumedAt ? '↻ ' : ''
  return `${icon}${dateLabel}: ${date.toLocaleString()}`
}

// Dialog functions
const showAlert = (message, title = 'Notification') => {
  return new Promise((resolve) => {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogType.value = 'alert'
    dialogResolve = resolve
    showDialog.value = true
  })
}

const showConfirm = (message, title = 'Confirm Action') => {
  return new Promise((resolve) => {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogType.value = 'confirm'
    dialogResolve = resolve
    showDialog.value = true
  })
}

const handleDialogConfirm = () => {
  showDialog.value = false
  dialogResolve?.(true)
  dialogResolve = null
}

const handleDialogCancel = () => {
  showDialog.value = false
  dialogResolve?.(false)
  dialogResolve = null
}

// Make room live
const makeRoomLive = async () => {
  if (!selectedQuizFilename.value) {
    await showAlert('Select a quiz first', 'No Quiz Selected')
    return
  }
  const roomCode = Math.floor(1000 + Math.random() * 9000).toString()
  currentQuizFilename.value = selectedQuizFilename.value // Store for reconnection
  socket.emit('createRoom', { roomCode, quizFilename: selectedQuizFilename.value })
}

// Resume session
const resumeSession = async () => {
  if (!selectedSessionFilename.value) {
    await showAlert('Select a session to resume', 'No Session Selected')
    return
  }
  const session = incompleteSessions.value.find(s => s.filename === selectedSessionFilename.value)
  const confirmed = await showConfirm(
    `Resume session for "${session.quizTitle}" (original room: ${session.roomCode})?\n\nPlayers will need to rejoin with their original names to keep their progress.`,
    'Resume Session'
  )
  if (confirmed) {
    socket.emit('resumeSession', { sessionFilename: selectedSessionFilename.value })
  }
}

// View room
const viewRoom = (roomCode) => {
  currentRoomCode.value = roomCode
  socket.emit('viewRoom', { roomCode })
}

// Close room
const closeRoom = async (roomCode) => {
  const confirmed = await showConfirm(`Close room ${roomCode}?`, 'Close Room')
  if (confirmed) {
    socket.emit('closeRoom', { roomCode })
    if (currentRoomCode.value === roomCode) {
      resetRoom()
    }
  }
}

// Select question
const selectQuestion = (index) => {
  currentQuestionIndex.value = index
}

// Navigation buttons
const previousQuestion = async () => {
  if (!currentRoomCode.value) {
    await showAlert('No room selected.', 'No Room')
    return
  }
  if (!currentQuestions.value.length) {
    await showAlert('No questions loaded.', 'No Questions')
    return
  }
  if (currentQuestionIndex.value <= 0) {
    await showAlert('Already at first question.', 'First Question')
    return
  }
  currentQuestionIndex.value--
}

const nextQuestion = async () => {
  if (!currentRoomCode.value) {
    await showAlert('No room selected.', 'No Room')
    return
  }
  if (!currentQuestions.value.length) {
    await showAlert('No questions loaded.', 'No Questions')
    return
  }
  if (currentQuestionIndex.value >= currentQuestions.value.length - 1) {
    await showAlert('Already at last question.', 'Last Question')
    return
  }
  currentQuestionIndex.value++
}

// Present question
const presentQuestion = async () => {
  if (!currentRoomCode.value) {
    await showAlert('No room selected.', 'No Room')
    return
  }
  if (currentQuestionIndex.value < 0) {
    await showAlert('No question selected.', 'No Question')
    return
  }
  if (!currentQuestions.value.length) {
    await showAlert('No questions loaded.', 'No Questions')
    return
  }
  presentedQuestionIndex.value = currentQuestionIndex.value
  socket.emit('presentQuestion', { roomCode: currentRoomCode.value, questionIndex: currentQuestionIndex.value })
}

// Reveal answer
const revealAnswer = async () => {
  if (!currentRoomCode.value) {
    await showAlert('No room selected.', 'No Room')
    return
  }
  if (presentedQuestionIndex.value === null) {
    await showAlert('Please present a question to players first.', 'No Question Presented')
    return
  }
  socket.emit('revealAnswer', { roomCode: currentRoomCode.value })
}

// Complete quiz
const completeQuiz = async () => {
  if (!currentRoomCode.value) {
    await showAlert('No room selected.', 'No Room')
    return
  }
  const confirmed = await showConfirm('Complete this quiz and save all results? This will mark the session as finished.', 'Complete Quiz')
  if (confirmed) {
    socket.emit('completeQuiz', { roomCode: currentRoomCode.value })
  }
}

// Kick player from room
const kickPlayer = async (playerName) => {
  playerMenuOpen.value = null // Close menu
  const confirmed = await showConfirm(`Remove ${playerName} from the session?`, 'Remove Player')
  if (confirmed) {
    socket.emit('kickPlayer', { roomCode: currentRoomCode.value, username: playerName })
  }
}

// Toggle player menu
const togglePlayerMenu = (playerName) => {
  if (playerMenuOpen.value === playerName) {
    playerMenuOpen.value = null
  } else {
    playerMenuOpen.value = playerName
  }
}

// Ban display name
const banDisplayName = async (playerName) => {
  playerMenuOpen.value = null // Close menu
  const confirmed = await showConfirm(
    `Ban the display name "${playerName}"?\n\nThis will:\n- Add "${playerName}" to the globally banned names list\n- Kick the player from this session\n- Prevent anyone from using this display name in the future\n\nChoose matching type:\nClick "Confirm" for EXACT match, or "Cancel" to go back.`,
    'Ban Display Name'
  )

  if (!confirmed) return

  try {
    // Add to banned names list
    await post('/api/banned-names', {
      pattern: playerName,
      patternType: 'exact'
    })

    // Kick the player
    socket.emit('kickPlayer', { roomCode: currentRoomCode.value, username: playerName })

    await showAlert(`Display name "${playerName}" has been banned globally.`, 'Name Banned')
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to ban display name'
    await showAlert(message, 'Error')
    console.error('Error banning display name:', err)
  }
}

// Show QR Code
const showQRModal = async () => {
  try {
    let url = '/api/qr/player'
    if (currentRoomCode.value) {
      url = `/api/qr/room/${currentRoomCode.value}`
    }
    const response = await get(url)
    qrCodeData.value = response.data.qrCode
    qrCodeUrl.value = response.data.url
    showQRCodeModal.value = true
  } catch (err) {
    await showAlert('Failed to generate QR code', 'QR Code Error')
    console.error(err)
  }
}

// Show presenter progress
const showPresenterProgress = async () => {
  if (!currentRoomCode.value) {
    await showAlert('No room selected', 'No Room')
    return
  }
  showProgressModal.value = true
  await fetchPresenterProgress()
}

// Fetch presenter progress
const fetchPresenterProgress = async () => {
  try {
    const response = await get(`/api/room/progress/${currentRoomCode.value}`)
    const roomProgress = response.data

    // Filter out spectators from all statistics
    const nonSpectatorPlayers = roomProgress.players ? roomProgress.players.filter(p => !p.isSpectator) : []

    if (nonSpectatorPlayers.length === 0 || !nonSpectatorPlayers.some(p => p.answered > 0)) {
      progressStats.value = null
      sortedPlayers.value = []
      return
    }

    // Sort players (excluding spectators)
    const sorted = [...nonSpectatorPlayers].sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct
      if (a.answered === 0 && b.answered === 0) return 0
      const accuracyA = a.answered > 0 ? (a.correct / a.answered) : 0
      const accuracyB = b.answered > 0 ? (b.correct / b.answered) : 0
      return accuracyB - accuracyA
    })
    sortedPlayers.value = sorted

    // Calculate overall stats (excluding spectators)
    const totalPlayers = sorted.length
    const totalAnswered = sorted.reduce((sum, p) => sum + p.answered, 0)
    const totalCorrect = sorted.reduce((sum, p) => sum + p.correct, 0)
    const totalIncorrect = sorted.reduce((sum, p) => sum + (p.answered - p.correct), 0)
    const overallAccuracy = totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : '0.0'
    const avgCorrect = totalPlayers > 0 ? (totalCorrect / totalPlayers).toFixed(1) : '0.0'

    progressStats.value = {
      totalPlayers,
      totalCorrect,
      totalIncorrect,
      overallAccuracy,
      avgCorrect
    }
  } catch (err) {
    console.error('Error fetching presenter progress:', err)
    progressStats.value = null
    sortedPlayers.value = []
  }
}

// Helper functions
const getAccuracy = (player) => {
  return player.answered > 0 ? ((player.correct / player.answered) * 100).toFixed(1) : '-'
}

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

const getRankClass = (idx) => {
  if (idx === 0) return 'gold'
  if (idx === 1) return 'silver'
  if (idx === 2) return 'bronze'
  return ''
}

const getMedal = (idx) => {
  if (idx === 0) return '🥇'
  if (idx === 1) return '🥈'
  if (idx === 2) return '🥉'
  return null
}

const getResultIcon = (result) => {
  if (result.is_correct) return '✓'
  if (result.choice !== null) return '✗'
  return '—'
}

const getResultRowClass = (result) => {
  if (result.is_correct) return 'correct'
  if (result.choice !== null) return 'incorrect'
  return 'no-answer'
}

// Menu toggle
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenuIfOutside = (e) => {
  const menu = document.getElementById('menu')
  const hamburger = document.getElementById('hamburger')
  if (menu && menu.classList && menu.classList.contains('open') && !menu.contains(e.target) && e.target !== hamburger) {
    menuOpen.value = false
  }
}

// Reset room state
const resetRoom = () => {
  currentRoomCode.value = null
  currentQuizFilename.value = null
  currentQuestions.value = []
  currentQuestionIndex.value = -1
  presentedQuestionIndex.value = null
  currentQuizTitle.value = 'No Quiz Loaded'
  connectedPlayers.value = []
}

// Logout
const logout = async (e) => {
  e.preventDefault()
  try {
    await post('/api/auth/logout', {})
  } catch (err) {
    console.error('Logout error:', err)
  }
  authStore.logout()
  router.push({name: 'login'})
}

// Socket event handlers
const setupSocketListeners = () => {
  const socketInstance = socket.connect()

  // Handle socket connection
  socketInstance.on('connect', () => {
    console.log('[PRESENTER] Socket connected')
    // Presenter manages multiple rooms from a list - they'll click to view the room they want
  })

  socketInstance.on('roomCreated', ({ roomCode, quizFilename, quizTitle, questions, currentQuestionIndex: serverCurrentQuestionIndex, presentedQuestions: serverPresentedQuestions, revealedQuestions: serverRevealedQuestions, isResumed, originalRoomCode }) => {
    currentRoomCode.value = roomCode
    currentQuizFilename.value = quizFilename // Store for reconnection
    currentQuestions.value = questions || []
    presentedQuestions.value = serverPresentedQuestions || []
    revealedQuestions.value = serverRevealedQuestions || []
    currentQuizTitle.value = quizTitle

    // Restore current question state from server
    console.log('[PRESENTER] Reconnection state:', {
      serverCurrentQuestionIndex,
      presentedQuestions: serverPresentedQuestions,
      revealedQuestions: serverRevealedQuestions
    })

    if (serverCurrentQuestionIndex !== null && serverCurrentQuestionIndex !== undefined) {
      currentQuestionIndex.value = serverCurrentQuestionIndex

      // Check if this question is presented but not yet revealed
      const isPresented = presentedQuestions.value.includes(serverCurrentQuestionIndex)
      const isRevealed = revealedQuestions.value.includes(serverCurrentQuestionIndex)

      console.log('[PRESENTER] Question status check:', {
        questionIndex: serverCurrentQuestionIndex,
        isPresented,
        isRevealed,
        willRestore: isPresented && !isRevealed
      })

      if (isPresented && !isRevealed) {
        // Question is live - enable "Reveal Answer" button
        presentedQuestionIndex.value = serverCurrentQuestionIndex
        console.log(`[PRESENTER] ✅ Restored live question ${serverCurrentQuestionIndex} (presented but not revealed)`)
      } else {
        presentedQuestionIndex.value = null
        console.log(`[PRESENTER] ❌ Question ${serverCurrentQuestionIndex} not live (presented: ${isPresented}, revealed: ${isRevealed})`)
      }
    } else {
      // No active question - start at beginning
      currentQuestionIndex.value = 0
      presentedQuestionIndex.value = null
      console.log('[PRESENTER] No active question - starting fresh')
    }

    if (isResumed) {
      showAlert(`Session resumed!\n\nNew room code: ${roomCode}\nOriginal room: ${originalRoomCode}\n\nPlayers should rejoin with their original names.`, 'Session Resumed')
    }
  })

  socketInstance.on('roomRestored', ({ roomCode, quizTitle, questions, currentQuestionIndex: serverCurrentQuestionIndex, players, presentedQuestions: serverPresentedQuestions, revealedQuestions: serverRevealedQuestions }) => {
    if (roomCode !== currentRoomCode.value) return
    currentQuestions.value = questions || []
    presentedQuestions.value = serverPresentedQuestions || []
    revealedQuestions.value = serverRevealedQuestions || []
    currentQuizTitle.value = quizTitle
    connectedPlayers.value = players || []

    // Restore current question state from server
    console.log('[PRESENTER] Room restored state:', {
      serverCurrentQuestionIndex,
      presentedQuestions: serverPresentedQuestions,
      revealedQuestions: serverRevealedQuestions
    })

    if (serverCurrentQuestionIndex !== null && serverCurrentQuestionIndex !== undefined) {
      currentQuestionIndex.value = serverCurrentQuestionIndex

      // Check if this question is presented but not yet revealed
      const isPresented = presentedQuestions.value.includes(serverCurrentQuestionIndex)
      const isRevealed = revealedQuestions.value.includes(serverCurrentQuestionIndex)

      console.log('[PRESENTER] Question status check:', {
        questionIndex: serverCurrentQuestionIndex,
        isPresented,
        isRevealed,
        willRestore: isPresented && !isRevealed
      })

      if (isPresented && !isRevealed) {
        // Question is live - enable "Reveal Answer" button
        presentedQuestionIndex.value = serverCurrentQuestionIndex
        console.log(`[PRESENTER] ✅ Restored live question ${serverCurrentQuestionIndex} (presented but not revealed)`)
      } else {
        presentedQuestionIndex.value = null
        console.log(`[PRESENTER] ❌ Question ${serverCurrentQuestionIndex} not live (presented: ${isPresented}, revealed: ${isRevealed})`)
      }
    } else {
      // No active question - start at beginning
      currentQuestionIndex.value = 0
      presentedQuestionIndex.value = null
      console.log('[PRESENTER] No active question in restored room')
    }
  })

  socketInstance.on('playerListUpdate', ({ roomCode, players }) => {
    if (roomCode !== currentRoomCode.value) return
    connectedPlayers.value = players || []
  })

  socketInstance.on('activeRoomsUpdate', (rooms) => {
    activeRooms.value = rooms
  })

  socketInstance.on('roomClosed', ({ roomCode }) => {
    if (currentRoomCode.value === roomCode) {
      showAlert('Room closed.', 'Room Closed')
      resetRoom()
    }
  })

  socketInstance.on('questionPresented', ({ questionIndex, question, presentedQuestions: serverPresentedQuestions }) => {
    if (serverPresentedQuestions) {
      presentedQuestions.value = serverPresentedQuestions
    }
  })

  socketInstance.on('questionRevealed', ({ questionIndex, question, results, revealedQuestions: serverRevealedQuestions }) => {
    if (serverRevealedQuestions) {
      revealedQuestions.value = serverRevealedQuestions
    }

    // Filter out spectators from results by cross-referencing with connectedPlayers
    const nonSpectatorResults = results.filter(r => {
      // Check if this result has isSpectator property directly
      if (r.isSpectator !== undefined) {
        return !r.isSpectator
      }
      // Otherwise, check against connectedPlayers list
      const player = connectedPlayers.value.find(p => p.name === r.name)
      return !player || !player.isSpectator
    })

    // Show answer reveal modal (excluding spectators)
    const totalPlayers = nonSpectatorResults.length
    const correctCount = nonSpectatorResults.filter(r => r.is_correct).length
    const answeredCount = nonSpectatorResults.filter(r => r.choice !== null).length
    const correctPercentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    answerRevealData.value = {
      question,
      results: nonSpectatorResults,
      totalPlayers,
      correctCount,
      answeredCount,
      correctPercentage
    }
    showAnswerRevealModal.value = true
  })

  socketInstance.on('quizCompleted', ({ message, filename }) => {
    showAlert(message, 'Quiz Completed')
    loadIncompleteSessions()
  })

  // Request initial active rooms
  socketInstance.emit('getActiveRooms')
}

// Lifecycle
onMounted(() => {
  loadQuizzes()
  loadIncompleteSessions()
  setupSocketListeners()
  document.addEventListener('click', closeMenuIfOutside)
  document.addEventListener('touchstart', closeMenuIfOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuIfOutside)
  document.removeEventListener('touchstart', closeMenuIfOutside)
})
</script>

<style scoped>
.presenter-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0d1117;
  color: #c9d1d9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.navbar {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
  flex-wrap: wrap;
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  color: #4fc3f7;
}

.room-code {
  color: #aaa;
  font-size: 0.9rem;
  flex: 1;
  text-align: center;
  min-height: 20px;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #4fc3f7;
}

.menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
  align-items: center;
}

.menu li {
  white-space: nowrap;
}

.menu a {
  color: #c9d1d9;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu a:hover {
  background: rgba(79, 195, 247, 0.2);
}

.username-item {
  color: #4fc3f7;
}

.presenter-container {
  display: grid;
  grid-template-columns: 300px 1fr 250px;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
  overflow: hidden;
}

.presenter-sidebar,
.quiz-display,
.presenter-players {
  display: flex;
  flex-direction: column;
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
}

.presenter-widget {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(79, 195, 247, 0.1);
}

.presenter-widget:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.presenter-widget h2 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #c9d1d9;
}

.presenter-widget select,
.presenter-widget button {
  display: block;
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  color: #c9d1d9;
  cursor: pointer;
  transition: all 0.2s;
}

.presenter-widget select:hover,
.presenter-widget button:hover {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.5);
}

.presenter-widget button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flex-grow {
  flex: 1;
}

.active-rooms-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
}

.roomCard {
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.roomCard:hover {
  background: rgba(79, 195, 247, 0.2);
}

.roomCard.activeRoom {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.8);
}

.roomCard button {
  width: 100%;
  padding: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.quiz-display h2 {
  margin: 0 0 1rem 0;
}

.questions-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.questionCard {
  background: rgba(79, 195, 247, 0.05);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.questionCard:hover {
  background: rgba(79, 195, 247, 0.15);
}

.questionCard.presented {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.5);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  white-space: nowrap;
}

.status-badge.live {
  color: #ff0;
}

.status-badge.presented {
  color: #0f0;
}

.status-badge.revealed {
  color: #f00;
}

.questionCard ul {
  list-style-position: inside;
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
  color: #aaa;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: auto;
}

.presenter-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.presenter-controls-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.presenter-controls button,
.btn-complete {
  padding: 0.5rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 8px;
  color: #4fc3f7;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.presenter-controls button:hover,
.btn-complete:hover {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.presenter-controls button:disabled,
.btn-complete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-complete {
  background: rgba(0, 123, 255, 0.2);
  border-color: rgba(0, 123, 255, 0.4);
  color: #007bff;
}

.btn-complete:hover {
  background: rgba(0, 123, 255, 0.3);
  border-color: rgba(0, 123, 255, 0.6);
}

.presenter-players h2 {
  margin: 0 0 1rem 0;
}

.btn-standings {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 8px;
  color: #4fc3f7;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-standings:hover {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.live-feed {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.player-item {
  padding: 0.5rem;
  background: rgba(79, 195, 247, 0.05);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.player-status {
  font-size: 1.2rem;
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

.player-warning-icon {
  font-size: 0.9rem;
  margin-left: 0.25rem;
  color: #ffd700;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.player-answered {
  margin-left: auto;
  color: #0f0;
}

/* Player menu */
.player-menu-container {
  margin-left: auto;
  position: relative;
}

.btn-player-menu {
  background: rgba(79, 195, 247, 0.1);
  color: #4fc3f7;
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-player-menu:hover {
  background: rgba(79, 195, 247, 0.2);
  border-color: #4fc3f7;
}

.player-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(79, 195, 247, 0.15);
}

.menu-item-kick {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-item-kick:hover {
  background: rgba(255, 68, 68, 0.15);
  color: #ff4444;
}

.menu-item-ban:hover {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.menu-icon {
  font-size: 1rem;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 1rem;
}

.qr-content {
  text-align: center;
  padding: 1rem;
}

.qr-image {
  max-width: 300px;
  width: 100%;
  margin-bottom: 1rem;
  border: 2px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
}

.qr-url {
  word-break: break-all;
  color: #aaa;
  font-size: 0.9rem;
}

.loading {
  color: #aaa;
}

.progress-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.overall-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-card.correct {
  background: rgba(0, 200, 0, 0.2);
  border-color: rgba(0, 200, 0, 0.3);
}

.stat-card.incorrect {
  background: rgba(200, 0, 0, 0.2);
  border-color: rgba(200, 0, 0, 0.3);
}

.stat-card.orange {
  background: rgba(255, 165, 0, 0.2);
  border-color: rgba(255, 165, 0, 0.3);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4fc3f7;
}

.stat-card.correct .stat-value {
  color: #0f0;
}

.stat-card.incorrect .stat-value {
  color: #f66;
}

.stat-card.orange .stat-value {
  color: #ffa500;
}

.stat-label {
  font-size: 0.9rem;
  color: #aaa;
  margin-top: 0.5rem;
}

.standings-wrapper {
  margin-top: 1rem;
}

.standings-wrapper h4 {
  color: #aaa;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.standings-table thead {
  background: rgba(0, 0, 0, 0.5);
}

.standings-table th {
  text-align: left;
  padding: 1rem 0.5rem;
  color: #aaa;
  font-weight: bold;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.standings-table td {
  padding: 1rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.standings-row {
  transition: background 0.2s;
}

.standings-row:hover {
  background: rgba(79, 195, 247, 0.1);
}

.standings-row.gold {
  background: rgba(255, 215, 0, 0.15);
}

.standings-row.silver {
  background: rgba(192, 192, 192, 0.15);
}

.standings-row.bronze {
  background: rgba(205, 127, 50, 0.15);
}

.standings-table .rank {
  text-align: center;
  color: #aaa;
  font-weight: bold;
  width: 40px;
}

.standings-table .player-name {
  font-weight: bold;
  color: #fff;
}

.standings-table .correct {
  text-align: center;
  color: #0f0;
  font-weight: bold;
}

.standings-table .incorrect {
  text-align: center;
  color: #f66;
  font-weight: bold;
}

.standings-table .accuracy {
  text-align: center;
  color: #4fc3f7;
  font-weight: bold;
}

.standings-table .answered {
  text-align: center;
  color: #ffa500;
  font-weight: bold;
}

.empty-state-standings {
  text-align: center;
  padding: 3rem 1rem;
  color: #aaa;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.answer-reveal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.correct-answer-box {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(0, 200, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(0, 200, 0, 0.5);
}

.correct-answer-box .label {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.correct-answer-box .answer {
  font-size: 1.1rem;
  color: #0f0;
}

.answer-stats {
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: space-around;
  font-size: 0.9rem;
}

.player-responses {
  margin-top: 1.5rem;
}

.player-responses .label {
  font-weight: bold;
  margin-bottom: 0.75rem;
  color: #fff;
}

.response-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.response-table thead {
  background: rgba(0, 0, 0, 0.5);
}

.response-table th {
  text-align: left;
  padding: 0.75rem 0.5rem;
  color: #aaa;
  font-weight: bold;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.response-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.response-table .correct {
  background: rgba(0, 200, 0, 0.1);
}

.response-table .incorrect {
  background: rgba(200, 0, 0, 0.1);
}

.response-table .no-answer {
  background: rgba(100, 100, 100, 0.1);
}

.response-table .player-name {
  font-weight: bold;
}

.response-table .answer-text {
  color: #fff;
}

.response-table .no-answer .answer-text {
  color: #aaa;
}

.response-table .result-icon {
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  width: 60px;
}

.response-table .correct .result-icon {
  color: #0f0;
}

.response-table .incorrect .result-icon {
  color: #f66;
}

.response-table .no-answer .result-icon {
  color: #aaa;
}

.dialog-message {
  margin: 0;
  color: #aaa;
  font-size: 1rem;
  line-height: 1.5;
  text-align: center;
  white-space: pre-wrap;
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-primary {
  background: rgba(0, 123, 255, 0.3);
  border-color: rgba(0, 123, 255, 0.5);
  color: #fff;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
  border-color: rgba(0, 123, 255, 0.7);
}

.btn-secondary {
  background: rgba(100, 100, 100, 0.3);
  border-color: rgba(100, 100, 100, 0.5);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(100, 100, 100, 0.5);
  border-color: rgba(100, 100, 100, 0.7);
}

.btn-danger {
  background: rgba(0, 200, 0, 0.3);
  border-color: rgba(0, 200, 0, 0.5);
  color: #fff;
}

.btn-danger:hover {
  background: rgba(0, 200, 0, 0.5);
  border-color: rgba(0, 200, 0, 0.7);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .presenter-container {
    grid-template-columns: 250px 1fr 200px;
  }
}

/* Hide user separator line on desktop */
.menu li:nth-child(n+5) {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}

@media (max-width: 1024px) {
  .menu li:nth-child(n+5) {
    border-top: 1px solid rgba(255,255,255,0.1);
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }

  .hamburger {
    display: block !important;
    z-index: 101;
  }

  .menu {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid rgba(79, 195, 247, 0.2);
    padding: 1rem;
    gap: 0;
    display: none !important;
    z-index: 99;
  }

  .menu.open {
    display: flex !important;
  }

  .menu li {
    width: 100%;
    white-space: normal;
  }

  .menu a {
    display: block;
    padding: 0.75rem;
  }
}

@media (max-width: 900px) {
  .presenter-container {
    grid-template-columns: 1fr;
  }

  .presenter-sidebar,
  .quiz-display,
  .presenter-players {
    max-height: 50vh;
  }
}

@media (max-width: 600px) {
  .navbar {
    padding: 0.75rem;
  }

  .logo {
    font-size: 1rem;
  }

  .presenter-container {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .presenter-sidebar,
  .quiz-display,
  .presenter-players {
    padding: 1rem;
  }

  .presenter-controls-row {
    grid-template-columns: 1fr;
  }

  .overall-stats {
    grid-template-columns: 1fr;
  }
}
</style>
