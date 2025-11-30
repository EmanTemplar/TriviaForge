<template>
  <div class="player-page">
    <!-- Navbar -->
    <nav class="navbar">
      <div class="logo">Trivia Player</div>

      <!-- Progress button in navbar -->
      <div class="nav-progress-container">
        <button v-if="inRoom" id="progressBtn" class="progress-btn" @click="showProgressModal">
          📊 Progress
        </button>
      </div>

      <div v-if="inRoom" class="nav-room-info" :class="{ active: inRoom }">
        <span class="nav-room-code">{{ currentRoomCode || '----' }}</span>
        <span class="nav-connection-status" :class="{ connected: isConnected, disconnected: !isConnected }">●</span>
      </div>

      <div class="hamburger" @click="toggleMenu">&#9776;</div>
      <ul class="menu" :class="{ open: menuOpen }">
        <li><RouterLink to="/display">Spectate</RouterLink></li>
        <li v-if="inRoom" id="menuLeaveRoom">
          <a href="#" @click.prevent="handleLeaveRoomClick">Leave Room</a>
        </li>
        <li v-if="inRoom" id="menuPlayersSection">
          <div>Players in Room</div>
          <div id="menuPlayersList" class="menu-players">
            <div v-for="(player, idx) in currentPlayers" :key="player.id" class="player-item">
              <span>{{ idx + 1 }}.</span>
              <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
              <span>{{ player.name }}</span>
              <span v-if="player.choice !== null">✓</span>
            </div>
            <em v-if="currentPlayers.length === 0">Not in a room yet</em>
          </div>
        </li>
        <li v-if="loginUsername" class="logout-item">
          <a href="#" @click.prevent="handleLogout" style="color: #f66;">Logout</a>
        </li>
      </ul>
    </nav>

    <!-- Main Content -->
    <div class="player-container">
      <!-- Left/Top: Question Display -->
      <div class="question-area">
        <!-- Waiting Screen -->
        <div v-if="!questionDisplaying" class="waiting-display">
          <h2 class="waiting-title">Join a Room to Start</h2>
          <p class="waiting-message">Enter your name and room code to begin playing.</p>

          <!-- Recent Rooms Section -->
          <div v-if="recentRooms.length > 0" class="recent-rooms-section">
            <h3>Recent Rooms</h3>
            <div class="recent-rooms-list">
              <button
                v-for="room in recentRooms"
                :key="room.code"
                class="recent-room-btn"
                @click="quickJoinRoom(room.code)"
              >
                <div class="recent-room-content">
                  <div class="recent-room-code">Room {{ room.code }}</div>
                  <div class="recent-room-time">Joined {{ getTimeAgo(room.timestamp) }}</div>
                </div>
                <div class="recent-room-arrow">→ Quick Join</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Question Display -->
        <div v-else class="question-display-area">
          <h2 class="question-text">{{ currentQuestion?.text }}</h2>

          <div class="choices-container">
            <button
              v-for="(choice, idx) in currentQuestion?.choices || []"
              :key="idx"
              class="choice-btn"
              :class="{
                selected: selectedAnswer === idx,
                correct: idx === currentQuestion?.correctChoice && answerRevealed,
                incorrect: idx === selectedAnswer && selectedAnswer !== currentQuestion?.correctChoice && answerRevealed
              }"
              :disabled="answeredCurrentQuestion || answerRevealed"
              @click="selectAnswer(idx)"
            >
              <strong>{{ String.fromCharCode(65 + idx) }}.</strong> {{ choice }}
            </button>
          </div>

          <div v-if="answerRevealed" class="answer-feedback" :class="{ correct: playerGotCorrect, incorrect: !playerGotCorrect }">
            <span v-if="playerGotCorrect">✓ Correct!</span>
            <span v-else>✗ Incorrect.</span>
            The correct answer was: <strong>{{ currentQuestion?.choices[currentQuestion?.correctChoice] }}</strong>
          </div>
        </div>
      </div>

      <!-- Right/Bottom: Room/Sidebar -->
      <div class="sidebar">
        <!-- Join Section -->
        <div v-if="!inRoom" class="join-section">
          <h3>Join Room</h3>

          <!-- Username Input or Display -->
          <div v-if="!savedUsername" class="username-input-section">
            <label for="playerUsername">Username</label>
            <input
              id="playerUsername"
              v-model="usernameInput"
              type="text"
              placeholder="Choose a username"
            />
            <p class="form-hint">This will be your account name</p>
          </div>

          <div v-else class="username-display-section">
            <label>Username (Account)</label>
            <div class="username-display">
              <div class="username-value">{{ savedUsername }}</div>
              <button class="change-username-btn" @click="handleChangeUsername">Change</button>
            </div>
          </div>

          <label for="playerDisplayName">Display Name</label>
          <input
            id="playerDisplayName"
            v-model="displayNameInput"
            type="text"
            placeholder="Name shown in game"
          />
          <p class="form-hint">This is what other players will see</p>

          <label for="roomCodeManual">Room Code</label>
          <input
            id="roomCodeManual"
            v-model="roomCodeInput"
            type="text"
            placeholder="Enter room code"
          />

          <button class="btn-primary" @click="handleJoinRoom">Join Room</button>
          <button class="btn-secondary" @click="handleManageAccount">Manage Account</button>
        </div>

        <!-- Room Info -->
        <div v-else class="room-info">
          <h3>Room Info</h3>
          <div><strong>Room Code:</strong> <span>{{ currentRoomCode }}</span></div>
          <div><strong>Your Name:</strong> <span>{{ currentDisplayName }}</span></div>

          <button class="btn-info" @click="showProgressModal">📊 View Progress</button>
          <button class="btn-danger" @click="handleLeaveRoomClick">Leave Room</button>
        </div>

        <!-- Players List -->
        <div class="players-list-container">
          <h3>Players in Room</h3>
          <div class="players-list">
            <div v-for="(player, idx) in currentPlayers" :key="player.id" class="player-item">
              <span class="player-number">{{ idx + 1 }}.</span>
              <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
              <span class="player-name">{{ player.name }}</span>
              <span v-if="player.choice !== null" class="player-answer">✓</span>
            </div>
            <em v-if="currentPlayers.length === 0">Not in a room yet</em>
          </div>
        </div>

        <!-- Status Message -->
        <div class="status-message" :class="statusMessageType">{{ statusMessage }}</div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Login Modal -->
    <Modal v-if="showLoginModal" @close="loginCancelled" :closeable="false">
      <template #header>Login Required</template>
      <template #body>
        <p style="color: #aaa; margin-bottom: 1.5rem;">
          This username belongs to a registered account. Please enter your password to continue.
        </p>

        <form @submit.prevent="handleLoginSubmit">
          <FormInput
            v-model="loginUsername"
            label="Username"
            type="text"
            readonly
          />
          <FormInput
            v-model="loginPassword"
            label="Password"
            type="password"
            placeholder="Enter your password"
            :error="loginError"
          />
        </form>
      </template>
      <template #footer>
        <button class="btn-primary" @click="handleLoginSubmit">Login</button>
        <button class="btn-secondary" @click="loginCancelled">Cancel</button>
      </template>
    </Modal>

    <!-- Set Password Modal -->
    <Modal v-if="showSetPasswordModal" @close="passwordSetupCancelled" :closeable="false">
      <template #header>Set New Password</template>
      <template #body>
        <p style="color: #aaa; margin-bottom: 1.5rem;">
          Your password has been reset by an administrator. Please set a new password to continue.
        </p>

        <form @submit.prevent="handleSetPasswordSubmit">
          <FormInput
            v-model="setPasswordUsername"
            label="Username"
            type="text"
            readonly
          />
          <FormInput
            v-model="setPasswordNew"
            label="New Password"
            type="password"
            placeholder="Enter new password (min 6 characters)"
            :error="setPasswordError"
          />
          <FormInput
            v-model="setPasswordConfirm"
            label="Confirm Password"
            type="password"
            placeholder="Confirm new password"
          />
        </form>
      </template>
      <template #footer>
        <button class="btn-primary" @click="handleSetPasswordSubmit">Set Password</button>
        <button class="btn-secondary" @click="passwordSetupCancelled">Cancel</button>
      </template>
    </Modal>

    <!-- Progress Modal -->
    <Modal
      v-if="showProgressModalFlag"
      @close="showProgressModalFlag = false"
      size="large"
      :title="'📊 Your Progress'"
    >
      <template #body>
        <div class="progress-content">
          <!-- Stats Summary -->
          <div v-if="presentedQuestions.length > 0" class="progress-stats">
            <div class="stat-card correct">
              <div class="stat-value">{{ correctCount }}</div>
              <div class="stat-label">Correct</div>
            </div>
            <div class="stat-card incorrect">
              <div class="stat-value">{{ incorrectCount }}</div>
              <div class="stat-label">Incorrect</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ accuracy }}%</div>
              <div class="stat-label">Accuracy</div>
            </div>
            <div class="stat-card answered">
              <div class="stat-value">{{ answeredCount }}</div>
              <div class="stat-label">Answered</div>
            </div>
          </div>

          <!-- Question History -->
          <div v-if="presentedQuestions.length > 0" class="question-history">
            <h4>Question History</h4>
            <div
              v-for="(q, idx) in presentedQuestions"
              :key="q.index"
              class="history-item"
              :class="getQuestionStatusClass(q)"
            >
              <div class="history-content">
                <div class="history-question">Q{{ q.index + 1 }}. {{ q.text }}</div>
                <div class="history-answer">
                  <strong style="color: #4fc3f7;">Your answer:</strong>
                  {{ q.playerChoice !== null ? `${String.fromCharCode(65 + q.playerChoice)}. ${q.choices[q.playerChoice]}` : 'No answer submitted' }}
                </div>
                <div v-if="q.revealed" class="history-correct">
                  <strong style="color: #0f0;">Correct answer:</strong>
                  {{ `${String.fromCharCode(65 + q.correctChoice)}. ${q.choices[q.correctChoice]}` }}
                </div>
              </div>
              <div class="history-status" :class="getQuestionStatusClass(q)">
                <div class="status-icon">{{ getQuestionStatusIcon(q) }}</div>
                <div class="status-text">{{ getQuestionStatusText(q) }}</div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="progress-empty">
            <div class="empty-icon">📝</div>
            <p>No questions answered yet!</p>
            <p style="font-size: 0.9rem; color: #aaa;">Your progress will appear here once the presenter starts the quiz.</p>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Logout Confirmation Modal -->
    <Modal :isOpen="showLogoutConfirmModal" @close="showLogoutConfirmModal = false" title="Confirm Logout">
      <p style="color: #aaa; margin-bottom: 1.5rem;">
        Are you sure you want to logout?
      </p>
      <p style="color: #aaa; margin-bottom: 1.5rem;">
        This will clear your saved username and account data.
      </p>
      <template #footer>
        <button class="btn-primary" @click="confirmLogout">Logout</button>
        <button class="btn-secondary" @click="showLogoutConfirmModal = false">Cancel</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket } from '@/composables/useSocket.js'
