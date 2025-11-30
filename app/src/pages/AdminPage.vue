<template>
  <div class="admin-page">
    <!-- Navigation Bar -->
    <nav class="navbar">
      <div class="logo">Trivia Admin</div>
      <div class="hamburger" @click.stop="toggleMenu">&#9776;</div>
      <ul class="menu" :class="{ open: menuOpen }" id="menu">
        <li><router-link to="/admin">Admin</router-link></li>
        <li><router-link to="/player">Player</router-link></li>
        <li><router-link to="/presenter">Presenter</router-link></li>
        <li><router-link to="/display">Spectate</router-link></li>
        <li class="username-item">
          <span>{{ authStore.username || 'Admin' }}</span>
        </li>
        <li>
          <a href="#" @click.prevent="logout" style="color: #f66;">Logout</a>
        </li>
      </ul>
    </nav>

    <!-- Tab Navigation -->
    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ 'active-tab': activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Main Content -->
    <main class="container">
      <!-- Quiz Management Tab -->
      <div v-if="activeTab === 'quiz'" class="tab-content quiz-management">
        <!-- Left Column: Quiz Creation + Selection (Fixed) -->
        <aside class="quiz-sidebar" @mousedown.stop="startResize(1, $event)">
          <h2>Create / Select Quiz</h2>
          <button class="btn-primary" @click="showCreateQuizModal">Create New Quiz</button>

          <!-- Excel Import/Export -->
          <div class="excel-import-box">
            <h3>Import from Excel</h3>
            <p>Upload an Excel file to create a quiz</p>
            <button class="btn-download" @click="downloadTemplate">📥 Download Template</button>
            <input
              ref="excelFileInput"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="handleExcelUpload"
            />
            <button class="btn-upload" @click="$refs.excelFileInput.click()">📤 Upload Excel File</button>
            <div v-if="importStatus" class="import-status">{{ importStatus }}</div>
          </div>

          <div class="quiz-form">
            <input v-model="quizTitle" type="text" placeholder="Quiz Title" />
            <textarea v-model="quizDescription" placeholder="Quiz Description"></textarea>
          </div>

          <div class="quiz-list">
            <div v-if="quizzes.length === 0" class="empty-state"><em>No quizzes</em></div>
            <div v-for="quiz in quizzes" :key="quiz.filename" class="quiz-item" @click="selectQuiz(quiz)">
              <div class="quiz-name">{{ quiz.title }}</div>
              <div class="quiz-count">{{ quiz.questionCount || 0 }} questions</div>
              <button @click.stop="deleteQuiz(quiz.filename)" class="btn-delete">Delete</button>
            </div>
          </div>
        </aside>

        <!-- Middle Column: Question Editor (Fixed) -->
        <section class="question-editor-panel" @mousedown.stop="startResize(2, $event)">
          <h2>Question Editor</h2>
          <textarea v-model="questionText" placeholder="Question Text" class="question-text-input" rows="3"></textarea>

          <div class="choices-header">
            <h3>Choices</h3>
            <div class="choice-buttons">
              <button @click="addChoice" class="btn-add">+ Add</button>
              <button @click="removeChoice" class="btn-remove">- Remove</button>
            </div>
          </div>

          <div class="choices-container">
            <div v-for="(choice, idx) in choices" :key="idx" class="choice-input-wrapper">
              <input v-model="choices[idx]" type="text" :placeholder="`Choice ${idx + 1}`" />
            </div>
          </div>

          <div class="correct-choice-wrapper">
            <label for="correctChoice">Correct Answer:</label>
            <select v-model="correctChoice">
              <option v-for="(choice, idx) in choices" :key="idx" :value="idx">
                {{ choice || `Choice ${idx + 1}` }}
              </option>
            </select>
          </div>

          <div class="question-editor-buttons">
            <button @click="saveQuestion" class="btn-primary">{{ editingQuestionIdx !== null ? 'Update' : 'Add' }}</button>
            <button v-if="editingQuestionIdx !== null" @click="clearQuestionForm" class="btn-secondary">Cancel</button>
          </div>
        </section>

        <!-- Right Column: Questions List (Scrollable) -->
        <aside class="questions-sidebar">
          <div class="questions-list-header">
            <h2>Questions</h2>
            <div v-if="selectedQuiz" class="shuffle-controls">
              <button @click="shuffleQuestions" class="btn-shuffle" title="Shuffle Questions">🔀</button>
              <button @click="shuffleAllChoices" class="btn-shuffle" title="Shuffle All Choices">🎲</button>
            </div>
          </div>
          <div class="questions-list">
            <div v-if="currentQuestions.length === 0" class="empty-state"><em>No questions</em></div>
            <div v-for="(question, idx) in currentQuestions" :key="idx" class="question-item" :class="{ active: editingQuestionIdx === idx }">
              <div class="question-content" @click="editQuestion(idx)">
                <div class="question-text">Q{{ idx + 1 }}</div>
                <div class="question-preview">{{ question.text }}</div>
              </div>
              <div class="question-actions">
                <button @click="editQuestion(idx)" class="btn-edit" title="Edit">✏️</button>
                <button @click="deleteQuestion(idx)" class="btn-delete" title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Completed Sessions Tab -->
      <div v-if="activeTab === 'sessions'" class="tab-content sessions-management">
        <section>
          <h2>Completed Quiz Sessions</h2>
          <div class="sessions-list">
            <div v-if="completedSessions.length === 0" class="empty-state"><em>No completed sessions</em></div>
            <div v-for="session in completedSessions" :key="session.filename" class="session-item" @click="viewSessionDetails(session)">
              <div class="session-title">{{ session.quizTitle }} ({{ session.roomCode }})</div>
              <div class="session-date">{{ formatDate(session.completedAt) }}</div>
              <div class="session-stats">{{ session.playerCount || 0 }} players</div>
            </div>
          </div>
        </section>
      </div>

      <!-- Quiz Options Tab -->
      <div v-if="activeTab === 'options'" class="tab-content options-management">
        <section>
          <h2>Quiz Options</h2>
          <p class="section-description">Configure global quiz settings</p>

          <div class="options-box">
            <h3>Answer Display Timeout</h3>
            <p class="option-description">
              How long to show the revealed answer before auto-hiding (in seconds).
              Players will also see the answer until the next question is presented.
            </p>

            <div class="timeout-input-wrapper">
              <input v-model.number="answerDisplayTime" type="number" min="5" max="300" />
              <span>seconds</span>
            </div>

            <div class="quick-buttons">
              <button @click="setQuickTimeout(10)" class="btn-quick">10s</button>
              <button @click="setQuickTimeout(30)" class="btn-quick">30s</button>
              <button @click="setQuickTimeout(60)" class="btn-quick">1min</button>
              <button @click="setQuickTimeout(120)" class="btn-quick">2min</button>
            </div>

            <button @click="saveQuizOptions" class="btn-primary">Save Options</button>

            <div v-if="optionsSaveMessage" :class="['options-save-msg', optionsSaveMessageType]">
              {{ optionsSaveMessage }}
            </div>
          </div>
        </section>
      </div>

      <!-- User Management Tab -->
      <div v-if="activeTab === 'users'" class="tab-content users-management">
        <section>
          <h2>User Management</h2>
          <p class="section-description">View and manage all user accounts (guests and registered players)</p>

          <div class="users-header">
            <button @click="loadUsers" class="btn-refresh">🔄 Refresh Users</button>
            <div class="user-count">{{ users.length }} user(s)</div>
          </div>

          <div class="users-list">
            <div v-if="users.length === 0" class="empty-state"><em>No users</em></div>
            <div v-for="user in users" :key="user.id" class="user-item">
              <div class="user-info">
                <div class="user-name">{{ user.username }}</div>
                <div class="user-type">{{ user.account_type === 'admin' ? 'Admin' : 'Player' }}</div>
              </div>
              <div class="user-stats">
                <div v-if="user.last_login" class="user-last-login">Last login: {{ formatDate(user.last_login) }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- About Tab -->
      <div v-if="activeTab === 'about'" class="tab-content about-management">
        <section class="about-section">
          <div class="about-header">
            <h2>About TriviaForge</h2>
            <div class="version-box">
              <div class="version-label">Version</div>
              <div class="version-number">2.1.7</div>
            </div>
          </div>

          <div class="about-grid">
            <!-- Features Column -->
            <div class="about-card">
              <h3>✨ Key Features</h3>
              <ul>
                <li>✓ Real-time quiz presentations</li>
                <li>✓ Live leaderboards & rankings</li>
                <li>✓ Player authentication & accounts</li>
                <li>✓ Excel bulk import</li>
                <li>✓ Session resumption</li>
                <li>✓ Mobile-optimized interface</li>
                <li>✓ Spectator display mode</li>
                <li>✓ Answer history tracking</li>
              </ul>
            </div>

            <!-- Getting Started Column -->
            <div class="about-card">
              <h3>🚀 Quick Start</h3>
              <ol>
                <li><strong>Create a Quiz</strong> - Use the Quiz Management tab to create or import quizzes</li>
                <li><strong>Launch Session</strong> - Go to Presenter page and make a quiz live</li>
                <li><strong>Share Code</strong> - Players join using the room code or QR code</li>
                <li><strong>Present Questions</strong> - Navigate and reveal answers in real-time</li>
              </ol>
            </div>

            <!-- Support Column -->
            <div class="about-card">
              <h3>💡 Getting Help</h3>
              <ul>
                <li>📖 <a href="https://github.com/EmanTemplar/TriviaForge" target="_blank">View Documentation</a></li>
                <li>🐛 <a href="https://github.com/EmanTemplar/TriviaForge/issues" target="_blank">Report Issues</a></li>
                <li>💬 <a href="https://github.com/EmanTemplar/TriviaForge/discussions" target="_blank">Ask Questions</a></li>
                <li>⭐ <a href="https://github.com/EmanTemplar/TriviaForge" target="_blank">Star on GitHub</a></li>
              </ul>
            </div>
          </div>

          <!-- System Information -->
          <div class="system-info-box">
            <h3>📊 System Information</h3>
            <div class="system-grid">
              <div class="system-item">
                <div class="system-label">Application</div>
                <div class="system-value">TriviaForge</div>
              </div>
              <div class="system-item">
                <div class="system-label">Environment</div>
                <div class="system-value">Production</div>
              </div>
              <div class="system-item">
                <div class="system-label">Database</div>
                <div class="system-value">PostgreSQL 15</div>
              </div>
              <div class="system-item">
                <div class="system-label">Real-time Protocol</div>
                <div class="system-value">WebSocket (Socket.IO)</div>
              </div>
            </div>
          </div>

          <!-- About Text -->
          <div class="about-text-box">
            <h3>About This Application</h3>
            <p>
              TriviaForge is a modern, real-time trivia game platform designed for educators, event organizers, and trivia enthusiasts. It enables interactive quiz sessions with instant feedback, live leaderboards, and comprehensive player analytics.
            </p>
            <p>
              With features like session resumption, user authentication, and mobile-optimized interfaces, TriviaForge provides a seamless experience for presenters and players. Whether you're running classroom quizzes, corporate events, or casual game nights, TriviaForge adapts to your needs.
            </p>
            <p>
              Built with modern web technologies including Node.js, Socket.IO for real-time communication, and PostgreSQL for robust data management, TriviaForge ensures reliability, performance, and data integrity.
            </p>
          </div>

          <!-- License Info -->
          <div class="license-box">
            <p>
              <strong>License:</strong> Licensed under the PolyForm Noncommercial License 1.0.0 - Free for educational and personal use. See GitHub for full license details.
            </p>
          </div>
        </section>
      </div>
    </main>

    <!-- Dialog Modal -->
    <Modal :isOpen="showDialog" size="small" :title="dialogTitle" @close="handleDialogCancel">
      <p class="dialog-message">{{ dialogMessage }}</p>
      <div v-if="dialogShowInput" class="dialog-input-wrapper">
        <input v-model="dialogInputValue" type="text" class="dialog-input" />
      </div>
      <template #footer>
        <div class="dialog-buttons">
          <button @click="handleDialogCancel" class="btn-secondary">Cancel</button>
          <button @click="handleDialogConfirm" class="btn-primary">{{ dialogConfirmText }}</button>
        </div>
      </template>
    </Modal>

    <!-- Session Detail Modal -->
    <Modal :isOpen="showSessionModal" size="large" title="Session Details" @close="showSessionModal = false">
      <div v-if="selectedSession" class="session-detail-content">
        <div class="session-detail-header">
          <h3>{{ selectedSession.quizTitle }}</h3>
          <div class="session-detail-meta">
            <span>Room: {{ selectedSession.roomCode }}</span>
            <span>{{ formatDate(selectedSession.completedAt) }}</span>
          </div>
        </div>

        <div v-if="selectedSession.playerResults && selectedSession.playerResults.length > 0" class="session-results">
          <h4>Player Results</h4>
          <table class="results-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Correct</th>
                <th>Incorrect</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(result, idx) in selectedSession.playerResults" :key="idx">
                <td>{{ result.name }}</td>
                <td>{{ result.correct }}</td>
                <td>{{ (result.answered || 0) - (result.correct || 0) }}</td>
                <td>{{ getAccuracy(result) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import { useApi } from '@/composables/useApi.js'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const { get, post } = useApi()
const authStore = useAuthStore()

// UI State
const menuOpen = ref(false)
const activeTab = ref('quiz')
const showDialog = ref(false)
const showSessionModal = ref(false)

// Column resizing
const col1Width = ref(280)
const col2Width = ref(450)
const resizingColumn = ref(null)

// Dialog state
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogConfirmText = ref('Confirm')
const dialogShowInput = ref(false)
const dialogInputValue = ref('')
let dialogResolve = null

// Quiz Management
const quizzes = ref([])
const selectedQuiz = ref(null)
const quizTitle = ref('')
const quizDescription = ref('')
const questionText = ref('')
const choices = ref(['', '', '', ''])
const correctChoice = ref(0)
const currentQuestions = ref([])
const importStatus = ref('')
const editingQuestionIdx = ref(null)

// Sessions
const completedSessions = ref([])
const selectedSession = ref(null)

// Options
const answerDisplayTime = ref(30)
const optionsSaveMessage = ref('')
const optionsSaveMessageType = ref('success')

// Users
const users = ref([])

// Tabs
const tabs = [
  { id: 'quiz', label: 'Quiz Management' },
  { id: 'sessions', label: 'Completed Sessions' },
  { id: 'options', label: 'Quiz Options' },
  { id: 'users', label: 'User Management' },
  { id: 'about', label: 'About' }
]

// Tab switching
const switchTab = (tabId) => {
  activeTab.value = tabId
  menuOpen.value = false

  // Load data when switching to certain tabs
  if (tabId === 'sessions') loadSessions()
  if (tabId === 'users') loadUsers()
  if (tabId === 'options') loadOptions()
}

// Quiz functions
const loadQuizzes = async () => {
  try {
    const response = await get('/api/quizzes')
    quizzes.value = response.data
  } catch (err) {
    console.error('Error loading quizzes:', err)
  }
}

const selectQuiz = async (quiz) => {
  selectedQuiz.value = quiz
  quizTitle.value = quiz.title
  quizDescription.value = quiz.description || ''

  try {
    const response = await get(`/api/quizzes/${quiz.filename}`)
    currentQuestions.value = response.data.questions || []
  } catch (err) {
    console.error('Error loading quiz questions:', err)
  }
}

const deleteQuiz = async (filename) => {
  const confirmed = await showConfirm('Delete this quiz? This cannot be undone.', 'Delete Quiz')
  if (confirmed) {
    try {
      await post(`/api/quizzes/${filename}/delete`, {})
      loadQuizzes()
      if (selectedQuiz.value?.filename === filename) {
        selectedQuiz.value = null
        currentQuestions.value = []
      }
      showAlert('Quiz deleted successfully')
    } catch (err) {
      showAlert('Error deleting quiz: ' + err.message, 'Error')
    }
  }
}

const showCreateQuizModal = async () => {
  const confirmed = await showPrompt('Enter quiz title:', 'Create New Quiz')
  if (confirmed) {
    try {
      await post('/api/quizzes', { title: confirmed })
      loadQuizzes()
      showAlert('Quiz created successfully')
    } catch (err) {
      showAlert('Error creating quiz: ' + err.message, 'Error')
    }
  }
}

const downloadTemplate = async () => {
  try {
    const response = await get('/api/quiz-template', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'quiz_template.xlsx')
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
  } catch (err) {
    showAlert('Error downloading template: ' + err.message, 'Error')
  }
}

const handleExcelUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  importStatus.value = 'Uploading...'
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await post('/api/import-quiz', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    importStatus.value = `Success: ${response.data.title} created with ${response.data.questionCount} questions`
    loadQuizzes()
    setTimeout(() => { importStatus.value = '' }, 3000)
  } catch (err) {
    importStatus.value = `Error: ${err.message}`
    setTimeout(() => { importStatus.value = '' }, 3000)
  }
}

const addChoice = () => {
  choices.value.push('')
}

const removeChoice = () => {
  if (choices.value.length > 2) {
    choices.value.pop()
    if (correctChoice.value >= choices.value.length) {
      correctChoice.value = choices.value.length - 1
    }
  }
}

const editQuestion = (idx) => {
  const question = currentQuestions.value[idx]
  questionText.value = question.text
  choices.value = [...question.choices]
  correctChoice.value = question.correctChoice
  editingQuestionIdx.value = idx
  // Scroll to editor
  document.querySelector('.question-editor')?.scrollIntoView({ behavior: 'smooth' })
}

const clearQuestionForm = () => {
  questionText.value = ''
  choices.value = ['', '', '', '']
  correctChoice.value = 0
  editingQuestionIdx.value = null
}

const saveQuestion = async () => {
  if (!questionText.value.trim()) {
    showAlert('Please enter a question', 'Missing Question')
    return
  }
  if (choices.value.filter(c => c.trim()).length < 2) {
    showAlert('Please enter at least 2 choices', 'Missing Choices')
    return
  }

  if (!selectedQuiz.value) {
    showAlert('Please select or create a quiz first', 'No Quiz Selected')
    return
  }

  try {
    const question = {
      text: questionText.value,
      choices: choices.value,
      correctChoice: parseInt(correctChoice.value)
    }

    if (editingQuestionIdx.value !== null) {
      // Update existing question
      await post(`/api/quizzes/${selectedQuiz.value.filename}/questions/${editingQuestionIdx.value}`, question)
      showAlert('Question updated successfully')
    } else {
      // Add new question
      await post(`/api/quizzes/${selectedQuiz.value.filename}/questions`, question)
      showAlert('Question saved successfully')
    }

    // Reset form
    clearQuestionForm()

    // Reload questions
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error saving question: ' + err.message, 'Error')
  }
}

const deleteQuestion = async (idx) => {
  const confirmed = await showConfirm('Delete this question?', 'Delete Question')
  if (confirmed) {
    try {
      await post(`/api/quizzes/${selectedQuiz.value.filename}/questions/${idx}/delete`, {})
      selectQuiz(selectedQuiz.value)
    } catch (err) {
      showAlert('Error deleting question: ' + err.message, 'Error')
    }
  }
}

const shuffleQuestions = async () => {
  if (!selectedQuiz.value) return
  try {
    await post(`/api/quizzes/${selectedQuiz.value.filename}/shuffle-questions`, {})
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error shuffling questions: ' + err.message, 'Error')
  }
}

const shuffleAllChoices = async () => {
  if (!selectedQuiz.value) return
  try {
    await post(`/api/quizzes/${selectedQuiz.value.filename}/shuffle-choices`, {})
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error shuffling choices: ' + err.message, 'Error')
  }
}

// Sessions functions
const loadSessions = async () => {
  try {
    const response = await get('/api/sessions/completed')
    completedSessions.value = response.data
  } catch (err) {
    console.error('Error loading sessions:', err)
  }
}

const viewSessionDetails = (session) => {
  selectedSession.value = session
  showSessionModal.value = true
}

// Options functions
const loadOptions = async () => {
  try {
    const response = await get('/api/options')
    answerDisplayTime.value = response.data.answerDisplayTime || 30
  } catch (err) {
    console.error('Error loading options:', err)
  }
}

const setQuickTimeout = (seconds) => {
  answerDisplayTime.value = seconds
}

const saveQuizOptions = async () => {
  try {
    await post('/api/options', { answerDisplayTime: answerDisplayTime.value })
    optionsSaveMessage.value = 'Options saved successfully'
    optionsSaveMessageType.value = 'success'
    setTimeout(() => { optionsSaveMessage.value = '' }, 3000)
  } catch (err) {
    optionsSaveMessage.value = 'Error saving options: ' + err.message
    optionsSaveMessageType.value = 'error'
  }
}

// Users functions
const loadUsers = async () => {
  try {
    const response = await get('/api/users')
    users.value = response.data
  } catch (err) {
    console.error('Error loading users:', err)
  }
}

// Dialog functions
const showAlert = (message, title = 'Notification') => {
  return new Promise((resolve) => {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogShowInput.value = false
    dialogConfirmText.value = 'OK'
    dialogResolve = resolve
    showDialog.value = true
  })
}

const showConfirm = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogShowInput.value = false
    dialogConfirmText.value = 'Confirm'
    dialogResolve = resolve
    showDialog.value = true
  })
}

