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
        <span class="nav-connection-status" :class="connectionStateClass">{{ connectionStateSymbol }}</span>
        <span v-if="wakeLock.isActive.value" class="wake-lock-indicator" title="Screen will stay on">🔆</span>
      </div>

      <div class="hamburger" @click="toggleMenu">&#9776;</div>
      <ul class="menu" :class="{ open: menuOpen }">
        <li><RouterLink to="/display">Spectate</RouterLink></li>
        <li v-if="inRoom" id="menuLeaveRoom" class="mobile-only-menu-item">
          <a href="#" @click.prevent="handleLeaveRoomClick">Leave Room</a>
        </li>
        <li v-if="inRoom" id="menuPlayersSection" class="mobile-only-menu-item">
          <div>Players in Room</div>
          <div id="menuPlayersList" class="menu-players">
            <div v-for="(player, idx) in nonSpectatorPlayers" :key="player.id" class="player-item">
              <span>{{ idx + 1 }}.</span>
              <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
              <span>{{ player.name }}</span>
              <span v-if="player.choice !== null">✓</span>
            </div>
            <em v-if="nonSpectatorPlayers.length === 0">Not in a room yet</em>
          </div>
        </li>
        <li v-if="loginUsername" class="logout-item">
          <a href="#" @click.prevent="handleLogout" style="color: #f66;">Logout</a>
        </li>
      </ul>
    </nav>

    <!-- Main Content -->
    <div class="player-container">
      <!-- Missed Questions Banner -->
      <div v-if="missedQuestionsBanner" class="missed-questions-banner">
        ⚠️ You have missed Questions while Away
      </div>

      <!-- Left/Top: Question Display -->
      <div class="question-area">
        <!-- Waiting Screen -->
        <div v-if="!questionDisplaying" class="waiting-display">
          <h2 class="waiting-title">{{ inRoom ? 'Waiting for Question' : 'Join a Room to Start' }}</h2>
          <p class="waiting-message">{{ inRoom ? 'Waiting for the presenter to start the quiz...' : 'Enter your name and room code to begin playing.' }}</p>

          <!-- Recent Rooms Section -->
          <div v-if="!inRoom && recentRooms.length > 0" class="recent-rooms-section">
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
      <div class="sidebar" :class="{ 'hidden-mobile-in-room': inRoom }">
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
            <div v-for="(player, idx) in nonSpectatorPlayers" :key="player.id" class="player-item">
              <span class="player-number">{{ idx + 1 }}.</span>
              <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
              <span class="player-name">{{ player.name }}</span>
              <span v-if="player.choice !== null" class="player-answer">✓</span>
            </div>
            <em v-if="nonSpectatorPlayers.length === 0">Not in a room yet</em>
          </div>
        </div>

        <!-- Status Message -->
        <div class="status-message" :class="statusMessageType">{{ statusMessage }}</div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Login Modal -->
    <LoginModal
      :isOpen="showLoginModal"
      :username="loginUsername"
      :error="loginError"
      @submit="handleLoginSubmit"
      @cancel="loginCancelled"
    />

    <!-- Set Password Modal -->
    <SetPasswordModal
      :isOpen="showSetPasswordModal"
      :username="setPasswordUsername"
      :error="setPasswordError"
      @submit="handleSetPasswordSubmit"
      @cancel="passwordSetupCancelled"
    />

    <!-- Progress Modal -->
    <Modal
      :isOpen="showProgressModalFlag"
      @close="showProgressModalFlag = false"
      size="large"
      title="📊 Your Progress"
    >
      <template #default>
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
    <LogoutConfirmModal
      :isOpen="showLogoutConfirmModal"
      @confirm="confirmLogout"
      @close="showLogoutConfirmModal = false"
    />

    <!-- Leave Room Confirmation Modal -->
    <LeaveRoomConfirmModal
      :isOpen="showLeaveRoomConfirmModal"
      @confirm="confirmLeaveRoom"
      @close="showLeaveRoomConfirmModal = false"
    />

    <!-- Change Username Confirmation Modal -->
    <ChangeUsernameConfirmModal
      :isOpen="showChangeUsernameModal"
      @confirm="confirmChangeUsername"
      @close="showChangeUsernameModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSocket } from '@/composables/useSocket.js'
