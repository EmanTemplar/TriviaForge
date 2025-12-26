<template>
  <div class="admin-page">
    <!-- Navigation Bar -->
    <AdminNavBar
      :username="authStore.username"
      :menuOpen="menuOpen"
      @toggle-menu="toggleMenu"
      @logout="logout"
    />

    <!-- Tab Navigation -->
    <AdminTabNavigation
      :activeTab="activeTab"
      :tabs="tabs"
      @switchTab="switchTab"
    />

    <!-- Main Content -->
    <main class="container">
      <!-- Quiz Management Tab -->
      <div v-if="activeTab === 'quiz'" class="tab-content quiz-management">
        <QuizSidebar
          v-model:quizTitle="quizTitle"
          v-model:quizDescription="quizDescription"
          :quizzes="quizzes"
          :importStatus="importStatus"
          @createQuiz="showCreateQuizModal"
          @downloadTemplate="downloadTemplate"
          @excelUpload="handleExcelUpload"
          @selectQuiz="selectQuiz"
          @deleteQuiz="deleteQuiz"
          @startResize="startResize"
        />

        <QuestionEditor
          v-model:questionText="questionText"
          v-model:correctChoice="correctChoice"
          :choices="choices"
          :editingQuestionIdx="editingQuestionIdx"
          :draggedChoiceIdx="draggedChoiceIdx"
          :dragOverChoiceIdx="dragOverChoiceIdx"
          @updateChoice="updateChoice"
          @addChoice="addChoice"
          @removeChoice="removeChoice"
          @saveQuestion="saveQuestion"
          @clearForm="clearQuestionForm"
          @startResize="startResize"
          @choiceDragStart="handleChoiceDragStart"
          @choiceDragOver="handleChoiceDragOver"
          @choiceDragLeave="handleChoiceDragLeave"
          @choiceDrop="handleChoiceDrop"
          @choiceDragEnd="handleChoiceDragEnd"
        />

        <QuestionsList
          :questions="currentQuestions"
          :selectedQuiz="selectedQuiz"
          :editingQuestionIdx="editingQuestionIdx"
          :draggedQuestionIdx="draggedQuestionIdx"
          :dragOverIdx="dragOverIdx"
          @shuffleQuestions="shuffleQuestions"
          @shuffleAllChoices="shuffleAllChoices"
          @editQuestion="editQuestion"
          @moveQuestionUp="moveQuestionUp"
          @moveQuestionDown="moveQuestionDown"
          @moveQuestionToFirst="moveQuestionToFirst"
          @moveQuestionToLast="moveQuestionToLast"
          @deleteQuestion="deleteQuestion"
          @questionDragStart="handleDragStart"
          @questionDragOver="handleDragOver"
          @questionDragLeave="handleDragLeave"
          @questionDrop="handleDrop"
          @questionDragEnd="handleDragEnd"
        />
      </div>

      <!-- Session Management Tab -->
      <div v-if="activeTab === 'sessions'" class="tab-content sessions-management">
        <SessionsList
          :sessions="completedSessions"
          :formatDate="formatDate"
          @viewSession="viewSessionDetails"
          @deleteSession="deleteSessionFromList"
        />
      </div>

      <!-- Quiz Options Tab -->
      <div v-if="activeTab === 'options'" class="tab-content options-management">
        <QuizOptionsPanel
          v-model:answerDisplayTime="answerDisplayTime"
          :saveMessage="optionsSaveMessage"
          :saveMessageType="optionsSaveMessageType"
          @setQuickTimeout="setQuickTimeout"
          @saveOptions="saveQuizOptions"
        />
      </div>

      <!-- User Management Tab -->
      <div v-if="activeTab === 'users'" class="tab-content users-management">
        <UserManagementPanel
          :adminUsers="adminUsers"
          :playerUsers="playerUsers"
          :guestUsers="guestUsers"
          :formatDate="formatDate"
          @refresh="loadUsers"
          @deleteUser="deleteUser"
          @resetPassword="resetUserPassword"
          @downgrade="downgradeUser"
        />
      </div>

      <!-- Banned Display Names Tab -->
      <div v-if="activeTab === 'banned-names'" class="tab-content banned-names-management">
        <BannedNamesPanel
          :bannedNames="bannedNames"
          :formatDate="formatDate"
          @addBannedName="showAddBannedNameModal"
          @refresh="loadBannedNames"
          @removeBannedName="removeBannedName"
        />
      </div>

      <!-- About Tab -->
      <div v-if="activeTab === 'about'" class="tab-content about-management">
        <AboutPanel />
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
    <SessionDetailModal
      :isOpen="showSessionModal"
      :session="selectedSession"
      :expandedQuestions="expandedQuestions"
      :formatDate="formatDate"
      @close="showSessionModal = false"
      @deleteSession="confirmDeleteSession"
      @toggleQuestion="toggleQuestionExpanded"
    />

    <!-- Delete Confirmation Modal -->
    <Modal :isOpen="showDeleteConfirmModal" @close="showDeleteConfirmModal = false" title="Confirm Deletion">
      <p style="color: #aaa; margin-bottom: 1.5rem;">
        Are you sure you want to delete session <strong style="color: #fff;">{{ sessionToDelete?.quizTitle }}</strong> ({{ sessionToDelete?.roomCode }})?
      </p>
      <p style="color: #f66; margin-bottom: 1.5rem;">
        This action cannot be undone.
      </p>
      <template #footer>
        <button class="btn-danger" @click="confirmDelete">Delete</button>
        <button class="btn-secondary" @click="showDeleteConfirmModal = false">Cancel</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import { useApi } from '@/composables/useApi.js'
