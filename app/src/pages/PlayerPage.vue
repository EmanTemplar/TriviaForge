<template>
  <div class="player-page">
    <!-- Navbar -->
    <PlayerNavbar
      :inRoom="inRoom"
      :currentRoomCode="currentRoomCode"
      :connectionStateClass="connectionStateClass"
      :connectionStateSymbol="connectionStateSymbol"
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
      <!-- Connection Lost Banner -->
      <div v-if="showConnectionLostBanner" class="connection-lost-banner">
        <div class="banner-content">
          <AppIcon name="alert-triangle" size="lg" class="icon" />
          <div class="text">
            <strong>Connection Lost</strong>
            <p>Attempting to reconnect... ({{ reconnectionAttempts }} attempt{{ reconnectionAttempts !== 1 ? 's' : '' }})</p>
          </div>
          <Button @click="forceReconnect" variant="danger" size="small" class="reconnect-btn">Reconnect Now</Button>
        </div>
      </div>

      <!-- Missed Questions Banner -->
      <div v-if="missedQuestionsBanner" class="missed-questions-banner">
        <AppIcon name="alert-triangle" size="md" /> You have missed Questions while Away
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

    <!-- Answer Confirmation Modal -->
    <AnswerConfirmModal
      :isOpen="showAnswerConfirmModal"
      :selectedIndex="pendingAnswerIndex"
      :choices="currentQuestion?.choices || []"
      @confirm="confirmAnswer"
      @cancel="cancelAnswer"
    />

    <!-- Wake Lock Indicator - Floating bottom-left -->
    <WakeLockIndicator
      :inRoom="inRoom"
      :wakeLockActive="wakeLock.isActive.value"
      :error="wakeLock.error.value"
      :isSupported="wakeLock.isSupported.value"
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
import { useTheme } from '@/composables/useTheme.js'
import Button from '@/components/common/Button.vue'
import LoginModal from '@/components/modals/LoginModal.vue'
import SetPasswordModal from '@/components/modals/SetPasswordModal.vue'
import LogoutConfirmModal from '@/components/modals/LogoutConfirmModal.vue'
import LeaveRoomConfirmModal from '@/components/modals/LeaveRoomConfirmModal.vue'
import ChangeUsernameConfirmModal from '@/components/modals/ChangeUsernameConfirmModal.vue'
import ProgressModal from '@/components/modals/ProgressModal.vue'
import AnswerConfirmModal from '@/components/modals/AnswerConfirmModal.vue'
import PlayerNavbar from '@/components/player/PlayerNavbar.vue'
import QuestionDisplay from '@/components/player/QuestionDisplay.vue'
import WaitingDisplay from '@/components/player/WaitingDisplay.vue'
import JoinRoomSection from '@/components/player/JoinRoomSection.vue'
import RoomInfoSection from '@/components/player/RoomInfoSection.vue'
import PlayersList from '@/components/player/PlayersList.vue'
import StatusMessage from '@/components/player/StatusMessage.vue'
import WakeLockIndicator from '@/components/player/WakeLockIndicator.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const socket = useSocket()
const wakeLock = useWakeLock()
const { post } = useApi()
const uiStore = useUIStore()

// Initialize theme for PlayerPage (grey theme default)
const { initTheme } = useTheme('PLAYER')
initTheme()