import { useWakeLock } from '@/composables/useWakeLock.js'
import { useApi } from '@/composables/useApi.js'
import { useUIStore } from '@/stores/ui.js'
import Modal from '@/components/common/Modal.vue'
import LoginModal from '@/components/modals/LoginModal.vue'
import SetPasswordModal from '@/components/modals/SetPasswordModal.vue'
import LogoutConfirmModal from '@/components/modals/LogoutConfirmModal.vue'
import LeaveRoomConfirmModal from '@/components/modals/LeaveRoomConfirmModal.vue'
import ChangeUsernameConfirmModal from '@/components/modals/ChangeUsernameConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const socket = useSocket()
const wakeLock = useWakeLock()
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
const showLeaveRoomConfirmModal = ref(false)
const showChangeUsernameModal = ref(false)

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
const activeRoomCodes = ref(null) // null = not loaded yet, [] = no active rooms

// Form inputs
const usernameInput = ref('')
const displayNameInput = ref('')
const roomCodeInput = ref('')
const savedUsername = ref(localStorage.getItem('playerUsername'))
const savedDisplayName = ref(localStorage.getItem('playerDisplayName'))
const savedAccountType = ref(localStorage.getItem('playerAccountType'))

// Connection state management
const connectionState = ref('connected') // 'connected' | 'away' | 'disconnected' | 'warning'
const isPageVisible = ref(true)
const visibilitySwitchCount = ref(0)
const visibilitySwitchTimestamps = ref([])
const awayTimeout = ref(null)
const disconnectTimeout = ref(null)
const warningClearTimeout = ref(null)
const missedQuestionsBanner = ref(false)
const lastJoinRoomAttempt = ref(0) // Track last joinRoom call to prevent duplicates

// Login form
const loginUsername = ref('')
const loginError = ref('')

// Set password form
const setPasswordUsername = ref('')
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

// Filter out spectators from player list
const nonSpectatorPlayers = computed(() => {
  return currentPlayers.value.filter(p => !p.isSpectator)
})

// Connection state computed property for styling
const connectionStateClass = computed(() => {
  switch (connectionState.value) {
    case 'connected': return 'status-connected'
    case 'away': return 'status-away'
    case 'disconnected': return 'status-disconnected'
    case 'warning': return 'status-warning'
    default: return 'status-disconnected'
  }
})

const connectionStateSymbol = computed(() => {
  switch (connectionState.value) {
    case 'connected': return '●' // Green
    case 'away': return '●' // Orange
    case 'disconnected': return '●' // Red
    case 'warning': return '⚠' // Yellow warning triangle
    default: return '○'
  }
})

// Connection state management functions
const updateConnectionState = (newState) => {
  if (connectionState.value === newState) return

  const oldState = connectionState.value
  connectionState.value = newState

  console.log(`[CONNECTION] State changed: ${oldState} → ${newState}`)

  // Notify server of state change if in room
  if (inRoom.value && currentRoomCode.value) {
    socket.emit('playerStateChange', {
      roomCode: currentRoomCode.value,
      username: currentUsername.value,
      state: newState
    })
  }

  // Clear existing timeouts when state changes
  if (newState === 'connected') {
    clearTimeout(awayTimeout.value)
    clearTimeout(disconnectTimeout.value)
  }
}