import { useApi } from '@/composables/useApi.js'
import { useUIStore } from '@/stores/ui.js'
import Modal from '@/components/common/Modal.vue'
import FormInput from '@/components/common/FormInput.vue'

const router = useRouter()
const socket = useSocket()
const { post } = useApi()
const uiStore = useUIStore()

// UI state
const menuOpen = ref(false)
const questionDisplaying = ref(false)
const inRoom = ref(false)
const isConnected = ref(false)
const answerRevealed = ref(false)

// Login/Auth modals
const showLoginModal = ref(false)
const showSetPasswordModal = ref(false)
const showProgressModalFlag = ref(false)
const showLogoutConfirmModal = ref(false)

// Room/Player state
const currentRoomCode = ref(null)
const currentUsername = ref(null)
const currentDisplayName = ref(null)
const currentPlayers = ref([])
const currentQuestion = ref(null)
const selectedAnswer = ref(null)
const playerGotCorrect = ref(false)
const answeredCurrentQuestion = ref(false)
const answeredQuestions = new Set()

// Question history
const questionHistory = ref([])
const recentRooms = ref([])

// Form inputs
const usernameInput = ref('')
const displayNameInput = ref('')
const roomCodeInput = ref('')
const savedUsername = ref(localStorage.getItem('playerUsername'))
const savedDisplayName = ref(localStorage.getItem('playerDisplayName'))
const savedAccountType = ref(localStorage.getItem('playerAccountType'))