import { useAuthStore } from '@/stores/auth.js'

// Admin Components
import AdminNavBar from '@/components/admin/AdminNavBar.vue'
import AdminTabNavigation from '@/components/admin/AdminTabNavigation.vue'
import QuizSidebar from '@/components/admin/QuizSidebar.vue'
import QuestionEditor from '@/components/admin/QuestionEditor.vue'
import QuestionsList from '@/components/admin/QuestionsList.vue'
import SessionsList from '@/components/admin/SessionsList.vue'
import QuizOptionsPanel from '@/components/admin/QuizOptionsPanel.vue'
import UserManagementPanel from '@/components/admin/UserManagementPanel.vue'
import BannedNamesPanel from '@/components/admin/BannedNamesPanel.vue'
import AboutPanel from '@/components/admin/AboutPanel.vue'
import SessionDetailModal from '@/components/admin/SessionDetailModal.vue'

const router = useRouter()
const { get, post, put, delete: delete_ } = useApi()
const authStore = useAuthStore()

// UI State
const menuOpen = ref(false)
const activeTab = ref('quiz')
const showDialog = ref(false)
const showSessionModal = ref(false)
const showDeleteConfirmModal = ref(false)
const sessionToDelete = ref(null)

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
const draggedQuestionIdx = ref(null)
const dragOverIdx = ref(null)
const draggedChoiceIdx = ref(null)
const dragOverChoiceIdx = ref(null)

// Sessions
const completedSessions = ref([])
const selectedSession = ref(null)
const expandedQuestions = ref(new Set())

// Options
const answerDisplayTime = ref(30)
const optionsSaveMessage = ref('')
const optionsSaveMessageType = ref('success')

// Users
const users = ref([])
const bannedNames = ref([])

// Computed Properties
// Group users by account type
const adminUsers = computed(() => users.value.filter(user => user.accountType === 'admin'))
const playerUsers = computed(() => users.value.filter(user => user.accountType === 'player'))
const guestUsers = computed(() => users.value.filter(user => user.accountType === 'guest'))

// Tabs
const tabs = [
  { id: 'quiz', label: 'Quiz Management' },
  { id: 'sessions', label: 'Session Management' },
  { id: 'options', label: 'Quiz Options' },
  { id: 'users', label: 'User Management' },
  { id: 'banned-names', label: 'Banned Names' },
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
  if (tabId === 'banned-names') loadBannedNames()
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
      await delete_(`/api/quizzes/${filename}`)
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
    // Ensure blob has correct MIME type
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'quiz_template.xlsx')
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
    // Clean up the URL object
    window.URL.revokeObjectURL(url)
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
    // Show detailed error message from server response
    const errorMessage = err.response?.data?.error || err.message
    importStatus.value = `Error: ${errorMessage}`
    setTimeout(() => { importStatus.value = '' }, 5000)
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