const detectRapidSwitching = () => {
  const now = Date.now()
  const tenSecondsAgo = now - 10000

  // Remove timestamps older than 10 seconds
  visibilitySwitchTimestamps.value = visibilitySwitchTimestamps.value.filter(
    timestamp => timestamp > tenSecondsAgo
  )

  // Add current timestamp
  visibilitySwitchTimestamps.value.push(now)

  // Check if 5+ switches in last 10 seconds
  if (visibilitySwitchTimestamps.value.length >= 5) {
    console.log('[CONNECTION] Rapid switching detected!')
    updateConnectionState('warning')

    // Clear warning after 10 seconds of stable state
    clearTimeout(warningClearTimeout.value)
    warningClearTimeout.value = setTimeout(() => {
      if (connectionState.value === 'warning' && isPageVisible.value) {
        updateConnectionState('connected')
      }
    }, 10000)

    return true
  }

  return false
}

const handleVisibilityChange = () => {
  const wasVisible = isPageVisible.value
  isPageVisible.value = !document.hidden

  console.log(`[CONNECTION] Page visibility changed: ${wasVisible} → ${isPageVisible.value}`)

  // Detect rapid switching
  const isRapidSwitching = detectRapidSwitching()
  if (isRapidSwitching) {
    return // Warning state already set
  }

  if (isPageVisible.value) {
    // Page became visible - returning from away
    console.log('[CONNECTION] Page visible - returning from away')

    // Clear away timeout
    clearTimeout(awayTimeout.value)

    // Check if any questions were missed while away
    const missedQuestions = questionHistory.value.filter(q => q.revealed && q.playerChoice === null && q.missedWhileAway)
    if (missedQuestions.length > 0) {
      missedQuestionsBanner.value = true
      setTimeout(() => {
        missedQuestionsBanner.value = false
      }, 5000) // Show banner for 5 seconds
      console.log(`[CONNECTION] Player missed ${missedQuestions.length} question(s) while away`)
    }

    // Handle return from away/disconnected state
    if (connectionState.value === 'disconnected') {
      // Was truly disconnected - need to rejoin room
      if (currentRoomCode.value && currentUsername.value && currentDisplayName.value && socket.isConnected.value) {
        // Prevent duplicate joinRoom calls within 2 seconds
        const now = Date.now()
        if (now - lastJoinRoomAttempt.value < 2000) {
          console.log('[CONNECTION] Skipping duplicate joinRoom attempt (debounced)')
          return
        }
        lastJoinRoomAttempt.value = now

        console.log('[CONNECTION] Reconnecting after disconnect - rejoining room')
        updateConnectionState('connected')
        socket.emit('joinRoom', {
          roomCode: currentRoomCode.value,
          username: currentUsername.value,
          displayName: currentDisplayName.value
        })
        socket.setRoomContext(currentRoomCode.value, currentUsername.value)
      }
    } else if (connectionState.value === 'away') {
      // Was only away - just update state (still in room server-side)
      console.log('[CONNECTION] Returned from away - updating state')
      updateConnectionState('connected')
    } else if (connectionState.value === 'warning') {
      // Was rapid-switching - just log
      console.log('[CONNECTION] Returned while in warning state')
    }
  } else {
    // Page became hidden - wait 30 seconds before marking as "away"
    // This prevents brief tab switches from triggering state changes
    console.log('[CONNECTION] Page hidden - starting away timer (30s debounce)')

    // Clear any existing timeout
    clearTimeout(awayTimeout.value)

    // Wait 30 seconds before marking as away
    awayTimeout.value = setTimeout(() => {
      // Only mark as away if page is still hidden
      if (!isPageVisible.value) {
        console.log('[CONNECTION] Page still hidden after 30s - marking as away')
        updateConnectionState('away')

        // Set timeout for 2 minutes to mark as disconnected
        disconnectTimeout.value = setTimeout(() => {
          console.log('[CONNECTION] Away timeout (2 min) - marking as disconnected')
          updateConnectionState('disconnected')

          // Set timeout for 5 minutes to fully remove from room
          setTimeout(() => {
            console.log('[CONNECTION] Disconnect timeout (5 min) - leaving room')
            if (inRoom.value) {
              handleLeaveRoom()
            }
          }, 5 * 60 * 1000) // 5 minutes after disconnected state
        }, 2 * 60 * 1000) // 2 minutes after away state
      } else {
        console.log('[CONNECTION] Page became visible again - canceling away state')
      }
    }, 30 * 1000) // 30 second debounce before marking as away
  }
}