// Login form
const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')

// Set password form
const setPasswordUsername = ref('')
const setPasswordNew = ref('')
const setPasswordConfirm = ref('')
const setPasswordError = ref('')

// Status message
const statusMessage = ref('Ready to join')
const statusMessageType = ref('')

// Progress modal computed properties
const presentedQuestions = computed(() => questionHistory.value.filter(q => q.presented))
const correctCount = computed(() => presentedQuestions.value.filter(q => q.revealed && q.isCorrect).length)
const incorrectCount = computed(() => presentedQuestions.value.filter(q => q.revealed && !q.isCorrect).length)
const answeredCount = computed(() => presentedQuestions.value.filter(q => q.revealed).length)
const accuracy = computed(() => answeredCount.value > 0 ? ((correctCount.value / answeredCount.value) * 100).toFixed(1) : '0.0')

// Initialize page
onMounted(() => {
  // Restore saved values
  if (savedUsername.value) {
    usernameInput.value = ''
    loginUsername.value = savedUsername.value
  } else {
    usernameInput.value = localStorage.getItem('playerUsername') || ''
  }

  displayNameInput.value = localStorage.getItem('playerDisplayName') || ''

  // Load recent rooms
  loadRecentRooms()

  // Auto-login registered player
  autoLoginRegisteredPlayer()

  // Connect socket
  const socketInstance = socket.connect()

  // Socket events
  socket.on('connect', () => {
    isConnected.value = true
  })

  socket.on('disconnect', () => {
    isConnected.value = false
  })

  socket.on('playerListUpdate', ({ roomCode, players }) => {
    if (roomCode !== currentRoomCode.value) return
    inRoom.value = true
    currentRoomCode.value = roomCode
    currentPlayers.value = players
    statusMessage.value = `${players.length} player(s) in room`
  })

  socket.on('questionPresented', ({ questionIndex, question }) => {
    questionDisplaying.value = true
    answerRevealed.value = false
    currentQuestion.value = {
      ...question,
      correctChoice: undefined,
      index: questionIndex
    }
    selectedAnswer.value = null
    answeredCurrentQuestion.value = answeredQuestions.has(questionIndex)

    // Add to history if not already there
    if (!questionHistory.value.find(q => q.index === questionIndex)) {
      questionHistory.value.push({
        index: questionIndex,
        text: question.text,
        choices: question.choices,
        playerChoice: null,
        correctChoice: undefined,
        presented: true,
        revealed: false,
        isCorrect: false
      })
    }

    if (answeredCurrentQuestion.value) {
      statusMessage.value = 'You already answered this question'
      statusMessageType.value = 'warning'
    } else {
      statusMessage.value = 'Select your answer'
      statusMessageType.value = 'info'
    }
  })

  socket.on('questionRevealed', ({ questionIndex, question, results }) => {
    answerRevealed.value = true
    currentQuestion.value.correctChoice = question.correctChoice

    const myResult = results.find(r => r.name === currentDisplayName.value)
    playerGotCorrect.value = myResult && myResult.is_correct

    // Update question history
    const historyItem = questionHistory.value.find(q => q.index === questionIndex)
    if (historyItem) {
      historyItem.revealed = true
      historyItem.correctChoice = question.correctChoice
      historyItem.isCorrect = playerGotCorrect.value
    }

    statusMessage.value = playerGotCorrect.value ? 'You got it right! 🎉' : 'Better luck next time!'
    statusMessageType.value = playerGotCorrect.value ? 'success' : 'error'

    // Auto-reset after timeout
    setTimeout(() => {
      questionDisplaying.value = false
      statusMessage.value = 'Waiting for next question...'
      statusMessageType.value = ''
    }, 30000)
  })

  socket.on('roomClosed', () => {
    uiStore.addNotification('Room closed by presenter.', 'info')
    handleLeaveRoom()
  })

  socket.on('roomError', (msg) => {
    uiStore.addNotification(msg, 'error')
  })

  socket.on('answerRejected', ({ message }) => {
    statusMessage.value = message
    statusMessageType.value = 'error'
    answeredCurrentQuestion.value = true
  })

  document.addEventListener('click', closeMenuIfOutside)
  document.addEventListener('touchstart', closeMenuIfOutside)
})