// Debug logging (only active in development mode)
const DEBUG = import.meta.env.DEV
const debugLog = (...args) => {
  if (DEBUG) console.log('[PLAYER DEBUG]', ...args)
}

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
const showAnswerConfirmModal = ref(false)
const pendingAnswerIndex = ref(null)

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
const answerDisplayTimeout = ref(null) // Timeout for auto-clearing revealed answer
const missedQuestionsBanner = ref(false)
const lastJoinRoomAttempt = ref(0) // Track last joinRoom call to prevent duplicates
const joinRoomInProgress = ref(false) // Track if joinRoom is being processed
const showConnectionLostBanner = ref(false)
const reconnectionAttempts = ref(0)

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
    case 'warning': return '!' // Yellow warning triangle
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
    clearTimeout(disconnectTimeout.value)

    // Check if any questions were missed while away
    const missedQuestions = questionHistory.value.filter(q => q.revealed && q.playerChoice === null && q.missedWhileAway)
    if (missedQuestions.length > 0) {
      missedQuestionsBanner.value = true
      setTimeout(() => {
        missedQuestionsBanner.value = false
      }, 5000) // Show banner for 5 seconds
      console.log(`[CONNECTION] Player missed ${missedQuestions.length} question(s) while away`)
    }

    // iOS Safari-specific: Force immediate reconnection
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      console.log('[CONNECTION] iOS device detected - forcing immediate reconnection')

      if (!socket.isConnected.value) {
        socket.connect()
      }

      // Wait for connection, then rejoin room if needed
      if (currentRoomCode.value && currentUsername.value && currentDisplayName.value) {
        const rejoinInterval = setInterval(() => {
          if (socket.isConnected.value) {
            clearInterval(rejoinInterval)
            emitJoinRoom(currentRoomCode.value, currentUsername.value, currentDisplayName.value, 'iOS visibility change')
            updateConnectionState('connected')
          }
        }, 100)

        // Safety timeout - clear interval after 3 seconds
        setTimeout(() => clearInterval(rejoinInterval), 3000)
      }

      // Re-request wake lock for iOS
      if (wakeLock.isSupported.value && !wakeLock.isActive.value) {
        wakeLock.requestWakeLock()
      }

      return // Skip normal reconnection logic for iOS
    }

    // Android Chrome: Check connection after resume delay
    if (/Android.*Chrome/i.test(navigator.userAgent)) {
      console.log('[CONNECTION] Android Chrome detected - delayed reconnection check')
      setTimeout(() => {
        if (!socket.isConnected.value) {
          socket.connect()
        }
      }, 500)
    }

    // Re-request wake lock (for all devices)
    if (wakeLock.isSupported.value && !wakeLock.isActive.value) {
      wakeLock.requestWakeLock()
    }

    // Handle return from away/disconnected state (standard flow for non-iOS)
    if (connectionState.value === 'disconnected') {
      // Was truly disconnected - need to rejoin room
      if (currentRoomCode.value && currentUsername.value && currentDisplayName.value && socket.isConnected.value) {
        emitJoinRoom(currentRoomCode.value, currentUsername.value, currentDisplayName.value, 'visibility change (disconnected)')
        updateConnectionState('connected')
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
  debugLog('setupSocketListeners called', {
    inRoom: inRoom.value,
    currentRoomCode: currentRoomCode.value,
    currentUsername: currentUsername.value,
    timestamp: new Date().toISOString()
  })

  // CRITICAL: Do NOT remove 'connect' and 'disconnect' listeners!
  // useSocket.js has its own listeners that update module-scoped refs.
  // Removing them breaks auto-rejoin which checks socket.isConnected.value

  // Remove only PlayerPage-specific listeners to prevent duplicates
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
    console.log('[CONNECTION] Socket connected')
    debugLog('Socket CONNECT handler fired (PlayerPage)', {
      inRoom: inRoom.value,
      currentRoomCode: currentRoomCode.value,
      currentUsername: currentUsername.value,
      isPageVisible: isPageVisible.value,
      connectionState: connectionState.value,
      timestamp: new Date().toISOString()
    })

    // CRITICAL: If we were already in a room (inRoom === true), we need to rejoin
    // because the socket.id changed. This handles app switching on mobile.
    // The localStorage mechanism in onMounted only runs on initial page load.
    if (inRoom.value && currentRoomCode.value && currentUsername.value && currentDisplayName.value) {
      console.log('[CONNECTION] Socket connected while in room - rejoining')
      debugLog('Auto-rejoining after connect event (app switch scenario)')
      emitJoinRoom(currentRoomCode.value, currentUsername.value, currentDisplayName.value, 'connect event (app switch)')
    }

    // Update connection state to connected (unless page is hidden)
    if (isPageVisible.value && connectionState.value !== 'warning') {
      updateConnectionState('connected')
    }
    // Hide connection lost banner
    showConnectionLostBanner.value = false
    reconnectionAttempts.value = 0
    // Request active rooms list once connected
    debugLog('Emitting getActiveRooms')
    socket.emit('getActiveRooms')
  })

  socket.on('disconnect', () => {
    isConnected.value = false
    // Hard disconnect - mark as disconnected immediately
    console.log('[CONNECTION] Socket disconnected (hard disconnect)')
    updateConnectionState('disconnected')

    // Show connection lost banner
    showConnectionLostBanner.value = true
    reconnectionAttempts.value = 0

    // Set timeout for 5 minutes to fully remove from room
    clearTimeout(disconnectTimeout.value)
    disconnectTimeout.value = setTimeout(() => {
      console.log('[CONNECTION] Disconnect timeout (5 min) - leaving room')
      if (inRoom.value) {
        handleLeaveRoom()
      }
    }, 5 * 60 * 1000) // 5 minutes
  })

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`[CONNECTION] Reconnection attempt #${attempt}`)
    reconnectionAttempts.value = attempt
  })

  socket.on('reconnect', () => {
    console.log('[CONNECTION] Successfully reconnected!')
    debugLog('Socket RECONNECT event - checking if we need to rejoin room', {
      inRoom: inRoom.value,
      currentRoomCode: currentRoomCode.value,
      currentUsername: currentUsername.value,
      currentDisplayName: currentDisplayName.value
    })

    showConnectionLostBanner.value = false
    reconnectionAttempts.value = 0

    // Update connection state to connected after reconnection
    if (connectionState.value !== 'warning') {
      updateConnectionState('connected')
    }

    // CRITICAL: After reconnect, we have a new socket.id
    // Server doesn't have this socket.id in room.players, so we must rejoin
    if (inRoom.value && currentRoomCode.value && currentUsername.value && currentDisplayName.value) {
      console.log('[CONNECTION] Rejoining room after reconnect')
      debugLog('Calling emitJoinRoom after reconnect')
      emitJoinRoom(currentRoomCode.value, currentUsername.value, currentDisplayName.value, 'reconnect event')
    }
  })

  socket.on('playerListUpdate', ({ roomCode, players }) => {
    console.log(`[CONNECTION] playerListUpdate received - roomCode: ${roomCode}, currentRoomCode: ${currentRoomCode.value}, joinInProgress: ${joinRoomInProgress.value}, inRoom: ${inRoom.value}`)
    debugLog('playerListUpdate received', {
      roomCode,
      currentRoomCode: currentRoomCode.value,
      joinRoomInProgress: joinRoomInProgress.value,
      inRoom: inRoom.value,
      playersCount: players?.length,
      timestamp: new Date().toISOString()
    })

    // CRITICAL: Clear joinRoom in-progress flag FIRST - server has confirmed we're in A room
    // This allows answer submissions to proceed even if there's a brief room code mismatch during rejoin
    if (joinRoomInProgress.value) {
      console.log('[CONNECTION] joinRoom completed - ready for interactions (cleared by playerListUpdate)')
      debugLog('Clearing joinRoomInProgress flag - join successful')
      joinRoomInProgress.value = false
    }

    // If this update is for a different room, update our current room to match
    if (roomCode !== currentRoomCode.value) {
      console.log(`[CONNECTION] Room code updated from ${currentRoomCode.value} to ${roomCode}`)
      debugLog('Room code mismatch - updating', {
        from: currentRoomCode.value,
        to: roomCode
      })
      currentRoomCode.value = roomCode
    }

    console.log(`[CONNECTION] ✅ Setting inRoom to TRUE (${players.length} players in room)`)
    inRoom.value = true
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
    // SAFETY: Clear joinRoom in-progress flag - receiving a question means we're definitely in the room
    if (joinRoomInProgress.value) {
      console.log('[CONNECTION] Clearing joinRoom flag (questionPresented received)')
      joinRoomInProgress.value = false
    }

    // CRITICAL: Clear any existing answer display timeout from previous question
    if (answerDisplayTimeout.value) {
      clearTimeout(answerDisplayTimeout.value)
      answerDisplayTimeout.value = null
    }

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
        imageUrl: question.imageUrl || null,
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
      // Check if player already answered this question (from answerHistoryRestored)
      const existingHistory = questionHistory.value.find(q => q.index === questionIndex)
      if (existingHistory && existingHistory.playerChoice !== null) {
        // Player had answered - set their correct/incorrect status
        playerGotCorrect.value = existingHistory.isCorrect
        statusMessage.value = existingHistory.isCorrect ? 'You got it right! 🎉' : 'Better luck next time!'
        statusMessageType.value = existingHistory.isCorrect ? 'success' : 'error'
      } else {
        // Player hadn't answered before reveal
        playerGotCorrect.value = false
        statusMessage.value = 'This question has already been revealed'
        statusMessageType.value = 'info'
      }
    } else if (answeredCurrentQuestion.value) {
      statusMessage.value = 'You already answered this question'
      statusMessageType.value = 'warning'
    } else {
      statusMessage.value = 'Select your answer'
      statusMessageType.value = 'info'
    }
  })

  socket.on('questionRevealed', ({ questionIndex, question, results, answerDisplayTime }) => {
    // CRITICAL: Clear any existing answer display timeout before setting new one
    if (answerDisplayTimeout.value) {
      clearTimeout(answerDisplayTimeout.value)
      answerDisplayTimeout.value = null
    }

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
    answerDisplayTimeout.value = setTimeout(() => {
      questionDisplaying.value = false
      statusMessage.value = 'Waiting for next question...'
      statusMessageType.value = ''
      answerDisplayTimeout.value = null // Clear the ref after timeout completes
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
    // CRITICAL: Clear joinRoomInProgress flag on error - server rejected the join attempt
    if (joinRoomInProgress.value) {
      console.log('[CONNECTION] Clearing joinRoom flag due to room error')
      joinRoomInProgress.value = false
    }
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
  debugLog('PlayerPage onMounted', {
    savedUsername: savedUsername.value,
    timestamp: new Date().toISOString()
  })

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

  // CRITICAL: Initialize socket connection
  // useSocket's lifecycle hooks were removed to prevent multiple registrations
  debugLog('Calling socket.connect() from onMounted')
  socket.connect()

  // Set up all socket listeners
  debugLog('Calling setupSocketListeners() from onMounted')
  setupSocketListeners()

  // Set up Page Visibility API for connection state management
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // Initialize page visibility state
  isPageVisible.value = !document.hidden
  console.log(`[CONNECTION] Initial page visibility: ${isPageVisible.value}`)

  // Handle case where socket is already connected when component mounts
  // (the 'connect' event won't fire for an already-connected socket)
  if (socket.isConnected.value && connectionState.value !== 'connected') {
    console.log('[CONNECTION] Socket already connected on mount - updating state')
    updateConnectionState('connected')
  }

  // Auto-rejoin system: Save room state on page unload
  const handleBeforeUnload = () => {
    if (inRoom.value && currentRoomCode.value) {
      localStorage.setItem('trivia_last_room', JSON.stringify({
        roomCode: currentRoomCode.value,
        username: currentUsername.value,
        displayName: currentDisplayName.value,
        timestamp: Date.now()
      }))
      console.log('[CONNECTION] Saved room state for auto-rejoin')
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Auto-rejoin system: Check for saved session on mount
  const lastRoom = localStorage.getItem('trivia_last_room')
  debugLog('Checking for saved session', {
    lastRoomExists: !!lastRoom,
    timestamp: new Date().toISOString()
  })

  if (lastRoom) {
    try {
      const { roomCode, username, displayName, timestamp } = JSON.parse(lastRoom)
      const ageMinutes = (Date.now() - timestamp) / 60000

      debugLog('Parsed saved session', {
        roomCode,
        username,
        displayName,
        ageMinutes: ageMinutes.toFixed(1),
        sessionTimestamp: new Date(timestamp).toISOString()
      })

      if (ageMinutes < 5) {
        console.log(`[CONNECTION] Found recent session (${ageMinutes.toFixed(1)} min old) - attempting auto-rejoin to room ${roomCode} as ${username}/${displayName}`)
        debugLog('Session is recent - will attempt auto-rejoin', {
          roomCode,
          username,
          displayName,
          socketConnectedNow: socket.isConnected.value
        })

        roomCodeInput.value = roomCode  // Sync input box with auto-rejoin room
        currentRoomCode.value = roomCode
        currentUsername.value = username
        currentDisplayName.value = displayName

        // Wait for socket to connect, then rejoin
        const autoRejoinInterval = setInterval(() => {
          debugLog('Auto-rejoin interval tick', {
            socketConnected: socket.isConnected.value,
            timestamp: new Date().toISOString()
          })
          if (socket.isConnected.value) {
            clearInterval(autoRejoinInterval)
            console.log(`[CONNECTION] Socket connected - executing auto-rejoin for room ${roomCode}`)
            debugLog('Socket connected - triggering auto-rejoin now')
            emitJoinRoom(roomCode, username, displayName, 'localStorage auto-rejoin')
          }
        }, 100)

        // Safety timeout - stop trying after 10 seconds (mobile networks can be slow)
        setTimeout(() => {
          clearInterval(autoRejoinInterval)
          if (!socket.isConnected.value) {
            console.warn('[CONNECTION] Auto-rejoin timeout - socket did not connect within 10 seconds')
            debugLog('Auto-rejoin TIMEOUT - socket never connected', {
              socketConnected: socket.isConnected.value,
              timestamp: new Date().toISOString()
            })
          }
        }, 10000)
      } else {
        console.log(`[CONNECTION] Session too old (${ageMinutes.toFixed(1)} min) - clearing`)
        debugLog('Session too old - clearing localStorage', {
          ageMinutes: ageMinutes.toFixed(1)
        })
        localStorage.removeItem('trivia_last_room')
      }
    } catch (err) {
      console.error('[CONNECTION] Error parsing saved room state:', err)
      debugLog('Error parsing saved session', {
        error: err.message,
        lastRoom
      })
      localStorage.removeItem('trivia_last_room')
    }
  }

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
  // CRITICAL: Don't disconnect socket on unmount!
  // Socket is module-scoped and should persist across page refreshes/remounts
  // Disconnecting here causes duplicate socket creation on mobile refresh
  // socket.disconnect()

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
  emitJoinRoom(roomCode, savedUsername.value, displayName, 'quick join')
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
  if (answeredCurrentQuestion.value || answerRevealed.value) {
    console.log(`[ANSWER] Blocked - already answered (${answeredCurrentQuestion.value}) or revealed (${answerRevealed.value})`)
    return
  }

  // CRITICAL: Block answer submission until joinRoom is fully processed by server
  // This prevents answers from being lost when user reconnects and immediately tries to answer
  if (joinRoomInProgress.value) {
    console.warn('[ANSWER] ❌ BLOCKED - joinRoom still in progress. User will see "Reconnecting..." message')
    statusMessage.value = 'Reconnecting... please wait'
    statusMessageType.value = 'warning'
    return
  }

  console.log(`[ANSWER] Player selected answer ${idx}, showing confirmation modal`)
  // Store the selected answer and show confirmation modal
  pendingAnswerIndex.value = idx
  selectedAnswer.value = idx // Show visual selection
  showAnswerConfirmModal.value = true
}

const confirmAnswer = () => {
  const idx = pendingAnswerIndex.value
  if (idx === null) return

  console.log(`[ANSWER] ✅ Submitting confirmed answer ${idx} for question ${currentQuestion.value.index}`)
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

  // Close modal and clear pending answer
  showAnswerConfirmModal.value = false
  pendingAnswerIndex.value = null
}

const cancelAnswer = () => {
  console.log('[ANSWER] Player cancelled answer selection')
  // Clear selection and close modal
  selectedAnswer.value = null
  pendingAnswerIndex.value = null
  showAnswerConfirmModal.value = false
}

// Helper function to emit joinRoom with proper debouncing and flag management
const emitJoinRoom = (roomCode, username, displayName, source = '') => {
  debugLog('emitJoinRoom called', {
    roomCode,
    username,
    displayName,
    source,
    socketConnected: socket.isConnected.value,
    joinRoomInProgress: joinRoomInProgress.value,
    timestamp: new Date().toISOString()
  })

  // Debounce check
  const now = Date.now()
  if (now - lastJoinRoomAttempt.value < 2000) {
    console.log(`[CONNECTION] Skipping duplicate joinRoom from ${source} (debounced)`)
    debugLog('joinRoom DEBOUNCED', {
      timeSinceLastAttempt: now - lastJoinRoomAttempt.value
    })
    return false
  }
  lastJoinRoomAttempt.value = now

  // Set in-progress flag
  joinRoomInProgress.value = true
  console.log(`[CONNECTION] Emitting joinRoom from ${source} - flag set to true`)
  debugLog('joinRoom emitting to server', {
    roomCode,
    username,
    displayName,
    source
  })

  // SAFETY: Auto-clear flag after 5 seconds as fallback
  // This prevents the flag from getting stuck if playerListUpdate doesn't fire
  setTimeout(() => {
    if (joinRoomInProgress.value) {
      console.warn('[CONNECTION] joinRoom flag still true after 5s - auto-clearing (safety mechanism)')
      debugLog('joinRoom safety timeout triggered - flag still true after 5s')
      joinRoomInProgress.value = false
    }
  }, 5000)

  // PHASE 1: Get PlayerID for persistent player identification
  const playerID = socket.getPlayerID()
  debugLog('PlayerID for joinRoom:', playerID)

  // Emit the event with PlayerID
  socket.emit('joinRoom', { roomCode, username, displayName, playerID })
  socket.setRoomContext(roomCode, username)

  return true
}

const handleJoinRoom = async () => {
  const username = savedUsername.value || usernameInput.value.trim()
  const displayName = displayNameInput.value.trim()
  const roomCode = roomCodeInput.value.trim()

  if (DEBUG) {
    console.log('[JOIN] handleJoinRoom called:', {
      username,
      displayName,
      roomCode,
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)
    })
  }

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
    if (DEBUG) console.log('[JOIN] Calling check-username API')
    const response = await post('/api/auth/check-username', { username })
    if (DEBUG) console.log('[JOIN] check-username response:', response.data)

    if (response.data.requiresAuth) {
      if (DEBUG) console.log('[JOIN] Auth required, verifying token')
      const hasToken = await verifyAuthToken()
      if (!hasToken) {
        if (DEBUG) console.log('[JOIN] No valid token, showing login modal')
        loginUsername.value = username
        loginError.value = ''
        showLoginModal.value = true
        return
      }
      if (DEBUG) console.log('[JOIN] Token verified, proceeding with join')
    } else {
      if (DEBUG) console.log('[JOIN] Guest account, no auth required')
      localStorage.setItem('playerUsername', username)
      localStorage.setItem('playerAccountType', 'guest')
      savedUsername.value = username
    }

    localStorage.setItem('playerDisplayName', displayName)
    currentUsername.value = username
    currentDisplayName.value = displayName
    currentRoomCode.value = roomCode
    // Don't save room yet - wait for playerListUpdate confirmation
    if (DEBUG) console.log('[JOIN] Emitting joinRoom event')
    emitJoinRoom(roomCode, username, displayName, 'manual join')
  } catch (err) {
    if (DEBUG) {
      console.error('[JOIN] Error in handleJoinRoom:', err)
      console.error('[JOIN] Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      })
    }
    // Show actual error message to user
    const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
    uiStore.addNotification(`Join failed: ${errorMsg}`, 'error')
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
    emitJoinRoom(roomCode, loginUsername.value, displayName, 'login submit')
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
    emitJoinRoom(roomCode, setPasswordUsername.value, displayName, 'password setup')
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

  // Clear any pending answer display timeout
  if (answerDisplayTimeout.value) {
    clearTimeout(answerDisplayTimeout.value)
    answerDisplayTimeout.value = null
  }

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

const forceReconnect = () => {
  console.log('[CONNECTION] Manual reconnection triggered')
  socket.disconnect()
  setTimeout(() => {
    socket.connect()
    setupSocketListeners() // CRITICAL: Re-register event listeners after reconnect
  }, 100)
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
  background: var(--bg-primary);
  color: var(--text-primary);
}

.player-container {
  display: flex;
  flex: 1 1 auto;
  gap: 1rem;
  padding: 1rem;
  position: relative;
  box-sizing: border-box;
}

/* Connection Lost Banner */
.connection-lost-banner {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  background: var(--danger-color);
  color: var(--text-primary);
  padding: 1rem;
  z-index: 9999;
  animation: slideDown 0.3s ease;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.banner-content .icon {
  font-size: 1.5rem;
}

.banner-content .text {
  flex: 1;
}

.banner-content .text strong {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.banner-content .text p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

/* Button styles now in Button component */
.reconnect-btn {
  margin-left: auto; /* Keep for flexbox positioning */
}

/* Missed Questions Banner */
.missed-questions-banner {
  position: fixed;
  top: 120px; /* Below connection lost banner */
  left: 50%;
  transform: translateX(-50%);
  background: var(--warning-color);
  color: var(--text-primary);
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  box-shadow: var(--shadow-lg);
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
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 15px;
  border: 1px solid var(--border-color);
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