const showPrompt = (message, title = 'Enter value') => {
  return new Promise((resolve) => {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogShowInput.value = true
    dialogInputValue.value = ''
    dialogConfirmText.value = 'OK'
    dialogResolve = () => resolve(dialogInputValue.value || null)
    showDialog.value = true
  })
}

const handleDialogConfirm = () => {
  showDialog.value = false
  dialogResolve?.()
  dialogResolve = null
}

const handleDialogCancel = () => {
  showDialog.value = false
  dialogResolve?.(false)
  dialogResolve = null
}

// Menu toggle
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenuIfOutside = (e) => {
  const menu = document.getElementById('menu')
  const hamburger = e.target.closest('.hamburger')
  if (menu && menu.classList && menu.classList.contains('open') && !menu.contains(e.target) && !hamburger) {
    menuOpen.value = false
  }
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

// Column resizing utilities
const startResize = (column, e) => {
  const target = e.currentTarget
  const rect = target.getBoundingClientRect()
  const rightEdge = rect.right
  const clickX = e.clientX

  // Only trigger resize if click is near the right edge (within 10px)
  if (Math.abs(clickX - rightEdge) > 10) return

  resizingColumn.value = { column, startX: e.clientX, startCol1Width: col1Width.value, startCol2Width: col2Width.value }
  e.preventDefault()
}

const handleMouseMove = (e) => {
  if (!resizingColumn.value) return

  const delta = e.clientX - resizingColumn.value.startX
  const { column, startCol1Width, startCol2Width } = resizingColumn.value

  // Minimum column width is 200px
  const minWidth = 200

  if (column === 1) {
    const newWidth = Math.max(minWidth, startCol1Width + delta)
    col1Width.value = newWidth
  } else if (column === 2) {
    const newWidth = Math.max(minWidth, startCol2Width + delta)
    col2Width.value = newWidth
  }
}

const stopResize = () => {
  resizingColumn.value = null
}

// Utilities
const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString()
}