const updateChoice = (idx, value) => {
  choices.value[idx] = value
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

    // Update local questions array
    if (editingQuestionIdx.value !== null) {
      // Update existing question
      currentQuestions.value[editingQuestionIdx.value] = question
      showAlert('Question updated successfully')
    } else {
      // Add new question
      currentQuestions.value.push(question)
      showAlert('Question saved successfully')
    }

    // Update quiz on server with all questions
    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: currentQuestions.value
    })

    // Reset form
    clearQuestionForm()

    // Refresh the quiz list to update question count and reload questions
    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error saving question: ' + err.message, 'Error')
  }
}

const deleteQuestion = async (idx) => {
  const confirmed = await showConfirm('Delete this question?', 'Delete Question')
  if (confirmed) {
    try {
      // Remove question from local array
      currentQuestions.value.splice(idx, 1)

      // Update quiz on server with remaining questions
      await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
        title: quizTitle.value,
        description: quizDescription.value,
        questions: currentQuestions.value
      })

      showAlert('Question deleted successfully')
      // Refresh the quiz list to update question count and reload questions
      await loadQuizzes()
      selectQuiz(selectedQuiz.value)
    } catch (err) {
      showAlert('Error deleting question: ' + err.message, 'Error')
    }
  }
}

// Utility function to shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const shuffleQuestions = async () => {
  if (!selectedQuiz.value) return
  try {
    // Shuffle questions locally
    const shuffledQuestions = shuffleArray(currentQuestions.value)

    // Save shuffled questions via PUT endpoint
    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: shuffledQuestions
    })

    // Reload to refresh display
    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
    showAlert('Questions shuffled successfully')
  } catch (err) {
    showAlert('Error shuffling questions: ' + err.message, 'Error')
  }
}

// Question reordering functions
const moveQuestionUp = async (idx) => {
  if (idx === 0 || !selectedQuiz.value) return
  try {
    const reorderedQuestions = [...currentQuestions.value]
    // Swap with previous question
    ;[reorderedQuestions[idx], reorderedQuestions[idx - 1]] = [reorderedQuestions[idx - 1], reorderedQuestions[idx]]

    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: reorderedQuestions
    })

    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error reordering question: ' + err.message, 'Error')
  }
}

const moveQuestionDown = async (idx) => {
  if (idx >= currentQuestions.value.length - 1 || !selectedQuiz.value) return
  try {
    const reorderedQuestions = [...currentQuestions.value]
    // Swap with next question
    ;[reorderedQuestions[idx], reorderedQuestions[idx + 1]] = [reorderedQuestions[idx + 1], reorderedQuestions[idx]]

    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: reorderedQuestions
    })

    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error reordering question: ' + err.message, 'Error')
  }
}

const moveQuestionToFirst = async (idx) => {
  if (idx === 0 || !selectedQuiz.value) return
  try {
    const reorderedQuestions = [...currentQuestions.value]
    // Remove question from current position
    const [movedQuestion] = reorderedQuestions.splice(idx, 1)
    // Insert at beginning
    reorderedQuestions.unshift(movedQuestion)

    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: reorderedQuestions
    })

    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error reordering question: ' + err.message, 'Error')
  }
}

const moveQuestionToLast = async (idx) => {
  if (idx >= currentQuestions.value.length - 1 || !selectedQuiz.value) return
  try {
    const reorderedQuestions = [...currentQuestions.value]
    // Remove question from current position
    const [movedQuestion] = reorderedQuestions.splice(idx, 1)
    // Insert at end
    reorderedQuestions.push(movedQuestion)

    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: reorderedQuestions
    })

    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error reordering question: ' + err.message, 'Error')
  }
}

// Drag-and-drop handlers
const handleDragStart = (idx) => {
  draggedQuestionIdx.value = idx
}

const handleDragOver = (event, idx) => {
  event.preventDefault()
  dragOverIdx.value = idx
}

const handleDragLeave = () => {
  dragOverIdx.value = null
}