// Setup socket event listeners - called on mount and after reconnect
const setupSocketListeners = () => {
  // Remove any existing listeners to prevent duplicates
  socket.off('connect')
  socket.off('disconnect')
  socket.off('activeRoomsUpdate')
  socket.off('roomError')
  socket.off('roomCreated')
  socket.off('playerListUpdate')
  socket.off('questionPresented')
  socket.off('questionRevealed')
  socket.off('roomClosed')
  socket.off('quizCompleted')

  socket.on('connect', () => {
    isConnected.value = true
    // Update connection state to connected (unless page is hidden)
    if (isPageVisible.value && connectionState.value !== 'warning') {
      updateConnectionState('connected')
    }
    // Request active rooms list once connected
    socket.emit('getActiveRooms')
  })

  socket.on('disconnect', () => {
    isConnected.value = false
    // Hard disconnect - mark as disconnected immediately
    console.log('[CONNECTION] Socket disconnected (hard disconnect)')
    updateConnectionState('disconnected')

    // Set timeout for 5 minutes to fully remove from room
    clearTimeout(disconnectTimeout.value)
    disconnectTimeout.value = setTimeout(() => {
      console.log('[CONNECTION] Disconnect timeout (5 min) - leaving room')
      if (inRoom.value) {
        handleLeaveRoom()
      }
    }, 5 * 60 * 1000) // 5 minutes
  })

  socket.on('playerListUpdate', ({ roomCode, players }) => {
    if (roomCode !== currentRoomCode.value) return
    inRoom.value = true
    currentRoomCode.value = roomCode
    currentPlayers.value = players
    // Exclude spectators from player count
    const nonSpectatorCount = players.filter(p => !p.isSpectator).length
    statusMessage.value = `${nonSpectatorCount} player(s) in room`
    // Save room to recent rooms only on successful join
    saveRecentRoom(roomCode)

    // Request wake lock to keep screen on during game
    if (wakeLock.isSupported.value && !wakeLock.isActive.value) {
      wakeLock.requestWakeLock()
    }
  })

  socket.on('questionPresented', ({ questionIndex, question }) => {
    questionDisplaying.value = true
    // Check if this question has already been revealed (for late joiners)
    const isAlreadyRevealed = question.revealed === true || question.isRevealed === true
    answerRevealed.value = isAlreadyRevealed

    currentQuestion.value = {
      ...question,
      correctChoice: isAlreadyRevealed ? question.correctChoice : undefined,
      index: questionIndex
    }
    selectedAnswer.value = null
    answeredCurrentQuestion.value = answeredQuestions.has(questionIndex)

    // Add to history if not already there
    if (!questionHistory.value.find(q => q.index === questionIndex)) {
      const isMissedWhileAway = connectionState.value === 'away' || !isPageVisible.value
      questionHistory.value.push({
        index: questionIndex,
        text: question.text,
        choices: question.choices,
        playerChoice: null,
        correctChoice: isAlreadyRevealed ? question.correctChoice : undefined,
        presented: true,
        revealed: isAlreadyRevealed,
        isCorrect: false,
        missedWhileAway: isMissedWhileAway // Mark if player was away when question presented
      })
      if (isMissedWhileAway) {
        console.log(`[CONNECTION] Question ${questionIndex} marked as missed while away`)
      }
    }

    if (isAlreadyRevealed) {
      statusMessage.value = 'This question has already been revealed'
      statusMessageType.value = 'info'
    } else if (answeredCurrentQuestion.value) {
      statusMessage.value = 'You already answered this question'
      statusMessageType.value = 'warning'
    } else {
      statusMessage.value = 'Select your answer'
      statusMessageType.value = 'info'
    }
  })

  socket.on('questionRevealed', ({ questionIndex, question, results, answerDisplayTime }) => {
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

    // Auto-reset after timeout (from server quiz options, default 30 seconds)
    const displayTimeout = (answerDisplayTime || 30) * 1000 // Convert seconds to milliseconds
    setTimeout(() => {
      questionDisplaying.value = false
      statusMessage.value = 'Waiting for next question...'
      statusMessageType.value = ''
    }, displayTimeout)
  })

  socket.on('roomClosed', () => {
    uiStore.addNotification('Room closed by presenter.', 'info')
    handleLeaveRoom()
  })

  socket.on('player-kicked', ({ message }) => {
    uiStore.addNotification(message, 'warning')
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

  socket.on('answerHistoryRestored', ({ answerHistory }) => {
    console.log('[PLAYER] Answer history restored:', answerHistory)

    // Clear existing history to ensure each session is isolated
    questionHistory.value = []
    answeredQuestions.clear()

    // Process each answered question (if any)
    if (answerHistory && answerHistory.length > 0) {
      answerHistory.forEach((item) => {
        const { questionIndex, choice, isRevealed, isCorrect, text, choices, correctChoice } = item
        // Mark question as answered in the local set
        answeredQuestions.add(questionIndex)

        // Build question data object
        const questionData = {
          index: questionIndex,
          text: text,
          choices: choices,
          playerChoice: choice,
          presented: true,
          revealed: isRevealed,
          isCorrect: isCorrect || false
        }

        // Only include correctChoice if question was revealed
        if (isRevealed && correctChoice !== undefined) {
          questionData.correctChoice = correctChoice
        }

        // Add to history for this session
        questionHistory.value.push(questionData)
      })
    }
  })

  socket.on('activeRoomsUpdate', (rooms) => {
    activeRoomCodes.value = Array.isArray(rooms) ? rooms.map(r => r.roomCode) : []
    // Load recent rooms after receiving active rooms list
    loadRecentRooms()
  })
}

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

  // Auto-login registered player
  autoLoginRegisteredPlayer()

  // Connect socket
  socket.connect()

  // Set up all socket listeners
  setupSocketListeners()

  // Set up Page Visibility API for connection state management
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // Initialize page visibility state
  isPageVisible.value = !document.hidden
  console.log(`[CONNECTION] Initial page visibility: ${isPageVisible.value}`)

  // Fallback: if no response within 3 seconds, load recent rooms anyway
  setTimeout(() => {
    if (activeRoomCodes.value === null) {
      loadRecentRooms()
    }
  }, 3000)

  // Check for room code in URL query parameter (from QR code)
  const roomFromUrl = route.query.room
  if (roomFromUrl) {
    roomCodeInput.value = roomFromUrl.toUpperCase()
    console.log(`Room code from URL: ${roomCodeInput.value}`)

    // Auto-join if user has credentials
    if (savedUsername.value && savedDisplayName.value) {
      // Wait a bit for socket to connect
      setTimeout(() => {
        quickJoinRoom(roomCodeInput.value)
      }, 500)
    }
  }

  document.addEventListener('click', closeMenuIfOutside)
  document.addEventListener('touchstart', closeMenuIfOutside)
})