onUnmounted(() => {
  socket.disconnect()
  document.removeEventListener('click', closeMenuIfOutside)
  document.removeEventListener('touchstart', closeMenuIfOutside)
})

// Methods
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenuIfOutside = (e) => {
  const menu = document.querySelector('.menu')
  const hamburger = e.target.closest('.hamburger')
  if (menu && menu.classList && menu.classList.contains('open') && !menu.contains(e.target) && !hamburger) {
    menuOpen.value = false
  }
}

const getTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

const loadRecentRooms = () => {
  const stored = localStorage.getItem('playerRecentRooms')
  recentRooms.value = stored ? JSON.parse(stored) : []
}

const saveRecentRoom = (roomCode) => {
  let rooms = recentRooms.value
  rooms = rooms.filter(room => room.code !== roomCode)
  rooms.unshift({
    code: roomCode,
    timestamp: Date.now(),
    username: currentUsername.value,
    displayName: currentDisplayName.value
  })
  rooms = rooms.slice(0, 5)
  recentRooms.value = rooms
  localStorage.setItem('playerRecentRooms', JSON.stringify(rooms))
}

const quickJoinRoom = async (roomCode) => {
  if (!savedUsername.value || !savedDisplayName.value) {
    uiStore.addNotification('Please enter your username and display name first.', 'warning')
    return
  }
  roomCodeInput.value = roomCode
  currentUsername.value = savedUsername.value
  currentDisplayName.value = savedDisplayName.value
  currentRoomCode.value = roomCode
  socket.emit('joinRoom', { roomCode, username: savedUsername.value, displayName: savedDisplayName.value })
}

