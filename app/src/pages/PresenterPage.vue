<template>
  <div class="presenter-page">
    <!-- Navigation Bar -->
    <PresenterNavbar
      :currentRoomCode="currentRoomCode"
      :menuOpen="menuOpen"
      :username="authStore.username"
      @toggleMenu="toggleMenu"
      @logout="logout"
    />

    <!-- Main Content -->
    <div class="presenter-container">
      <!-- Left Column: Sidebar -->
      <PresenterSidebar
        :quizzes="quizzes"
        :selectedQuizFilename="selectedQuizFilename"
        @update:selectedQuizFilename="selectedQuizFilename = $event"
        :currentRoomCode="currentRoomCode"
        :incompleteSessions="incompleteSessions"
        :selectedSessionFilename="selectedSessionFilename"
        @update:selectedSessionFilename="selectedSessionFilename = $event"
        :activeRooms="activeRooms"
        @makeRoomLive="makeRoomLive"
        @showQRModal="showQRModal"
        @resumeSession="resumeSession"
        @viewRoom="viewRoom"
        @closeRoom="closeRoom"
      />

      <!-- Middle Column: Quiz Display -->
      <QuizDisplay
        :currentQuizTitle="currentQuizTitle"
        :currentQuestions="currentQuestions"
        :currentQuestionIndex="currentQuestionIndex"
        :presentedQuestionIndex="presentedQuestionIndex"
        :presentedQuestions="presentedQuestions"
        :revealedQuestions="revealedQuestions"
        :currentRoomCode="currentRoomCode"
        @selectQuestion="selectQuestion"
        @previousQuestion="previousQuestion"
        @nextQuestion="nextQuestion"
        @presentQuestion="presentQuestion"
        @revealAnswer="revealAnswer"
        @completeQuiz="completeQuiz"
      />

      <!-- Right Column: Connected Players -->
      <ConnectedPlayersList
        :nonSpectatorPlayers="nonSpectatorPlayers"
        :currentRoomCode="currentRoomCode"
        @showPresenterProgress="showPresenterProgress"
        @kickPlayer="kickPlayer"
        @banDisplayName="banDisplayName"
      />
    </div>

    <!-- Modals -->
    <QRCodeModal
      :isOpen="showQRCodeModal"
      :qrCodeData="qrCodeData"
      :qrCodeUrl="qrCodeUrl"
      @close="showQRCodeModal = false"
    />

    <LiveStandingsModal
      :isOpen="showProgressModal"
      :progressStats="progressStats"
      :sortedPlayers="sortedPlayers"
      @close="showProgressModal = false"
    />

    <AnswerRevealModal
      :isOpen="showAnswerRevealModal"
      :answerRevealData="answerRevealData"
      @close="showAnswerRevealModal = false"
    />

    <!-- Custom Dialog Modal -->
    <Modal :isOpen="showDialog" size="small" :title="dialogTitle" @close="handleDialogCancel">
      <template #default>
        <p class="dialog-message">{{ dialogMessage }}</p>
      </template>
      <template #footer>
        <div class="dialog-buttons">
          <Button v-if="dialogType === 'confirm'" @click="handleDialogCancel" variant="secondary">Cancel</Button>
          <Button @click="handleDialogConfirm" variant="success">
            {{ dialogType === 'confirm' ? 'Confirm' : 'OK' }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import PresenterNavbar from '@/components/presenter/PresenterNavbar.vue'
import PresenterSidebar from '@/components/presenter/PresenterSidebar.vue'
import QuizDisplay from '@/components/presenter/QuizDisplay.vue'
import ConnectedPlayersList from '@/components/presenter/ConnectedPlayersList.vue'
import QRCodeModal from '@/components/presenter/QRCodeModal.vue'
import LiveStandingsModal from '@/components/presenter/LiveStandingsModal.vue'
import AnswerRevealModal from '@/components/presenter/AnswerRevealModal.vue'
import { useSocket } from '@/composables/useSocket.js'
import { useApi } from '@/composables/useApi.js'
import { useAuthStore } from '@/stores/auth.js'
import { useTheme } from '@/composables/useTheme.js'

const router = useRouter()
const socket = useSocket()
const { post, get } = useApi()
const authStore = useAuthStore()

// Initialize theme for PresenterPage (dark theme default)
const { initTheme } = useTheme('PRESENTER')
initTheme()

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
  const confirmed = await showConfirm(`Remove ${playerName} from the session?`, 'Remove Player')
  if (confirmed) {
    socket.emit('kickPlayer', { roomCode: currentRoomCode.value, username: playerName })
  }
}

// Ban display name
const banDisplayName = async (playerName) => {
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
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.presenter-container {
  display: grid;
  grid-template-columns: 300px 1fr 250px;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
  overflow: hidden;
}

.dialog-message {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 1rem;
  line-height: 1.5;
  text-align: center;
  white-space: pre-wrap;
}

.dialog-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Button styles now in Button component */

/* Responsive Design */
@media (max-width: 1200px) {
  .presenter-container {
    grid-template-columns: 250px 1fr 200px;
  }
}

@media (max-width: 900px) {
  .presenter-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .presenter-container {
    padding: 0.5rem;
    gap: 0.5rem;
  }
}
</style>