onUnmounted(() => {
  socket.disconnect()
  document.removeEventListener('click', closeMenuIfOutside)
  document.removeEventListener('touchstart', closeMenuIfOutside)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Clear all connection timeouts
  clearTimeout(awayTimeout.value)
  clearTimeout(disconnectTimeout.value)
  clearTimeout(warningClearTimeout.value)
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
  let rooms = stored ? JSON.parse(stored) : []

  // If we've received the active rooms list from server (even if empty)
  if (activeRoomCodes.value !== null) {
    const filteredRooms = rooms.filter(room => activeRoomCodes.value.includes(room.code))
    // Update localStorage to remove closed rooms
    if (filteredRooms.length < rooms.length) {
      localStorage.setItem('playerRecentRooms', JSON.stringify(filteredRooms))
    }
    recentRooms.value = filteredRooms
  } else {
    // Haven't received server response yet - show stored rooms temporarily
    recentRooms.value = rooms
  }
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
  // Get display name from saved value or input field
  const displayName = savedDisplayName.value || displayNameInput.value.trim()

  if (!savedUsername.value) {
    uiStore.addNotification('Please enter your username first.', 'warning')
    return
  }

  if (!displayName) {
    uiStore.addNotification('Please enter your display name first.', 'warning')
    return
  }

  roomCodeInput.value = roomCode
  currentUsername.value = savedUsername.value
  currentDisplayName.value = displayName
  currentRoomCode.value = roomCode
  socket.emit('joinRoom', { roomCode, username: savedUsername.value, displayName })
  socket.setRoomContext(roomCode, savedUsername.value)
}

const handleChangeUsername = async () => {
  showChangeUsernameModal.value = true
}

const confirmChangeUsername = () => {
  showChangeUsernameModal.value = false
  localStorage.removeItem('playerUsername')
  localStorage.removeItem('playerAccountType')
  localStorage.removeItem('playerAuthToken')
  savedUsername.value = null
  usernameInput.value = ''
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
    // Clear missedWhileAway flag since player actually answered
    historyItem.missedWhileAway = false
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
    // Don't save room yet - wait for playerListUpdate confirmation
    socket.emit('joinRoom', { roomCode, username, displayName })
    socket.setRoomContext(roomCode, username)
  } catch (err) {
    uiStore.addNotification('Failed to join room. Please try again.', 'error')
  }
}