const getAccuracy = (result) => {
  if (!result.answered || result.answered === 0) return '-'
  return ((result.correct / result.answered) * 100).toFixed(1)
}

// Lifecycle
onMounted(() => {
  loadQuizzes()
  document.addEventListener('click', closeMenuIfOutside)
  document.addEventListener('touchstart', closeMenuIfOutside)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuIfOutside)
  document.removeEventListener('touchstart', closeMenuIfOutside)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.admin-page {
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
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  color: #4fc3f7;
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

.tabs-container {
  display: flex;
  gap: 0;
  background: rgba(0, 0, 0, 0.3);
  padding: 0 2rem;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn.active-tab {
  color: #fff;
  border-bottom-color: #007bff;
}

.tab-btn:hover {
  color: #fff;
}

.container {
  flex: 1;
  overflow: hidden;
  padding: 1rem;
}

.tab-content {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Quiz Management Tab - 3-Column Layout */
.quiz-management {
  display: grid;
  grid-template-columns: v-bind(col1Width + 'px') v-bind(col2Width + 'px') 1fr;
  gap: 0;
  height: 100%;
  position: relative;
}

.quiz-sidebar {
  overflow-y: auto;
  padding: 0 1rem 0 0;
  border-right: 1px solid rgba(79, 195, 247, 0.2);
  position: relative;
}

.quiz-sidebar::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
}

.question-editor-panel {
  overflow-y: auto;
  padding: 0 1rem 0 1rem;
  border-right: 1px solid rgba(79, 195, 247, 0.2);
  min-height: 0;
  position: relative;
}

.question-editor-panel::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
}

.questions-sidebar {
  overflow-y: auto;
  padding: 0 0 0 1rem;
  min-height: 0;
}

.resize-handle {
  position: absolute;
  top: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
}

.resize-handle:hover {
  background: rgba(79, 195, 247, 0.3);
}

.quiz-sidebar h2,
.question-editor-panel h2,
.questions-sidebar h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.question-editor-panel h3 {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.95rem;
}

.btn-primary,
.btn-secondary,
.btn-delete,
.btn-download,
.btn-upload,
.btn-add,
.btn-remove,
.btn-quick,
.btn-refresh,
.btn-shuffle,
.btn-edit {
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  border: 1px solid transparent;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-primary {
  width: 100%;
  background: rgba(0, 123, 255, 0.3);
  border-color: rgba(0, 123, 255, 0.5);
  color: #fff;
  margin-top: 1rem;
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
}

.btn-delete {
  width: 100%;
  background: rgba(200, 0, 0, 0.2);
  border-color: rgba(200, 0, 0, 0.5);
  color: #f66;
  margin-top: 0.5rem;
}

.btn-delete:hover {
  background: rgba(200, 0, 0, 0.3);
}

.btn-download,
.btn-upload {
  width: 100%;
  margin-bottom: 0.5rem;
}

.btn-download {
  background: rgba(0, 200, 0, 0.2);
  border-color: rgba(0, 200, 0, 0.5);
  color: #0f0;
}

.btn-download:hover {
  background: rgba(0, 200, 0, 0.3);
}

.btn-upload {
  background: rgba(0, 123, 255, 0.3);
  border-color: rgba(0, 123, 255, 0.5);
  color: #007bff;
}

.btn-upload:hover {
  background: rgba(0, 123, 255, 0.5);
}

.btn-add {
  background: rgba(0, 255, 0, 0.2);
  border-color: rgba(0, 255, 0, 0.5);
  color: #0f0;
  padding: 0.4rem 0.8rem;
}

.btn-add:hover {
  background: rgba(0, 255, 0, 0.3);
}

.btn-remove {
  background: rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 0, 0, 0.5);
  color: #f66;
  padding: 0.4rem 0.8rem;
}

.btn-remove:hover {
  background: rgba(255, 0, 0, 0.3);
}

.btn-quick,
.btn-refresh {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.btn-quick:hover,
.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-shuffle {
  background: rgba(255, 165, 0, 0.2);
  border-color: rgba(255, 165, 0, 0.5);
  color: #ffa500;
}

.btn-shuffle:hover {
  background: rgba(255, 165, 0, 0.3);
}

.excel-import-box {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0, 123, 255, 0.1);
  border-radius: 5px;
  border: 1px solid rgba(0, 123, 255, 0.3);
}

.excel-import-box h3 {
  margin-top: 0;
  font-size: 1rem;
  color: #4fc3f7;
}

.excel-import-box p {
  font-size: 0.85rem;
  color: #aaa;
  margin: 0.5rem 0;
}

.import-status {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #aaa;
}

.quiz-form {
  margin: 1rem 0;
}

.quiz-form input,
.quiz-form textarea,
input[type="text"],
textarea,
select {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-family: inherit;
}

input[type="text"]::placeholder,
textarea::placeholder {
  color: #666;
}

input[type="text"]:focus,
textarea:focus,
select:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(79, 195, 247, 0.5);
}

.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: auto;
  overflow-y: auto;
  margin-top: 1rem;
  flex: 1;
}