const handleDrop = async (event, dropIdx) => {
  event.preventDefault()
  const dragIdx = draggedQuestionIdx.value

  if (dragIdx === null || dragIdx === dropIdx || !selectedQuiz.value) {
    draggedQuestionIdx.value = null
    dragOverIdx.value = null
    return
  }

  try {
    const reorderedQuestions = [...currentQuestions.value]
    // Remove from old position
    const [movedQuestion] = reorderedQuestions.splice(dragIdx, 1)
    // Insert at new position
    reorderedQuestions.splice(dropIdx, 0, movedQuestion)

    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: reorderedQuestions
    })

    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
  } catch (err) {
    showAlert('Error reordering question: ' + err.message, 'Error')
  } finally {
    draggedQuestionIdx.value = null
    dragOverIdx.value = null
  }
}

const handleDragEnd = () => {
  draggedQuestionIdx.value = null
  dragOverIdx.value = null
}

// Choice drag-and-drop handlers
const handleChoiceDragStart = (idx) => {
  draggedChoiceIdx.value = idx
}

const handleChoiceDragOver = (event, idx) => {
  event.preventDefault()
  dragOverChoiceIdx.value = idx
}

const handleChoiceDragLeave = () => {
  dragOverChoiceIdx.value = null
}

const handleChoiceDrop = (event, dropIdx) => {
  event.preventDefault()
  const dragIdx = draggedChoiceIdx.value

  if (dragIdx === null || dragIdx === dropIdx) {
    draggedChoiceIdx.value = null
    dragOverChoiceIdx.value = null
    return
  }

  const newChoices = [...choices.value]
  // Remove from old position
  const [movedChoice] = newChoices.splice(dragIdx, 1)
  // Insert at new position
  newChoices.splice(dropIdx, 0, movedChoice)
  choices.value = newChoices

  // Adjust correct choice index
  if (correctChoice.value === dragIdx) {
    // The correct choice was moved
    correctChoice.value = dropIdx
  } else if (dragIdx < correctChoice.value && dropIdx >= correctChoice.value) {
    // Choice was moved from before to after correct choice
    correctChoice.value = correctChoice.value - 1
  } else if (dragIdx > correctChoice.value && dropIdx <= correctChoice.value) {
    // Choice was moved from after to before correct choice
    correctChoice.value = correctChoice.value + 1
  }

  draggedChoiceIdx.value = null
  dragOverChoiceIdx.value = null
}

const handleChoiceDragEnd = () => {
  draggedChoiceIdx.value = null
  dragOverChoiceIdx.value = null
}

const shuffleAllChoices = async () => {
  if (!selectedQuiz.value) return
  try {
    // Shuffle choices within each question and track correct answer index
    const updatedQuestions = currentQuestions.value.map(question => {
      const choiceIndexMap = question.choices.map((_, idx) => idx)
      const shuffledIndices = shuffleArray(choiceIndexMap)
      const shuffledChoices = shuffledIndices.map(idx => question.choices[idx])

      // Find where the correct answer ended up
      const correctChoiceIndex = shuffledIndices.indexOf(question.correctChoice)

      return {
        ...question,
        choices: shuffledChoices,
        correctChoice: correctChoiceIndex
      }
    })

    // Save shuffled choices via PUT endpoint
    await put(`/api/quizzes/${selectedQuiz.value.filename}`, {
      title: quizTitle.value,
      description: quizDescription.value,
      questions: updatedQuestions
    })

    // Reload to refresh display
    await loadQuizzes()
    selectQuiz(selectedQuiz.value)
    showAlert('Choices shuffled successfully')
  } catch (err) {
    showAlert('Error shuffling choices: ' + err.message, 'Error')
  }
}

// Sessions functions
const loadSessions = async () => {
  try {
    const response = await get('/api/sessions')
    completedSessions.value = response.data
  } catch (err) {
    console.error('Error loading sessions:', err)
  }
}

const viewSessionDetails = async (session) => {
  try {
    // Fetch full session details including player results
    const response = await get(`/api/sessions/${session.filename}`)
    selectedSession.value = response.data
    expandedQuestions.value = new Set() // Clear expanded questions when opening a new session
    showSessionModal.value = true
  } catch (err) {
    console.error('Error loading session details:', err)
    showAlert('Failed to load session details', 'Error')
  }
}