const handleChangeUsername = async () => {
  const confirmed = confirm(
    'Changing your username will:\n- Create a new account or switch to a different account\n- Start fresh with no saved progress\n\nAre you sure?'
  )
  if (confirmed) {
    localStorage.removeItem('playerUsername')
    localStorage.removeItem('playerAccountType')
    localStorage.removeItem('playerAuthToken')
    savedUsername.value = null
    usernameInput.value = ''
  }
}

const selectAnswer = async (idx) => {
  if (answeredCurrentQuestion.value || answerRevealed.value) return
  selectedAnswer.value = idx
  answeredCurrentQuestion.value = true
  answeredQuestions.add(currentQuestion.value.index)

  // Update history
  const historyItem = questionHistory.value.find(q => q.index === currentQuestion.value.index)
  if (historyItem) {
    historyItem.playerChoice = idx
  }

  socket.emit('submitAnswer', { roomCode: currentRoomCode.value, choice: idx })
  statusMessage.value = 'Answer submitted! ✓'
  statusMessageType.value = 'success'
}

const handleJoinRoom = async () => {
  const username = savedUsername.value || usernameInput.value.trim()
  const displayName = displayNameInput.value.trim()
  const roomCode = roomCodeInput.value.trim()

  if (!username) {
    uiStore.addNotification('Please enter a username.', 'warning')
    return
  }

  if (!displayName) {
    uiStore.addNotification('Please enter a display name.', 'warning')
    return
  }

  if (!roomCode) {
    uiStore.addNotification('Please enter a room code.', 'warning')
    return
  }

  try {
    const response = await post('/api/auth/check-username', { username })
    if (response.data.requiresAuth) {
      const hasToken = await verifyAuthToken()
      if (!hasToken) {
        loginUsername.value = username
        loginPassword.value = ''
        loginError.value = ''
        showLoginModal.value = true
        return
      }
    } else {
      localStorage.setItem('playerUsername', username)
      localStorage.setItem('playerAccountType', 'guest')
      savedUsername.value = username
    }

    localStorage.setItem('playerDisplayName', displayName)
    currentUsername.value = username
    currentDisplayName.value = displayName
    currentRoomCode.value = roomCode
    saveRecentRoom(roomCode)
    socket.emit('joinRoom', { roomCode, username, displayName })
  } catch (err) {
    uiStore.addNotification('Failed to join room. Please try again.', 'error')
  }
}

const handleLoginSubmit = async () => {
  try {
    const response = await post('/api/auth/player-login', {
      username: loginUsername.value,
      password: loginPassword.value
    })

    localStorage.setItem('playerAuthToken', response.data.token)
    localStorage.setItem('playerUsername', loginUsername.value)
    localStorage.setItem('playerAccountType', 'registered')
    savedUsername.value = loginUsername.value

    showLoginModal.value = false

    // Proceed with join
    const displayName = displayNameInput.value.trim()
    const roomCode = roomCodeInput.value.trim()
    currentUsername.value = loginUsername.value
    currentDisplayName.value = displayName
    currentRoomCode.value = roomCode
    localStorage.setItem('playerDisplayName', displayName)
    saveRecentRoom(roomCode)
    socket.emit('joinRoom', { roomCode, username: loginUsername.value, displayName })
  } catch (err) {
    loginError.value = err.response?.data?.error || 'Invalid password'
  }
}