.quiz-item {
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quiz-item:hover {
  background: rgba(79, 195, 247, 0.2);
}

.quiz-name {
  font-weight: 600;
  color: #fff;
}

.quiz-count {
  font-size: 0.85rem;
  color: #aaa;
  margin: 0.25rem 0;
}

.question-editor {
  flex: 0 0 auto;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
}

.choices-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.choices-header h3 {
  margin: 0;
}

.choice-buttons {
  display: flex;
  gap: 0.5rem;
}

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.choice-input-wrapper {
  display: flex;
}

.choice-input-wrapper input {
  margin-bottom: 0;
}

.correct-choice-wrapper {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.correct-choice-wrapper label {
  display: block;
  margin-bottom: 0.5rem;
  color: #aaa;
  font-size: 0.9rem;
}

.questions-list-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.questions-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.questions-list-header h2 {
  margin: 0;
}

.shuffle-controls {
  display: flex;
  gap: 0.5rem;
}

.questions-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.question-item {
  padding: 1rem;
  background: rgba(79, 195, 247, 0.05);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 8px;
}

.question-text {
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.5rem;
}

.question-choices {
  list-style-position: inside;
  margin: 0.5rem 0;
  padding: 0;
  font-size: 0.9rem;
  color: #aaa;
}

.question-choices li {
  margin: 0.25rem 0;
}

.question-choices li.correct {
  color: #0f0;
  font-weight: 600;
}

/* Compact Question Editor */
.question-text-input {
  font-size: 0.9rem;
  padding: 0.5rem !important;
  margin-bottom: 0.75rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.choices-container {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.choice-input-wrapper input {
  font-size: 0.85rem;
  padding: 0.4rem !important;
  margin-bottom: 0.3rem;
}

.correct-choice-wrapper {
  margin-bottom: 0.75rem;
}

.correct-choice-wrapper select {
  font-size: 0.85rem;
  padding: 0.4rem !important;
}

.choice-buttons .btn-add,
.choice-buttons .btn-remove {
  padding: 0.4rem 0.6rem !important;
  font-size: 0.8rem;
}

.question-editor-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.question-editor-buttons .btn-primary {
  flex: 1;
  padding: 0.5rem !important;
  font-size: 0.9rem;
  margin-top: 0;
}

.question-editor-buttons .btn-secondary {
  flex: 0 0 auto;
  padding: 0.5rem 0.8rem !important;
  font-size: 0.8rem;
}

/* Questions List in Right Sidebar */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.question-item {
  padding: 0.75rem;
  background: rgba(79, 195, 247, 0.05);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 6px;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  transition: all 0.2s;
}

.question-item:hover {
  background: rgba(79, 195, 247, 0.1);
  border-color: rgba(79, 195, 247, 0.4);
}

.question-item.active {
  background: rgba(79, 195, 247, 0.15);
  border-color: rgba(79, 195, 247, 0.6);
  box-shadow: 0 0 8px rgba(79, 195, 247, 0.3);
}

.question-content {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.question-content .question-text {
  font-weight: 700;
  color: #4fc3f7;
  font-size: 0.9rem;
  margin-bottom: 0.2rem;
}

.question-preview {
  font-size: 0.8rem;
  color: #aaa;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}

.question-actions {
  display: flex;
  gap: 0.3rem;
}

.btn-edit {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.5);
  color: #4fc3f7;
  padding: 0.4rem 0.5rem !important;
  font-size: 0.85rem;
  min-width: 0;
}

.btn-edit:hover {
  background: rgba(79, 195, 247, 0.3);
}

.question-item .btn-delete {
  background: rgba(200, 0, 0, 0.2);
  border-color: rgba(200, 0, 0, 0.5);
  color: #f66;
  padding: 0.4rem 0.5rem !important;
  font-size: 0.85rem;
  width: auto;
  margin-top: 0;
}

.question-item .btn-delete:hover {
  background: rgba(200, 0, 0, 0.3);
}

/* Questions List Header */
.questions-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.shuffle-controls {
  display: flex;
  gap: 0.3rem;
}

.shuffle-controls .btn-shuffle {
  padding: 0.4rem 0.5rem !important;
  font-size: 1rem;
  min-width: auto;
  width: auto;
}

/* Sessions Tab */
.sessions-management section,
.options-management section,
.users-management section {
  max-width: auto;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-item {
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.session-item:hover {
  background: rgba(79, 195, 247, 0.2);
}

.session-title {
  font-weight: 600;
  color: #fff;
}

.session-date {
  font-size: 0.85rem;
  color: #aaa;
  margin: 0.25rem 0;
}

.session-stats {
  font-size: 0.9rem;
  color: #4fc3f7;
}

/* Options Tab */
.options-management {
  max-width: 600px;
}

.section-description {
  color: #aaa;
  margin-bottom: 2rem;
}

.options-box {
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 10px;
}

.option-description {
  color: #aaa;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.timeout-input-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.timeout-input-wrapper input {
  width: 100px;
  text-align: center;
  font-size: 1.1rem;
}

.quick-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.options-save-msg {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
}

.options-save-msg.success {
  background: rgba(0, 200, 0, 0.2);
  border: 1px solid rgba(0, 200, 0, 0.5);
  color: #0f0;
}

.options-save-msg.error {
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.5);
  color: #f66;
}

/* Users Tab */
.users-header {
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-count {
  color: #aaa;
  font-size: 0.9rem;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-item {
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: #fff;
}

.user-type {
  font-size: 0.85rem;
  color: #aaa;
  margin-top: 0.25rem;
}

.user-stats {
  text-align: right;
}

.user-last-login {
  font-size: 0.85rem;
  color: #aaa;
}

/* About Tab */
.about-management {
  overflow-y: auto;
  max-height: calc(100vh - 140px);
}

.about-section {
  max-width: auto;
}

.about-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.about-header h2 {
  margin: 0;
}

.version-box {
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.version-label {
  color: #aaa;
  font-size: 0.9rem;
}

.version-number {
  color: #4fc3f7;
  font-size: 1.8rem;
  font-weight: bold;
  margin-top: 0.5rem;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.about-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.about-card h3 {
  color: #4fc3f7;
  margin-top: 0;
}

.about-card ul,
.about-card ol {
  color: #aaa;
  line-height: 1.8;
  padding-left: 1.2rem;
  margin: 0;
}

.about-card ul {
  list-style: none;
  padding: 0;
}

.about-card ul li {
  margin-bottom: 0.5rem;
}

.about-card a {
  color: #4fc3f7;
  text-decoration: none;
}

.about-card a:hover {
  text-decoration: underline;
}

.system-info-box {
  background: rgba(0, 200, 0, 0.1);
  border: 1px solid rgba(0, 200, 0, 0.3);
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 2rem;
}

.system-info-box h3 {
  margin-top: 0;
  color: #4fc3f7;
}

.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  color: #aaa;
}

.system-item {
  display: flex;
  flex-direction: column;
}

.system-label {
  font-size: 0.85rem;
  color: #888;
}

.system-value {
  color: #fff;
  font-weight: 600;
  margin-top: 0.3rem;
}

.about-text-box {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
}

.about-text-box h3 {
  margin-top: 0;
  color: #4fc3f7;
}

.about-text-box p {
  color: #aaa;
  line-height: 1.8;
  margin: 0 0 1rem 0;
}

.about-text-box p:last-child {
  margin-bottom: 0;
}

.license-box {
  padding: 1rem;
  background: rgba(100, 100, 100, 0.2);
  border-radius: 8px;
  border-left: 4px solid rgba(0, 200, 0, 0.6);
}

.license-box p {
  color: #aaa;
  font-size: 0.9rem;
  margin: 0;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}

/* Dialog */
.dialog-message {
  margin: 0;
  color: #aaa;
  text-align: center;
  white-space: pre-wrap;
}

.dialog-input-wrapper {
  margin-top: 1rem;
}

.dialog-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
}

.dialog-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(79, 195, 247, 0.5);
}

.dialog-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Session Detail Modal */
.session-detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.session-detail-header {
  margin-bottom: 2rem;
}

.session-detail-header h3 {
  margin: 0 0 0.75rem 0;
}

.session-detail-meta {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: #aaa;
}

.session-results h4 {
  margin: 1rem 0;
  color: #fff;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.results-table thead {
  background: rgba(0, 0, 0, 0.5);
}

.results-table th {
  text-align: left;
  padding: 1rem 0.5rem;
  color: #aaa;
  font-weight: bold;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.results-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .quiz-management {
    flex-direction: column;
  }

  .quiz-section {
    max-width: 100%;
    padding-right: 0;
  }

  .questions-editor-section {
    max-width: 100%;
    padding-left: 0;
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
  .container {
    padding: 1rem;
  }

  .tabs-container {
    padding: 0 1rem;
    overflow-x: auto;
  }

  .tab-btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 600px) {
  .navbar {
    padding: 0.75rem;
  }

  .logo {
    font-size: 1rem;
  }

  .container {
    padding: 0.75rem;
  }

  .tab-btn {
    padding: 0.65rem 0.8rem;
    font-size: 0.8rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-delete {
    padding: 0.5rem 0.75rem;
  }

  .quiz-management {
    flex-direction: column;
  }

  .about-grid {
    grid-template-columns: 1fr;
  }

  .system-grid {
    grid-template-columns: 1fr;
  }

  .about-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .timeout-input-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