const toggleQuestionExpanded = (questionIndex) => {
  if (expandedQuestions.value.has(questionIndex)) {
    expandedQuestions.value.delete(questionIndex)
  } else {
    expandedQuestions.value.add(questionIndex)
  }
  // Force reactivity
  expandedQuestions.value = new Set(expandedQuestions.value)
}

const confirmDeleteSession = (session) => {
  // Close the session details modal first
  showSessionModal.value = false
  // Store the session to delete and show confirmation modal
  sessionToDelete.value = session
  showDeleteConfirmModal.value = true
}

const deleteSessionFromList = (session) => {
  // Store the session to delete and show confirmation modal
  sessionToDelete.value = session
  showDeleteConfirmModal.value = true
}

const confirmDelete = async () => {
  if (!sessionToDelete.value) return

  try {
    await delete_(`/api/sessions/${sessionToDelete.value.filename}`)
    showDeleteConfirmModal.value = false
    sessionToDelete.value = null
    showAlert('Session deleted successfully')
    await loadSessions() // Reload the list
  } catch (err) {
    console.error('Error deleting session:', err)
    showDeleteConfirmModal.value = false
    sessionToDelete.value = null
    showAlert('Failed to delete session', 'Error')
  }
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
    // Filter out spectators (Display/Spectator Display)
    users.value = (response.data || []).filter(user => user.username !== 'Display')
  } catch (err) {
    console.error('Error loading users:', err)
  }
}

const deleteUser = async (user) => {
  const confirmed = await showConfirm(
    `Are you sure you want to delete user "${user.username}"?\n\nThis action cannot be undone.`,
    'Delete User'
  )

  if (!confirmed) return

  try {
    await delete_(`/api/users/${user.id}`)
    await showAlert(`User "${user.username}" has been deleted successfully.`, 'User Deleted')
    await loadUsers() // Refresh the list
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to delete user'
    await showAlert(message, 'Error')
    console.error('Error deleting user:', err)
  }
}

const downgradeUser = async (user) => {
  const confirmed = await showConfirm(
    `Downgrade "${user.username}" from Player to Guest?\n\nThis will:\n- Remove their password\n- End all active sessions\n- Keep their game history\n\nThey can be re-registered later.`,
    'Downgrade to Guest'
  )

  if (!confirmed) return

  try {
    await post(`/api/users/${user.id}/downgrade`, {})
    await showAlert(`User "${user.username}" has been downgraded to guest.`, 'User Downgraded')
    await loadUsers() // Refresh the list
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to downgrade user'
    await showAlert(message, 'Error')
    console.error('Error downgrading user:', err)
  }
}

const resetUserPassword = async (user) => {
  const confirmed = await showConfirm(
    `Reset password for "${user.username}"?\n\nThis will:\n- Clear their current password\n- End all active sessions\n- Prompt them to set a new password on next login`,
    'Reset Password'
  )

  if (!confirmed) return

  try {
    await post(`/api/users/${user.id}/reset-password`, {})
    await showAlert(`Password reset for "${user.username}".\n\nThey will be prompted to set a new password on next login.`, 'Password Reset')
    await loadUsers() // Refresh the list
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to reset password'
    await showAlert(message, 'Error')
    console.error('Error resetting password:', err)
  }
}

// Banned Names functions
const loadBannedNames = async () => {
  try {
    const response = await get('/api/banned-names')
    bannedNames.value = response.data.bannedNames || []
  } catch (err) {
    console.error('Error loading banned names:', err)
  }
}

const showAddBannedNameModal = async () => {
  const pattern = await showPrompt('Enter the display name pattern to ban:', 'Add Banned Name')
  if (!pattern || !pattern.trim()) return

  const patternType = await showConfirm(
    `Ban pattern: "${pattern}"\n\nSelect matching type:\n\n- Exact: Blocks only exact matches (case-insensitive)\n- Contains: Blocks any name containing this pattern\n\nClick "Confirm" for EXACT match, or "Cancel" for CONTAINS match.`,
    'Select Match Type'
  )

  const type = patternType ? 'exact' : 'contains'

  try {
    await post('/api/banned-names', {
      pattern: pattern.trim(),
      patternType: type
    })
    await showAlert(`Display name pattern "${pattern}" (${type}) has been banned.`, 'Name Banned')
    await loadBannedNames()
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to ban name'
    await showAlert(message, 'Error')
    console.error('Error banning name:', err)
  }
}