const loginCancelled = () => {
  showLoginModal.value = false
}

const handleSetPasswordSubmit = async () => {
  if (setPasswordNew.value !== setPasswordConfirm.value) {
    setPasswordError.value = 'Passwords do not match!'
    return
  }

  if (setPasswordNew.value.length < 6) {
    setPasswordError.value = 'Password must be at least 6 characters'
    return
  }

  try {
    const response = await post('/api/auth/set-new-password', {
      username: setPasswordUsername.value,
      password: setPasswordNew.value
    })

    localStorage.setItem('playerAuthToken', response.data.token)
    localStorage.setItem('playerUsername', setPasswordUsername.value)
    localStorage.setItem('playerAccountType', 'registered')
    savedUsername.value = setPasswordUsername.value

    showSetPasswordModal.value = false

    // Proceed with join
    const displayName = displayNameInput.value.trim()
    const roomCode = roomCodeInput.value.trim()
    currentUsername.value = setPasswordUsername.value
    currentDisplayName.value = displayName
    currentRoomCode.value = roomCode
    localStorage.setItem('playerDisplayName', displayName)
    saveRecentRoom(roomCode)
    socket.emit('joinRoom', { roomCode, username: setPasswordUsername.value, displayName })
  } catch (err) {
    setPasswordError.value = err.response?.data?.error || 'Failed to set password'
  }
}

const passwordSetupCancelled = () => {
  showSetPasswordModal.value = false
}

const handleManageAccount = () => {
  const username = savedUsername.value || usernameInput.value.trim()

  if (!username) {
    uiStore.addNotification('Please enter a username.', 'warning')
    return
  }

  // Save username to localStorage if not already saved
  if (!savedUsername.value) {
    localStorage.setItem('playerUsername', username)
    localStorage.setItem('playerAccountType', 'guest')
    savedUsername.value = username
  }

  router.push('/manage')
}

const handleLeaveRoomClick = async () => {
  const confirmed = confirm('Leave this room?')
  if (confirmed) {
    handleLeaveRoom()
  }
}

const handleLeaveRoom = () => {
  socket.disconnect()
  socket.connect()
  inRoom.value = false
  currentRoomCode.value = null
  currentUsername.value = null
  currentDisplayName.value = null
  questionDisplaying.value = false
  selectedAnswer.value = null
  answeredQuestions.clear()
  currentPlayers.value = []
  statusMessage.value = 'Ready to join'
  statusMessageType.value = ''
  menuOpen.value = false
  loadRecentRooms()
}

const handleLogout = () => {
  showLogoutConfirmModal.value = true
}

const confirmLogout = async () => {
  showLogoutConfirmModal.value = false

  if (inRoom.value) {
    handleLeaveRoom()
  }

  localStorage.removeItem('playerUsername')
  localStorage.removeItem('playerDisplayName')
  localStorage.removeItem('playerAccountType')
  localStorage.removeItem('playerAuthToken')
  localStorage.removeItem('playerRecentRooms')

  loginUsername.value = ''
  usernameInput.value = ''
  displayNameInput.value = ''
  roomCodeInput.value = ''
  savedUsername.value = null
  savedDisplayName.value = null
  savedAccountType.value = null
  questionHistory.value = []
  recentRooms.value = []

  uiStore.addNotification('Logged out successfully', 'info')
}

const showProgressModal = () => {
  showProgressModalFlag.value = true
}

const autoLoginRegisteredPlayer = async () => {
  const token = localStorage.getItem('playerAuthToken')
  if (token && savedAccountType.value === 'registered') {
    try {
      const response = await post('/api/auth/verify-player', {})
      // Token is valid, user will be auto-logged in
    } catch (err) {
      localStorage.removeItem('playerAuthToken')
    }
  }
}

const verifyAuthToken = async () => {
  const token = localStorage.getItem('playerAuthToken')
  if (!token) return false

  try {
    const response = await post('/api/auth/verify-player', {})
    return true
  } catch (err) {
    localStorage.removeItem('playerAuthToken')
    return false
  }
}