const handleLoginSubmit = async (password) => {
  try {
    const response = await post('/api/auth/player-login', {
      username: loginUsername.value,
      password: password
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
    socket.setRoomContext(roomCode, loginUsername.value)
  } catch (err) {
    // Check if password reset is required (status 428)
    if (err.response?.status === 428 || err.response?.data?.requiresPasswordReset) {
      console.log('[AUTH] Password reset required for user:', loginUsername.value)
      // Close login modal and open set password modal
      showLoginModal.value = false
      setPasswordUsername.value = loginUsername.value
      setPasswordError.value = ''
      showSetPasswordModal.value = true
      return
    }

    loginError.value = err.response?.data?.error || 'Invalid password'
  }
}

const loginCancelled = () => {
  showLoginModal.value = false
}

const handleSetPasswordSubmit = async ({ newPassword, confirmPassword }) => {
  if (newPassword !== confirmPassword) {
    setPasswordError.value = 'Passwords do not match!'
    return
  }

  if (newPassword.length < 6) {
    setPasswordError.value = 'Password must be at least 6 characters'
    return
  }

  try {
    const response = await post('/api/auth/set-new-password', {
      username: setPasswordUsername.value,
      password: newPassword
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
    socket.setRoomContext(roomCode, setPasswordUsername.value)
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
  showLeaveRoomConfirmModal.value = true
}

const confirmLeaveRoom = () => {
  showLeaveRoomConfirmModal.value = false
  handleLeaveRoom()
}

const handleLeaveRoom = () => {
  // Reset local state
  inRoom.value = false
  currentRoomCode.value = null
  currentUsername.value = null
  currentDisplayName.value = null
  questionDisplaying.value = false
  selectedAnswer.value = null
  answeredQuestions.clear()
  questionHistory.value = [] // Clear session-specific history
  currentPlayers.value = []
  statusMessage.value = 'Ready to join'
  statusMessageType.value = ''
  menuOpen.value = false

  // Release wake lock when leaving room
  if (wakeLock.isActive.value) {
    wakeLock.releaseWakeLock()
  }

  // Clear heartbeat and room context
  socket.clearRoomContext()

  // Disconnect and reconnect to clear room state on server
  socket.disconnect()

  // Re-establish socket connection and listeners after brief delay
  setTimeout(() => {
    socket.connect()
    setupSocketListeners()
  }, 100)

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
  if (q.missedWhileAway && q.revealed) return 'missed-away'
  if (q.revealed && q.isCorrect) return 'correct'
  if (q.revealed && !q.isCorrect) return 'incorrect'
  if (q.playerChoice !== null) return 'answered'
  return 'unanswered'
}

const getQuestionStatusIcon = (q) => {
  if (q.missedWhileAway && q.revealed) return '⚠'
  if (q.revealed && q.isCorrect) return '✓'
  if (q.revealed && !q.isCorrect) return '✗'
  if (q.playerChoice !== null) return '⏳'
  return '○'
}

const getQuestionStatusText = (q) => {
  if (q.missedWhileAway && q.revealed) return 'Missed - Away'
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
  min-height: 100vh;
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

/* Connection states */
.nav-connection-status.status-connected,
.status-connected {
  color: #0f0; /* Green */
}

.nav-connection-status.status-away,
.status-away {
  color: #ff8c00; /* Orange */
}

.nav-connection-status.status-disconnected,
.status-disconnected {
  color: #f00; /* Red */
}

.nav-connection-status.status-warning,
.status-warning {
  color: #ffd700; /* Yellow/Gold */
  animation: pulse-warning 1.5s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Wake Lock Indicator */
.wake-lock-indicator {
  font-size: 1rem;
  margin-left: 0.5rem;
  cursor: help;
  opacity: 0.9;
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

/* Hide mobile-only menu items on desktop */
@media (min-width: 1025px) {
  .mobile-only-menu-item {
    display: none !important;
  }
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
  flex: 1 1 auto;
  gap: 1rem;
  padding: 1rem;
  position: relative;
  box-sizing: border-box;
}

/* Missed Questions Banner */
.missed-questions-banner {
  position: fixed;
  top: 80px; /* Below navbar */
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff8c00 0%, #ff6600 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.question-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  box-sizing: border-box;
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
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-sizing: border-box;
}

.question-text {
  text-align: center;
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  margin: 0;
  line-height: 1.3;
  word-wrap: break-word;
  color: #fff;
}

.choices-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
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
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: auto;
  min-width: 0;
  box-sizing: border-box;
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

.history-item.missed-away {
  background: rgba(150, 150, 150, 0.1);
  border-color: rgba(150, 150, 150, 0.3);
  opacity: 0.7;
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

.history-item.missed-away .status-icon {
  color: #ff8c00;
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
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid rgba(79, 195, 247, 0.2);
    padding: 1rem;
    gap: 0.5rem;
    display: none !important;
    z-index: 999;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .menu.open {
    display: flex !important;
  }

  .menu li {
    width: 100%;
    white-space: normal;
    flex-direction: column;
    align-items: flex-start;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.5rem 0;
  }

  .menu li:last-child {
    border-bottom: none;
  }

  .menu a {
    display: block;
    padding: 0.75rem;
    width: 100%;
    border-radius: 8px;
    transition: background 0.2s;
  }

  .menu a:hover {
    background: rgba(79, 195, 247, 0.1);
  }

  .menu-players {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
  }

  .menu-players .player-item {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    margin-bottom: 0.25rem;
  }

  /* Leave Room button - red outline */
  #menuLeaveRoom a {
    border: 2px solid rgba(255, 102, 102, 0.5);
    background: rgba(255, 102, 102, 0.05);
  }

  #menuLeaveRoom a:hover {
    background: rgba(255, 102, 102, 0.15);
    border-color: rgba(255, 102, 102, 0.7);
  }

  /* Logout button - red transparent background */
  .logout-item a {
    background: rgba(255, 102, 102, 0.15);
    border: 2px solid rgba(255, 102, 102, 0.6);
  }

  .logout-item a:hover {
    background: rgba(255, 102, 102, 0.25);
    border-color: rgba(255, 102, 102, 0.8);
  }
}

@media (max-width: 768px) {
  .menu {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
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

  .sidebar.hidden-mobile-in-room {
    display: none;
  }

  .choices-container {
    grid-template-columns: 1fr;
  }
}
</style>