const removeBannedName = async (name) => {
  const confirmed = await showConfirm(
    `Remove ban for pattern "${name.pattern}" (${name.pattern_type})?`,
    'Remove Ban'
  )

  if (!confirmed) return

  try {
    await delete_(`/api/banned-names/${name.id}`)
    await showAlert(`Banned pattern "${name.pattern}" has been removed.`, 'Ban Removed')
    await loadBannedNames()
  } catch (err) {
    const message = err.response?.data?.error || 'Failed to remove ban'
    await showAlert(message, 'Error')
    console.error('Error removing ban:', err)
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

let isPromptDialog = false

const showConfirm = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    isPromptDialog = false
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
    isPromptDialog = true
    dialogTitle.value = title
    dialogMessage.value = message
    dialogShowInput.value = true
    dialogInputValue.value = ''
    dialogConfirmText.value = 'OK'
    dialogResolve = resolve
    showDialog.value = true
  })
}

const handleDialogConfirm = () => {
  showDialog.value = false
  if (isPromptDialog) {
    dialogResolve?.(dialogInputValue.value || null)
  } else {
    dialogResolve?.(true)
  }
  dialogResolve = null
}

const handleDialogCancel = () => {
  showDialog.value = false
  if (isPromptDialog) {
    dialogResolve?.(null)
  } else {
    dialogResolve?.(false)
  }
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

  // Minimum column widths
  const minWidth = 200
  const minCol3Width = 250 // Minimum width for questions list

  // Get container width
  const container = document.querySelector('.quiz-management')
  if (!container) return
  const containerWidth = container.clientWidth

  if (column === 1) {
    const newWidth = Math.max(minWidth, startCol1Width + delta)
    // Ensure col1 + col2 doesn't exceed container width minus min col3 width
    const maxWidth = containerWidth - col2Width.value - minCol3Width
    col1Width.value = Math.min(newWidth, maxWidth)
  } else if (column === 2) {
    const newWidth = Math.max(minWidth, startCol2Width + delta)
    // Ensure col1 + col2 doesn't exceed container width minus min col3 width
    const maxWidth = containerWidth - col1Width.value - minCol3Width
    col2Width.value = Math.min(newWidth, maxWidth)
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

// Watch for quiz deselection to clear question editor
watch(selectedQuiz, (newQuiz) => {
  // Clear question editor fields when quiz is deselected or changed
  if (!newQuiz) {
    clearQuestionForm()
  }
})

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
  grid-template-columns: v-bind(col1Width + 'px') v-bind(col2Width + 'px') minmax(250px, 1fr);
  gap: 0;
  height: 100%;
  position: relative;
}

.quiz-sidebar {
  padding: 0 1rem 0 0;
  border-right: 1px solid rgba(79, 195, 247, 0.2);
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  display: flex;
  flex-direction: column;
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
  padding: 0 0 0 1rem;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.editor-header h2 {
  margin: 0;
}

.btn-new-question {
  padding: 0.4rem 0.8rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 6px;
  color: #4fc3f7;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-new-question:hover {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.question-editor-panel h3 {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.95rem;
}

.btn-primary,
.btn-secondary,
.btn-delete,
.btn-danger,
.btn-download,
.btn-upload,
.btn-add,
.btn-remove,
.btn-quick,
.btn-refresh,
.btn-shuffle {
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
  margin-top: 0rem;
}

.btn-delete:hover {
  background: rgba(200, 0, 0, 0.3);
}

.btn-danger {
  background: rgba(200, 0, 0, 0.2);
  border-color: rgba(200, 0, 0, 0.5);
  color: #f66;
}

.btn-danger:hover {
  background: rgba(200, 0, 0, 0.3);
  border-color: rgba(200, 0, 0, 0.7);
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
  overflow-y: auto;
}

.choice-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.choice-label {
  min-width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(79, 195, 247, 0.15);
  border-radius: 6px;
  font-weight: 600;
  color: #4fc3f7;
  font-size: 0.95rem;
  border: 1px solid rgba(79, 195, 247, 0.3);
}

.choice-input-wrapper input {
  margin-bottom: 0;
  flex: 1;
}

.choice-input-wrapper.dragging {
  opacity: 0.4;
}

.choice-input-wrapper.drag-over {
  border: 2px dashed rgba(255, 193, 7, 0.8);
  background: rgba(255, 193, 7, 0.1);
  border-radius: 4px;
}

.choice-label.draggable {
  cursor: grab;
  transition: all 0.2s;
}

.choice-label.draggable:hover {
  background: rgba(79, 195, 247, 0.25);
  border-color: rgba(79, 195, 247, 0.5);
  transform: scale(1.05);
}

.choice-label.draggable:active {
  cursor: grabbing;
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
  height: auto;
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
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  transition: all 0.2s;
}

.session-item:hover {
  background: rgba(79, 195, 247, 0.2);
}

.session-content {
  flex: 1;
  cursor: pointer;
}

.btn-delete-inline {
  padding: 0.5rem 0.75rem;
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.5);
  border-radius: 6px;
  color: #f66;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-delete-inline:hover {
  background: rgba(200, 0, 0, 0.3);
  border-color: rgba(200, 0, 0, 0.7);
  transform: scale(1.1);
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

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.session-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.session-status.status-active {
  background: rgba(0, 255, 0, 0.2);
  color: #0f0;
  border: 1px solid rgba(0, 255, 0, 0.4);
}

.session-status.status-in_progress {
  background: rgba(0, 255, 0, 0.2);
  color: #0f0;
  border: 1px solid rgba(0, 255, 0, 0.4);
}

.session-status.status-resumed {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
  border: 1px solid rgba(255, 165, 0, 0.4);
}

.session-status.status-completed {
  background: rgba(79, 195, 247, 0.2);
  color: #4fc3f7;
  border: 1px solid rgba(79, 195, 247, 0.4);
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

/* User Categories */
.user-category {
  margin-bottom: 2rem;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px 8px 0 0;
  margin-bottom: 0.5rem;
  border: 1px solid;
}

.category-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.category-count {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.admin-header {
  background: rgba(255, 0, 0, 0.15);
  border-color: rgba(255, 0, 0, 0.4);
  color: #ff6666;
}

.player-header {
  background: rgba(79, 195, 247, 0.15);
  border-color: rgba(79, 195, 247, 0.4);
  color: #4fc3f7;
}

.guest-header {
  background: rgba(170, 170, 170, 0.15);
  border-color: rgba(170, 170, 170, 0.4);
  color: #aaa;
}

/* Scrollable user lists */
.users-list-scrollable {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0 0 8px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: none;
}

/* Custom scrollbar for user lists */
.users-list-scrollable::-webkit-scrollbar {
  width: 8px;
}

.users-list-scrollable::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.users-list-scrollable::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.5);
  border-radius: 4px;
}

.users-list-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 195, 247, 0.7);
}