const getQuestionStatusClass = (q) => {
  if (q.revealed && q.isCorrect) return 'correct'
  if (q.revealed && !q.isCorrect) return 'incorrect'
  if (q.playerChoice !== null) return 'answered'
  return 'unanswered'
}

const getQuestionStatusIcon = (q) => {
  if (q.revealed && q.isCorrect) return '✓'
  if (q.revealed && !q.isCorrect) return '✗'
  if (q.playerChoice !== null) return '⏳'
  return '○'
}

const getQuestionStatusText = (q) => {
  if (q.revealed && q.isCorrect) return 'Correct'
  if (q.revealed && !q.isCorrect) return 'Incorrect'
  if (q.playerChoice !== null) return 'Waiting for reveal'
  return 'Not answered'
}
</script>

<style scoped>
.player-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
  color: #fff;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 1rem;
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.nav-progress-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

.progress-btn {
  padding: 0.5rem 1rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 8px;
  color: #4fc3f7;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.progress-btn:hover {
  background: rgba(79, 195, 247, 0.3);
}

.nav-room-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.nav-room-code {
  color: #4fc3f7;
  font-weight: bold;
}

.nav-connection-status {
  font-size: 1.2rem;
  transition: color 0.2s;
}

.nav-connection-status.connected {
  color: #0f0;
}

.nav-connection-status.disconnected {
  color: #f00;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  flex-shrink: 0;
}

.menu {
  display: flex;
  list-style: none;
  gap: 1.5rem;
  padding: 0;
  margin: 0;
}

.menu li {
  display: flex;
  align-items: center;
}

.menu a {
  color: #fff;
  text-decoration: none;
  transition: color 0.2s;
}

.menu a:hover {
  color: #4fc3f7;
}

.logout-item {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

/* Show separator only on mobile */
@media (max-width: 1024px) {
  .logout-item {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }
}

.player-container {
  display: flex;
  flex: 1;
  gap: 1rem;
  padding: 1rem;
  min-height: 0;
}

.question-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-width: 0;
}

.waiting-display {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.waiting-title {
  font-size: 2rem;
  margin: 0;
}

.waiting-message {
  font-size: 1.1rem;
  color: #aaa;
  margin: 0;
}

.recent-rooms-section {
  margin-top: 2rem;
}

.recent-rooms-section h3 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #4fc3f7;
}

