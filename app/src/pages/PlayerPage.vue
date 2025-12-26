<template>
  <div class="player-page">
    <!-- Navbar -->
    <PlayerNavbar
      :inRoom="inRoom"
      :currentRoomCode="currentRoomCode"
      :connectionStateClass="connectionStateClass"
      :connectionStateSymbol="connectionStateSymbol"
      :wakeLockActive="wakeLock.isActive.value"
      :menuOpen="menuOpen"
      :nonSpectatorPlayers="nonSpectatorPlayers"
      :loginUsername="loginUsername"
      @showProgress="showProgressModal"
      @toggleMenu="toggleMenu"
      @leaveRoom="handleLeaveRoomClick"
      @logout="handleLogout"
    />

    <!-- Main Content -->
    <div class="player-container">
      <!-- Missed Questions Banner -->
      <div v-if="missedQuestionsBanner" class="missed-questions-banner">
        ⚠️ You have missed Questions while Away
      </div>

      <!-- Left/Top: Question Display -->
      <div class="question-area">
        <!-- Waiting Screen -->
        <WaitingDisplay
          v-if="!questionDisplaying"
          :inRoom="inRoom"
          :recentRooms="recentRooms"
          @quickJoin="quickJoinRoom"
        />

        <!-- Question Display -->
        <QuestionDisplay
          v-else
          :currentQuestion="currentQuestion"
          :selectedAnswer="selectedAnswer"
          :answerRevealed="answerRevealed"
          :playerGotCorrect="playerGotCorrect"
          :answeredCurrentQuestion="answeredCurrentQuestion"
          @selectAnswer="selectAnswer"
        />
      </div>

      <!-- Right/Bottom: Room/Sidebar -->
      <div class="sidebar" :class="{ 'hidden-mobile-in-room': inRoom }">
        <!-- Join Section -->
        <JoinRoomSection
          v-if="!inRoom"
          :savedUsername="savedUsername"
          v-model:usernameInput="usernameInput"
          v-model:displayNameInput="displayNameInput"
          v-model:roomCodeInput="roomCodeInput"
          @changeUsername="handleChangeUsername"
          @joinRoom="handleJoinRoom"
          @manageAccount="handleManageAccount"
        />

        <!-- Room Info -->
        <RoomInfoSection
          v-else
          :currentRoomCode="currentRoomCode"
          :currentDisplayName="currentDisplayName"
          @showProgress="showProgressModal"
          @leaveRoom="handleLeaveRoomClick"
        />

        <!-- Players List -->
        <PlayersList :nonSpectatorPlayers="nonSpectatorPlayers" />

        <!-- Status Message -->
        <StatusMessage :message="statusMessage" :messageType="statusMessageType" />
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
    <ProgressModal
      :isOpen="showProgressModalFlag"
      :questionHistory="questionHistory"
      @close="showProgressModalFlag = false"
    />

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
import LoginModal from '@/components/modals/LoginModal.vue'
import SetPasswordModal from '@/components/modals/SetPasswordModal.vue'
import LogoutConfirmModal from '@/components/modals/LogoutConfirmModal.vue'
import LeaveRoomConfirmModal from '@/components/modals/LeaveRoomConfirmModal.vue'
import ChangeUsernameConfirmModal from '@/components/modals/ChangeUsernameConfirmModal.vue'
import ProgressModal from '@/components/modals/ProgressModal.vue'
import PlayerNavbar from '@/components/player/PlayerNavbar.vue'
import QuestionDisplay from '@/components/player/QuestionDisplay.vue'
import WaitingDisplay from '@/components/player/WaitingDisplay.vue'
import JoinRoomSection from '@/components/player/JoinRoomSection.vue'
import RoomInfoSection from '@/components/player/RoomInfoSection.vue'
import PlayersList from '@/components/player/PlayersList.vue'
import StatusMessage from '@/components/player/StatusMessage.vue'

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
</script>

<style scoped>
.player-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
  color: #fff;
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

/* Mobile styles */
@media (max-width: 768px) {
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
}
</style>