.user-item {
  padding: 1rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.user-item:hover {
  background: rgba(79, 195, 247, 0.15);
  transform: translateX(4px);
}

/* User item variations */
.admin-item {
  background: rgba(255, 0, 0, 0.1);
  border-color: rgba(255, 0, 0, 0.3);
}

.admin-item:hover {
  background: rgba(255, 0, 0, 0.15);
}

.player-item {
  background: rgba(79, 195, 247, 0.1);
  border-color: rgba(79, 195, 247, 0.3);
}

.player-item:hover {
  background: rgba(79, 195, 247, 0.15);
}

.guest-item {
  background: rgba(170, 170, 170, 0.1);
  border-color: rgba(170, 170, 170, 0.3);
}

.guest-item:hover {
  background: rgba(170, 170, 170, 0.15);
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
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-top: 0.25rem;
  display: inline-block;
  font-weight: 500;
}

.user-type.type-admin {
  background: rgba(255, 0, 0, 0.2);
  color: #ff6666;
  border: 1px solid rgba(255, 0, 0, 0.4);
}

.user-type.type-player {
  background: rgba(79, 195, 247, 0.2);
  color: #4fc3f7;
  border: 1px solid rgba(79, 195, 247, 0.4);
}

.user-type.type-guest {
  background: rgba(170, 170, 170, 0.2);
  color: #aaa;
  border: 1px solid rgba(170, 170, 170, 0.4);
}

.user-stats {
  text-align: right;
  margin-right: 1rem;
}

.user-last-login {
  font-size: 0.85rem;
  color: #aaa;
}

.user-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.user-actions button {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.user-actions .btn-reset {
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
}

.user-actions .btn-reset:hover {
  background: rgba(255, 193, 7, 0.3);
  transform: scale(1.1);
}

.user-actions .btn-downgrade {
  background: rgba(156, 39, 176, 0.2);
  border: 1px solid rgba(156, 39, 176, 0.5);
}

.user-actions .btn-downgrade:hover {
  background: rgba(156, 39, 176, 0.3);
  transform: scale(1.1);
}

.user-actions .btn-delete {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
}

.user-actions .btn-delete:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: scale(1.1);
}

/* Banned Names Tab */
.banned-names-management section {
  max-width: auto;
}

.banned-names-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.banned-count {
  margin-left: auto;
  font-size: 0.9rem;
  color: #aaa;
}

.banned-names-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.banned-name-item {
  padding: 1rem;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.banned-pattern {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pattern-text {
  font-weight: 600;
  color: #fff;
  font-size: 1.05rem;
}

.pattern-type-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.pattern-type-badge.type-exact {
  background: rgba(33, 150, 243, 0.2);
  color: #42a5f5;
  border: 1px solid rgba(33, 150, 243, 0.4);
}

.pattern-type-badge.type-contains {
  background: rgba(156, 39, 176, 0.2);
  color: #ab47bc;
  border: 1px solid rgba(156, 39, 176, 0.4);
}

.banned-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.banned-by,
.banned-date {
  font-size: 0.85rem;
  color: #aaa;
}

.banned-actions .btn-delete {
  padding: 0.5rem 0.75rem;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.banned-actions .btn-delete:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: scale(1.1);
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

/* Question Breakdown */
.question-breakdown {
  margin-top: 2rem;
}

.question-breakdown h4 {
  margin: 1rem 0;
  color: #fff;
}

.question-detail {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.question-header {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #fff;
}

.question-choices {
  margin: 1rem 0;
  padding-left: 1rem;
}

.choice-item {
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.choice-item.choice-correct {
  background: rgba(0, 200, 0, 0.2);
  border-left: 3px solid #0f0;
}

.correct-indicator {
  margin-left: 0.5rem;
  color: #0f0;
  font-weight: bold;
}

.player-answers {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.player-answers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.player-answers-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.toggle-arrow {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
  color: #4fc3f7;
}

.toggle-arrow.expanded {
  transform: rotate(180deg);
}

.player-responses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.player-response {
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player-response.response-correct {
  background: rgba(0, 200, 0, 0.2);
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.player-response.response-incorrect {
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(255, 0, 0, 0.3);
}

.player-response.response-unanswered {
  background: rgba(100, 100, 100, 0.2);
  border: 1px solid rgba(150, 150, 150, 0.3);
}

.player-name {
  font-weight: 500;
  color: #fff;
}

.player-answer {
  font-weight: bold;
}

.answer-result {
  margin-left: 0.25rem;
  font-size: 1.2rem;
}

.response-correct .answer-result {
  color: #0f0;
}

.response-incorrect .answer-result {
  color: #f66;
}

.not-presented {
  color: #aaa;
  font-style: italic;
  padding: 0.5rem;
  text-align: center;
}

/* Ranking and Medal Styles */
.rank-cell {
  text-align: center;
  font-weight: bold;
}

.medal {
  font-size: 1.5rem;
  display: inline-block;
}

.medal.gold {
  filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.6));
}

.medal.silver {
  filter: drop-shadow(0 0 3px rgba(192, 192, 192, 0.6));
}

.medal.bronze {
  filter: drop-shadow(0 0 3px rgba(205, 127, 50, 0.6));
}

.rank-number {
  color: #aaa;
  font-size: 1rem;
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