.recent-rooms-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recent-room-btn {
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.recent-room-btn:hover {
  background: rgba(79, 195, 247, 0.2);
}

.recent-room-content {
  text-align: left;
}

.recent-room-code {
  font-size: 1.1rem;
  font-weight: bold;
  color: #4fc3f7;
}

.recent-room-time {
  font-size: 0.85rem;
  color: #aaa;
  margin-top: 0.25rem;
}

.recent-room-arrow {
  font-size: 0.9rem;
  color: #4fc3f7;
}

.question-display-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.question-text {
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  margin: 0;
  line-height: 1.3;
  word-wrap: break-word;
  color: #fff;
}

.choices-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.choice-btn {
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  disabled: false;
}

.choice-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.choice-btn.selected {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.choice-btn.correct {
  background: rgba(0, 200, 0, 0.3);
  border-color: #0f0;
}

.choice-btn.incorrect {
  background: rgba(200, 0, 0, 0.3);
  border-color: #f66;
}

.choice-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.answer-feedback {
  padding: 1.5rem;
  border-radius: 10px;
  font-size: 1.1rem;
  text-align: center;
  animation: fadeIn 0.3s ease-in;
}

.answer-feedback.correct {
  background: rgba(0, 200, 0, 0.2);
  color: #0f0;
}

.answer-feedback.incorrect {
  background: rgba(200, 0, 0, 0.2);
  color: #f66;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.sidebar {
  width: 300px;
  min-width: 300px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  padding: 1.5rem;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.join-section,
.room-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.join-section h3,
.room-info h3 {
  margin: 0;
  color: #4fc3f7;
  font-size: 1.1rem;
}

.username-input-section,
.username-display-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.username-display {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.username-value {
  flex: 1;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #4fc3f7;
  font-weight: 500;
}

.change-username-btn {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.change-username-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.form-hint {
  font-size: 0.85rem;
  color: #aaa;
  margin: 0;
}

.join-section input,
.room-info input {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
}

.join-section label,
.room-info label {
  color: #aaa;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-primary,
.btn-secondary,
.btn-info,
.btn-danger {
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  color: #4fc3f7;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

.btn-secondary {
  background: rgba(0, 123, 255, 0.2);
  border: 1px solid rgba(0, 123, 255, 0.3);
  color: #4fc3f7;
}

.btn-secondary:hover {
  background: rgba(0, 123, 255, 0.3);
}

.btn-info {
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  color: #4fc3f7;
}

.btn-info:hover {
  background: rgba(79, 195, 247, 0.3);
}

.btn-danger {
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.3);
  color: #f66;
}

.btn-danger:hover {
  background: rgba(200, 0, 0, 0.3);
}

.room-info div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #fff;
}

.room-info strong {
  color: #aaa;
}

.players-list-container h3 {
  margin: 0 0 1rem 0;
  color: #4fc3f7;
  font-size: 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #fff;
}

.player-number {
  color: #aaa;
}

.player-status {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.player-status.online {
  color: #0f0;
}

.player-status.offline {
  color: #f00;
}

.player-name {
  flex: 1;
}

.player-answer {
  color: #0f0;
}

.status-message {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.status-message.success {
  background: rgba(0, 200, 0, 0.1);
  border-color: rgba(0, 200, 0, 0.3);
  color: #0f0;
}

.status-message.error {
  background: rgba(200, 0, 0, 0.1);
  border-color: rgba(200, 0, 0, 0.3);
  color: #f66;
}

.status-message.warning {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
  color: #ffa500;
}

.status-message.info {
  background: rgba(79, 195, 247, 0.1);
  border-color: rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}

/* Progress Modal Styles */
.progress-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-card.correct {
  background: rgba(0, 200, 0, 0.1);
  border-color: rgba(0, 200, 0, 0.3);
}

.stat-card.incorrect {
  background: rgba(200, 0, 0, 0.1);
  border-color: rgba(200, 0, 0, 0.3);
}

.stat-card.answered {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4fc3f7;
  margin-bottom: 0.5rem;
}

.stat-card.correct .stat-value {
  color: #0f0;
}

.stat-card.incorrect .stat-value {
  color: #f66;
}

.stat-card.answered .stat-value {
  color: #ffa500;
}

.stat-label {
  font-size: 0.9rem;
  color: #aaa;
}

.question-history h4 {
  margin: 0 0 1rem 0;
  color: #aaa;
  font-size: 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.history-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.history-item.correct {
  background: rgba(0, 200, 0, 0.1);
  border-color: rgba(0, 200, 0, 0.3);
}

.history-item.incorrect {
  background: rgba(200, 0, 0, 0.1);
  border-color: rgba(200, 0, 0, 0.3);
}

.history-item.answered {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
}

.history-content {
  flex: 1;
  text-align: left;
}

.history-question {
  font-weight: bold;
  color: #fff;
  margin-bottom: 0.5rem;
}

.history-answer {
  font-size: 0.85rem;
  color: #aaa;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.history-correct {
  font-size: 0.85rem;
  color: #0f0;
  line-height: 1.4;
}

.history-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.status-icon {
  font-size: 2rem;
  color: #4fc3f7;
}

.history-item.correct .status-icon {
  color: #0f0;
}

.history-item.incorrect .status-icon {
  color: #f66;
}

.history-item.answered .status-icon {
  color: #ffa500;
}

.status-text {
  font-size: 0.75rem;
  color: #aaa;
  text-align: center;
}

.progress-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #aaa;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.menu-players {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Mobile styles */
@media (max-width: 1024px) {
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

@media (max-width: 768px) {
  .hamburger {
    display: block;
  }

  .menu {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    max-height: calc(100vh - 60px);
    overflow-y: auto;
    padding: 1rem;
    gap: 0.5rem;
    z-index: 999;
    display: none;
  }

  .menu.open {
    display: flex;
  }

  .menu li {
    flex-direction: column;
    gap: 0.25rem;
  }

  .menu-players {
    margin-left: 0;
  }

  .player-container {
    flex-direction: column;
  }

  .question-area {
    min-height: auto;
    flex: 0 0 auto;
  }

  .sidebar {
    width: 100%;
    min-width: unset;
    flex: 1;
    overflow-y: auto;
  }

  .choices-container {
    grid-template-columns: 1fr;
  }
}
</style>
