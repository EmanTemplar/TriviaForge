<template>
  <div class="admin-page">
    <!-- Navigation Bar -->
    <AdminNavbar
      :username="authStore.username"
      :menuOpen="menuOpen"
      @toggle-menu="toggleMenu"
      @logout="logout"
      @settings="openAccountSettings"
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
          v-model:questionType="questionType"
          v-model:imageUrl="imageUrl"
          v-model:imageType="imageType"
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
          @setChoicesForType="setChoicesForType"
          @uploadImage="handleImageUpload"
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
          :isRootAdmin="authStore.isRootAdmin"
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

      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="tab-content settings-management">
        <div class="settings-grid">
          <ThemeSettingsPanel />
        </div>
      </div>

      <!-- User Management Tab -->
      <div v-if="activeTab === 'users'" class="tab-content users-management">
        <UserManagementPanel
          ref="userManagementPanel"
          :adminUsers="adminUsers"
          :playerUsers="playerUsers"
          :guestUsers="guestUsers"
          :formatDate="formatDate"
          :isRootAdmin="authStore.isRootAdmin"
          @refresh="loadUsers"
          @deleteUser="deleteUser"
          @resetPassword="resetUserPassword"
          @resetPasswordAdmin="resetAdminPassword"
          @downgrade="downgradeUser"
          @createAdmin="createAdmin"
          @deleteAdmin="deleteAdmin"
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
        <FormInput v-model="dialogInputValue" type="text" />
      </div>
      <template #footer>
        <div class="dialog-buttons">
          <Button @click="handleDialogCancel" variant="secondary">Cancel</Button>
          <Button @click="handleDialogConfirm" variant="success">{{ dialogConfirmText }}</Button>
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
      <p class="modal-text-secondary">
        Are you sure you want to delete session <strong class="modal-text-primary">{{ sessionToDelete?.quizTitle }}</strong> ({{ sessionToDelete?.roomCode }})?
      </p>
      <p class="modal-text-danger">
        This action cannot be undone.
      </p>
      <template #footer>
        <Button variant="danger" @click="confirmDelete">Delete</Button>
        <Button variant="secondary" @click="showDeleteConfirmModal = false">Cancel</Button>
      </template>
    </Modal>

    <!-- Account Settings Modal -->
    <Modal :isOpen="showAccountSettingsModal" @close="showAccountSettingsModal = false" title="Account Settings" size="small">
      <div class="account-settings-content">
        <div class="settings-field">
          <label>Username</label>
          <div class="settings-value">{{ authStore.username }}</div>
        </div>
        <div class="settings-field">
          <label for="accountEmail">Email Address</label>
          <FormInput
            id="accountEmail"
            v-model="accountEmail"
            type="email"
            placeholder="Enter your email address"
          />
          <p class="settings-hint">Used for account recovery and notifications (future feature)</p>
        </div>

        <div class="settings-divider"></div>
        <h4 class="settings-section-title">Change Password</h4>

        <div class="settings-field">
          <label for="currentPassword">Current Password</label>
          <FormInput
            id="currentPassword"
            v-model="currentPassword"
            type="password"
            placeholder="Enter current password"
            :showPasswordToggle="true"
          />
        </div>
        <div class="settings-field">
          <label for="newPassword">New Password</label>
          <FormInput
            id="newPassword"
            v-model="newPassword"
            type="password"
            placeholder="Enter new password (min 8 characters)"
            :showPasswordToggle="true"
          />
        </div>
        <div class="settings-field">
          <label for="confirmPassword">Confirm New Password</label>
          <FormInput
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            :showPasswordToggle="true"
          />
        </div>
        <p class="settings-hint">Leave password fields empty to keep your current password.</p>

        <div v-if="accountSettingsError" class="settings-error">{{ accountSettingsError }}</div>
        <div v-if="accountSettingsSuccess" class="settings-success">{{ accountSettingsSuccess }}</div>
      </div>
      <template #footer>
        <Button variant="secondary" @click="showAccountSettingsModal = false">Cancel</Button>
        <Button variant="success" @click="saveAccountSettings" :disabled="isSavingAccountSettings">
          {{ isSavingAccountSettings ? 'Saving...' : 'Save Changes' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/common/Modal.vue'
import Button from '@/components/common/Button.vue'
import FormInput from '@/components/common/FormInput.vue'
import Card from '@/components/common/Card.vue'
import { useApi } from '@/composables/useApi.js'
import { useAuthStore } from '@/stores/auth.js'
import { useTheme } from '@/composables/useTheme.js'

// Admin Components
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import AdminTabNavigation from '@/components/admin/AdminTabNavigation.vue'
import QuizSidebar from '@/components/admin/QuizSidebar.vue'
import QuestionEditor from '@/components/admin/QuestionEditor.vue'
import QuestionsList from '@/components/admin/QuestionsList.vue'
import SessionsList from '@/components/admin/SessionsList.vue'
import QuizOptionsPanel from '@/components/admin/QuizOptionsPanel.vue'
import ThemeSettingsPanel from '@/components/admin/ThemeSettingsPanel.vue'
import UserManagementPanel from '@/components/admin/UserManagementPanel.vue'
import BannedNamesPanel from '@/components/admin/BannedNamesPanel.vue'
import AboutPanel from '@/components/admin/AboutPanel.vue'
import SessionDetailModal from '@/components/admin/SessionDetailModal.vue'

const router = useRouter()
const { get, post, put, delete: delete_, upload } = useApi()
const authStore = useAuthStore()

// Initialize theme for AdminPage (dark theme default)
const { initTheme } = useTheme('ADMIN')
initTheme()

// UI State
const menuOpen = ref(false)
const activeTab = ref('quiz')
const showDialog = ref(false)
const showSessionModal = ref(false)
const showDeleteConfirmModal = ref(false)
const sessionToDelete = ref(null)
const showAccountSettingsModal = ref(false)
const accountEmail = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const accountSettingsError = ref(null)
const accountSettingsSuccess = ref(null)
const isSavingAccountSettings = ref(false)

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
const questionType = ref('multiple_choice')
const imageUrl = ref(null)
const imageType = ref(null)
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
const userManagementPanel = ref(null)

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
  { id: 'settings', label: 'Settings' },
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
  questionType.value = question.type || 'multiple_choice'
  imageUrl.value = question.imageUrl || null
  imageType.value = question.imageType || null
  editingQuestionIdx.value = idx
  // Scroll to editor
  document.querySelector('.question-editor')?.scrollIntoView({ behavior: 'smooth' })
}

const clearQuestionForm = () => {
  questionText.value = ''
  choices.value = ['', '', '', '']
  correctChoice.value = 0
  questionType.value = 'multiple_choice'
  imageUrl.value = null
  imageType.value = null
  editingQuestionIdx.value = null
}

// Handle question type change - auto-set choices for True/False
const setChoicesForType = (type) => {
  if (type === 'true_false') {
    choices.value = ['True', 'False']
    correctChoice.value = 0
  } else if (type === 'multiple_choice' && choices.value.length === 2 &&
             choices.value[0] === 'True' && choices.value[1] === 'False') {
    // Switching from True/False to multiple choice - reset to 4 empty choices
    choices.value = ['', '', '', '']
    correctChoice.value = 0
  }
}

// Handle image upload
const handleImageUpload = async (file) => {
  if (!file) return

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Image must be less than 5MB', 'File Too Large')
    return
  }

  try {
    const formData = new FormData()
    formData.append('image', file)

    // Use the useApi upload function which handles CSRF tokens
    const response = await upload('/api/quizzes/upload-image', formData)
    imageUrl.value = response.data.imageUrl
    imageType.value = 'upload'
    showAlert('Image uploaded successfully')
  } catch (err) {
    console.error('Error uploading image:', err)
    showAlert('Failed to upload image: ' + (err.response?.data?.message || err.message), 'Upload Error')
  }
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
      correctChoice: parseInt(correctChoice.value),
      type: questionType.value,
      imageUrl: imageUrl.value,
      imageType: imageType.value
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

// Create new admin (root admin only)
const createAdmin = async (adminData) => {
  try {
    await post('/api/auth/create-admin', adminData)
    userManagementPanel.value?.onAdminCreated()
    await loadUsers() // Refresh the list
  } catch (err) {
    const message = err.response?.data?.message || 'Failed to create admin'
    userManagementPanel.value?.onAdminCreateError(message)
    console.error('Error creating admin:', err)
  }
}

// Delete admin account (root admin only)
const deleteAdmin = async (admin) => {
  const confirmed = await showConfirm(
    `Are you sure you want to delete admin "${admin.username}"?\n\nThis action cannot be undone and will remove all their sessions.`,
    'Delete Admin'
  )

  if (!confirmed) return

  try {
    await delete_(`/api/auth/admins/${admin.id}`)
    await showAlert(`Admin "${admin.username}" has been deleted successfully.`, 'Admin Deleted')
    await loadUsers() // Refresh the list
  } catch (err) {
    const message = err.response?.data?.message || 'Failed to delete admin'
    await showAlert(message, 'Error')
    console.error('Error deleting admin:', err)
  }
}

// Reset admin password (root admin only)
const resetAdminPassword = async (admin) => {
  const confirmed = await showConfirm(
    `Reset password for admin "${admin.username}"?\n\nThis will generate a new temporary password and log them out of all sessions.`,
    'Reset Admin Password'
  )

  if (!confirmed) return

  try {
    const response = await post(`/api/auth/admins/${admin.id}/reset-password`, {})
    const tempPassword = response.data?.data?.tempPassword
    await showAlert(
      `Password reset for "${admin.username}".\n\nTemporary Password:\n${tempPassword}\n\nPlease share this securely with the admin. They should change it after logging in.`,
      'Password Reset'
    )
    await loadUsers() // Refresh the list
  } catch (err) {
    const message = err.response?.data?.message || 'Failed to reset admin password'
    await showAlert(message, 'Error')
    console.error('Error resetting admin password:', err)
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
const logout = async () => {
  try {
    await post('/api/auth/logout', {})
  } catch (err) {
    console.error('Logout error:', err)
  }
  authStore.logout()
  router.push({name: 'login'})
}

// Account Settings
const openAccountSettings = async () => {
  accountSettingsError.value = null
  accountSettingsSuccess.value = null
  isSavingAccountSettings.value = false
  // Reset password fields
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  // Fetch current email from admin info
  try {
    const response = await get('/api/auth/admin-info')
    accountEmail.value = response.data?.user?.email || ''
  } catch (err) {
    accountEmail.value = ''
  }
  showAccountSettingsModal.value = true
}

const saveAccountSettings = async () => {
  accountSettingsError.value = null
  accountSettingsSuccess.value = null
  isSavingAccountSettings.value = true

  try {
    // Handle password change if fields are filled
    const wantsPasswordChange = currentPassword.value || newPassword.value || confirmPassword.value

    if (wantsPasswordChange) {
      // Validate password fields
      if (!currentPassword.value) {
        throw new Error('Current password is required to change password')
      }
      if (!newPassword.value) {
        throw new Error('New password is required')
      }
      if (newPassword.value.length < 8) {
        throw new Error('New password must be at least 8 characters')
      }
      if (newPassword.value !== confirmPassword.value) {
        throw new Error('New passwords do not match')
      }

      // Change password
      await put('/api/auth/change-password', {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      })
    }

    // Update email
    await put('/api/auth/update-email', { email: accountEmail.value || null })

    // Clear password fields after success
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''

    // Show success message
    if (wantsPasswordChange) {
      accountSettingsSuccess.value = 'Password and email updated successfully!'
    } else {
      showAccountSettingsModal.value = false
      await showAlert('Settings saved successfully.', 'Settings Saved')
    }

    // Refresh users list if on that tab
    if (activeTab.value === 'users') {
      await loadUsers()
    }
  } catch (err) {
    accountSettingsError.value = err.response?.data?.message || err.message || 'Failed to save settings'
  } finally {
    isSavingAccountSettings.value = false
  }
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
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Navbar base styles in shared/navbars.css */
.navbar {
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-accent) 100%); /* AdminPage-specific gradient */
}

.tabs-container {
  display: flex;
  gap: 0;
  background: var(--bg-tertiary-60);
  padding: 0 2rem;
  border-bottom: 1px solid var(--info-light);
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn.active-tab {
  color: var(--text-primary);
  border-bottom-color: var(--primary-color);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.container {
  flex: 1;
  overflow: hidden; /* Default: no scroll (for Quiz Management grid) */
  padding: 1rem;
}

/* Scrollable tabs: Sessions, Options, Users, Settings, About */
.sessions-management,
.options-management,
.users-management,
.settings-management,
.about-tab {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 140px); /* Account for navbar + tabs */
  padding-right: 0.5rem;
}

/* Scrollbar styles now in shared/scrollbars.css */

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
  border-right: 1px solid var(--border-color);
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
  border-right: 1px solid var(--border-color);
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
  background: var(--info-bg-50);
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
  background: var(--info-bg-30);
  border: 1px solid var(--info-light);
  border-radius: 6px;
  color: var(--info-light);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-new-question:hover {
  background: var(--info-bg-50);
  border-color: var(--info-light);
}

.question-editor-panel h3 {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.95rem;
}

/* Button styles now in Button component */

.excel-import-box {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--primary-bg-20);
  border-radius: 5px;
  border: 1px solid var(--primary-light);
}

.excel-import-box h3 {
  margin-top: 0;
  font-size: 1rem;
  color: var(--info-light);
}

.excel-import-box p {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin: 0.5rem 0;
}

.import-status {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.quiz-form {
  margin: 1rem 0;
}

/* Form input styles now in FormInput component */

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
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quiz-item:hover {
  background: var(--info-bg-30);
}

.quiz-name {
  font-weight: 600;
  color: var(--text-primary);
}

.quiz-count {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin: 0.25rem 0;
}

.question-editor {
  flex: 0 0 auto;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
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
  background: var(--info-bg-30);
  border-radius: 6px;
  font-weight: 600;
  color: var(--info-light);
  font-size: 0.95rem;
  border: 1px solid var(--info-light);
}

.choice-input-wrapper input {
  margin-bottom: 0;
  flex: 1;
}

.choice-input-wrapper.dragging {
  opacity: 0.4;
}

.choice-input-wrapper.drag-over {
  border: 2px dashed var(--warning-light);
  background: var(--warning-bg-20);
  border-radius: 4px;
}

.choice-label.draggable {
  cursor: grab;
  transition: all 0.2s;
}

.choice-label.draggable:hover {
  background: var(--info-bg-40);
  border-color: var(--info-light);
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
  color: var(--text-tertiary);
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
  background: var(--bg-secondary-60);
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
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  transition: all 0.2s;
}

.session-item:hover {
  background: var(--info-bg-30);
}

.session-content {
  flex: 1;
  cursor: pointer;
}

.btn-delete-inline {
  padding: 0.5rem 0.75rem;
  background: var(--danger-bg-30);
  border: 1px solid var(--danger-light);
  border-radius: 6px;
  color: var(--danger-light);
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-delete-inline:hover {
  background: var(--danger-bg-50);
  border-color: var(--danger-light);
  transform: scale(1.1);
}

.session-title {
  font-weight: 600;
  color: var(--text-primary);
}

.session-date {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin: 0.25rem 0;
}

.session-stats {
  font-size: 0.9rem;
  color: var(--info-light);
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
  background: var(--secondary-bg-30);
  color: var(--secondary-light);
  border: 1px solid var(--secondary-light);
}

.session-status.status-in_progress {
  background: var(--secondary-bg-30);
  color: var(--secondary-light);
  border: 1px solid var(--secondary-light);
}

.session-status.status-resumed {
  background: var(--warning-bg-30);
  color: var(--warning-light);
  border: 1px solid var(--warning-light);
}

.session-status.status-completed {
  background: var(--info-bg-30);
  color: var(--info-light);
  border: 1px solid var(--info-light);
}

/* Options Tab */
.options-management {
  max-width: 600px;
}

/* Settings Tab */
.settings-management {
  max-width: 1200px;
  margin: 0 auto;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 1rem;
}

@media (min-width: 1200px) {
  .settings-grid {
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  }
}

.section-description {
  color: var(--text-tertiary);
  margin-bottom: 2rem;
}

.options-box {
  background: var(--bg-tertiary-20);
  padding: 2rem;
  border-radius: 10px;
}

.option-description {
  color: var(--text-tertiary);
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
  background: var(--secondary-bg-30);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.options-save-msg.error {
  background: var(--danger-bg-30);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

/* Users Tab */
.users-header {
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-count {
  color: var(--text-tertiary);
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
  background: var(--bg-tertiary-30);
  border-radius: 12px;
}

.admin-header {
  background: var(--danger-bg-20);
  border-color: var(--danger-light);
  color: var(--danger-light);
}

.player-header {
  background: var(--info-bg-20);
  border-color: var(--info-light);
  color: var(--info-light);
}

.guest-header {
  background: var(--bg-tertiary-30);
  border-color: var(--border-color);
  color: var(--text-tertiary);
}

/* Scrollable user lists */
.users-list-scrollable {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-secondary-60);
  border-radius: 0 0 8px 8px;
  border: 1px solid var(--border-color);
  border-top: none;
}

/* Custom scrollbar for user lists */
.users-list-scrollable::-webkit-scrollbar {
  width: 8px;
}

.users-list-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-secondary-60);
  border-radius: 4px;
}

.users-list-scrollable::-webkit-scrollbar-thumb {
  background: var(--info-bg-70);
  border-radius: 4px;
}

.users-list-scrollable::-webkit-scrollbar-thumb:hover {
  background: var(--info-light);
}

.user-item {
  padding: 1rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.user-item:hover {
  background: var(--info-bg-20);
  transform: translateX(4px);
}

/* User item variations */
.admin-item {
  background: var(--danger-bg-20);
  border-color: var(--danger-light);
}

.admin-item:hover {
  background: var(--danger-bg-20);
}

.player-item {
  background: var(--info-bg-20);
  border-color: var(--info-light);
}

.player-item:hover {
  background: var(--info-bg-20);
}

.guest-item {
  background: var(--bg-tertiary-30);
  border-color: var(--border-color);
}

.guest-item:hover {
  background: var(--bg-tertiary-40);
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
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
  background: var(--danger-bg-30);
  color: var(--danger-light);
  border: 1px solid var(--danger-light);
}

.user-type.type-player {
  background: var(--info-bg-30);
  color: var(--info-light);
  border: 1px solid var(--info-light);
}

.user-type.type-guest {
  background: var(--bg-tertiary-40);
  color: var(--text-tertiary);
  border: 1px solid var(--border-color);
}

.user-stats {
  text-align: right;
  margin-right: 1rem;
}

.user-last-login {
  font-size: 0.85rem;
  color: var(--text-tertiary);
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
  background: var(--warning-bg-30);
  border: 1px solid var(--warning-light);
}

.user-actions .btn-reset:hover {
  background: var(--warning-bg-50);
  transform: scale(1.1);
}

.user-actions .btn-downgrade {
  background: var(--primary-bg-40);
  border: 1px solid var(--primary-light);
}

.user-actions .btn-downgrade:hover {
  background: var(--primary-bg-60);
  transform: scale(1.1);
}

.user-actions .btn-delete {
  background: var(--danger-bg-30);
  border: 1px solid var(--danger-light);
}

.user-actions .btn-delete:hover {
  background: var(--danger-bg-50);
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
  color: var(--text-tertiary);
}

.banned-names-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.banned-name-item {
  padding: 1rem;
  background: var(--warning-bg-20);
  border: 1px solid var(--warning-light);
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
  color: var(--text-primary);
  font-size: 1.05rem;
}

/* Badge styles now in shared/badges.css */

.banned-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.banned-by,
.banned-date {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.banned-actions .btn-delete {
  padding: 0.5rem 0.75rem;
  background: var(--danger-bg-30);
  border: 1px solid var(--danger-light);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.banned-actions .btn-delete:hover {
  background: var(--danger-bg-50);
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
  background: var(--primary-bg-40);
  border: 1px solid var(--primary-light);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.version-label {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.version-number {
  color: var(--info-light);
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
  background: var(--bg-tertiary-20);
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.about-card h3 {
  color: var(--info-light);
  margin-top: 0;
}

.about-card ul,
.about-card ol {
  color: var(--text-tertiary);
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
  color: var(--info-light);
  text-decoration: none;
}

.about-card a:hover {
  text-decoration: underline;
}

.system-info-box {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  padding: 1.5rem;
  border-radius: 10px;
  margin-bottom: 2rem;
}

.system-info-box h3 {
  margin-top: 0;
  color: var(--info-light);
}

.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  color: var(--text-tertiary);
}

.system-item {
  display: flex;
  flex-direction: column;
}

.system-label {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.system-value {
  color: var(--text-primary);
  font-weight: 600;
  margin-top: 0.3rem;
}

.about-text-box {
  background: var(--bg-tertiary-20);
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

.about-text-box h3 {
  margin-top: 0;
  color: var(--info-light);
}

.about-text-box p {
  color: var(--text-tertiary);
  line-height: 1.8;
  margin: 0 0 1rem 0;
}

.about-text-box p:last-child {
  margin-bottom: 0;
}

.license-box {
  padding: 1rem;
  background: var(--bg-tertiary-40);
  border-radius: 8px;
  border-left: 4px solid var(--secondary-light);
}

.license-box p {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin: 0;
}

.empty-state {
  text-align: center;
  color: var(--text-tertiary);
  padding: 2rem;
}

/* Modal inline style replacements */
.modal-text-secondary {
  color: var(--text-tertiary);
  margin-bottom: 1.5rem;
}

.modal-text-primary {
  color: var(--text-primary);
}

.modal-text-danger {
  color: var(--danger-light);
  margin-bottom: 1.5rem;
}

/* Account Settings */
.account-settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-field label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.settings-value {
  color: var(--text-primary);
  font-size: 1rem;
  padding: 0.5rem 0;
}

.settings-hint {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  margin: 0;
}

.settings-error {
  color: var(--danger-light);
  background: var(--danger-bg-10);
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.settings-success {
  color: var(--secondary-light);
  background: var(--secondary-bg-10);
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.settings-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

.settings-section-title {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

/* Dialog */
/* Dialog styles now in shared/modals.css and FormInput component */

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
  color: var(--text-tertiary);
}

.session-results h4 {
  margin: 1rem 0;
  color: var(--text-primary);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(15, 23, 42, 0.8); /* bg-secondary at 80% opacity */
  border-radius: 8px;
  overflow: hidden;
}

.results-table thead {
  background: rgba(15, 23, 42, 0.9); /* bg-secondary at 90% opacity */
}

.results-table th {
  text-align: left;
  padding: 1rem 0.5rem;
  color: var(--text-tertiary);
  font-weight: bold;
  border-bottom: 2px solid var(--border-color);
}

.results-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

/* Question Breakdown */
.question-breakdown {
  margin-top: 2rem;
}

.question-breakdown h4 {
  margin: 1rem 0;
  color: var(--text-primary);
}

.question-detail {
  background: rgba(15, 23, 42, 0.8); /* bg-secondary at 80% opacity */
  border: 1px solid var(--info-light);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.question-header {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.question-choices {
  margin: 1rem 0;
  padding-left: 1rem;
}

.choice-item {
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-radius: 4px;
  background: var(--bg-tertiary-20);
}

.choice-item.choice-correct {
  background: var(--secondary-bg-30);
  border-left: 3px solid var(--secondary-light);
}

.correct-indicator {
  margin-left: 0.5rem;
  color: var(--secondary-light);
  font-weight: bold;
}

.player-answers {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
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
  background: var(--bg-tertiary-20);
}

.toggle-arrow {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
  color: var(--info-light);
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
  background: var(--secondary-bg-30);
  border: 1px solid var(--secondary-light);
}

.player-response.response-incorrect {
  background: var(--danger-bg-30);
  border: 1px solid var(--danger-light);
}

.player-response.response-unanswered {
  background: var(--bg-tertiary-40);
  border: 1px solid var(--border-color);
}

.player-name {
  font-weight: 500;
  color: var(--text-primary);
}

.player-answer {
  font-weight: bold;
}

.answer-result {
  margin-left: 0.25rem;
  font-size: 1.2rem;
}

.response-correct .answer-result {
  color: var(--secondary-light);
}

.response-incorrect .answer-result {
  color: var(--danger-light);
}

.not-presented {
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
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
    border-top: 1px solid var(--border-color);
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
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-accent) 100%);
    border-bottom: 1px solid var(--info-light);
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
