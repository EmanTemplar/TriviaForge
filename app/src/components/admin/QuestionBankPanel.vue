<template>
  <div class="question-bank-panel">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <label class="select-all-label">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="someSelected && !allSelected"
            @change="toggleSelectAll"
          />
          <span>{{ selectedCount > 0 ? `${selectedCount} selected` : 'Select All' }}</span>
        </label>
        <button
          class="btn-secondary"
          :disabled="selectedCount === 0"
          @click="showBulkTagModal = true"
        >
          <AppIcon name="tags" size="sm" />
          Tag Selected
        </button>
        <button
          class="btn-primary"
          :disabled="selectedCount === 0"
          @click="showQuizFromSelectionModal = true"
        >
          <AppIcon name="file-plus" size="sm" />
          Create Quiz
        </button>
        <button
          class="btn-secondary"
          :disabled="selectedCount === 0"
          @click="bulkArchiveSelected"
        >
          <AppIcon name="archive" size="sm" />
          Archive
        </button>
        <button
          class="btn-danger"
          :disabled="selectedCount === 0"
          @click="confirmBulkDelete"
        >
          <AppIcon name="trash-2" size="sm" />
          Delete
        </button>
      </div>
      <div class="toolbar-right">
        <button class="btn-secondary" @click="showTagManagerModal = true">
          <AppIcon name="settings" size="sm" />
          Manage Tags
        </button>
      </div>
    </div>

    <!-- Filters -->
    <QuestionBankFilters
      :filters="filters"
      :tags="allTags"
      @apply="applyFilters"
      @clear="clearFilters"
    />

    <!-- Results Summary -->
    <div class="results-summary">
      <span class="results-count">
        {{ pagination.total }} question{{ pagination.total !== 1 ? 's' : '' }}
        <span v-if="filters.archived === 'true'" class="archived-indicator">
          (including archived)
        </span>
      </span>
      <div class="pagination-info" v-if="pagination.totalPages > 1">
        Page {{ pagination.page }} of {{ pagination.totalPages }}
      </div>
    </div>

    <!-- Questions Table -->
    <QuestionBankTable
      :questions="questions"
      :selectedIds="selectedIds"
      :loading="loading"
      :sortBy="filters.sortBy"
      :sortOrder="filters.sortOrder"
      @select="toggleSelect"
      @selectAll="toggleSelectAll"
      @selectRange="selectRange"
      @sort="handleSort"
      @viewDetails="viewQuestionDetails"
    />

    <!-- Pagination -->
    <div class="pagination" v-if="pagination.totalPages > 1">
      <button
        class="btn-secondary btn-sm"
        :disabled="!pagination.hasPrev"
        @click="goToPage(pagination.page - 1)"
      >
        <AppIcon name="chevron-left" size="sm" />
        Previous
      </button>
      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="page-btn"
          :class="{ active: page === pagination.page }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </div>
      <button
        class="btn-secondary btn-sm"
        :disabled="!pagination.hasNext"
        @click="goToPage(pagination.page + 1)"
      >
        Next
        <AppIcon name="chevron-right" size="sm" />
      </button>
    </div>

    <!-- Question Detail Modal -->
    <QuestionDetailModal
      v-if="showDetailModal"
      :question="selectedQuestion"
      :tags="allTags"
      @close="showDetailModal = false"
      @edit="editQuestion"
      @updateTags="updateQuestionTags"
      @archive="archiveQuestion"
      @delete="deleteQuestion"
    />

    <!-- Tag Manager Modal -->
    <TagManager
      v-if="showTagManagerModal"
      :tags="allTags"
      @close="showTagManagerModal = false"
      @created="handleTagCreated"
      @updated="handleTagUpdated"
      @deleted="handleTagDeleted"
    />

    <!-- Quiz From Selection Modal -->
    <QuizFromSelectionModal
      v-if="showQuizFromSelectionModal"
      :selectedQuestions="selectedQuestions"
      @close="showQuizFromSelectionModal = false"
      @created="handleQuizCreated"
    />

    <!-- Bulk Tag Modal -->
    <BulkTagModal
      v-if="showBulkTagModal"
      :selectedCount="selectedCount"
      :tags="allTags"
      @close="showBulkTagModal = false"
      @apply="applyBulkTags"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmDeleteModal
      v-if="showDeleteConfirmModal"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      :usage="deleteUsage"
      @confirm="executeDelete"
      @cancel="showDeleteConfirmModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/common/AppIcon.vue'
import QuestionBankFilters from './QuestionBankFilters.vue'
import QuestionBankTable from './QuestionBankTable.vue'
import QuestionDetailModal from './QuestionDetailModal.vue'
import TagManager from './TagManager.vue'
import QuizFromSelectionModal from './QuizFromSelectionModal.vue'
import BulkTagModal from './BulkTagModal.vue'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

const props = defineProps({
  authStore: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['createQuizFromSelection'])

const { get, post, put, delete: delete_ } = useApi()

// State
const loading = ref(false)
const questions = ref([])
const allTags = ref([])
const selectedIds = ref(new Set())
const pagination = ref({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
})

// Filters
const filters = ref({
  search: '',
  type: '',
  tags: '',
  hasImage: '',
  archived: 'false',
  sortBy: 'created_at',
  sortOrder: 'desc',
  createdBy: ''
})

// Modals
const showDetailModal = ref(false)
const showTagManagerModal = ref(false)
const showQuizFromSelectionModal = ref(false)
const showBulkTagModal = ref(false)
const showDeleteConfirmModal = ref(false)
const selectedQuestion = ref(null)
const deleteConfirmTitle = ref('')
const deleteConfirmMessage = ref('')
const deleteUsage = ref(null)
const pendingDeleteAction = ref(null)

// Computed
const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() =>
  questions.value.length > 0 && selectedIds.value.size === questions.value.length
)
const someSelected = computed(() =>
  selectedIds.value.size > 0 && selectedIds.value.size < questions.value.length
)
const selectedQuestions = computed(() =>
  questions.value.filter(q => selectedIds.value.has(q.id))
)

const visiblePages = computed(() => {
  const total = pagination.value.totalPages
  const current = pagination.value.page
  const pages = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
  }

  return pages.filter(p => p !== '...' || pages.indexOf(p) === pages.lastIndexOf(p))
})

// API Methods
const loadQuestions = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...Object.fromEntries(
        Object.entries(filters.value).filter(([_, v]) => v !== '')
      )
    })

    const response = await get(`/api/questions/bank?${params}`)
    questions.value = response.data.questions
    pagination.value = response.data.pagination

    // Clear selections that are no longer in the current page
    const currentIds = new Set(questions.value.map(q => q.id))
    selectedIds.value = new Set(
      [...selectedIds.value].filter(id => currentIds.has(id))
    )
  } catch (err) {
    console.error('Error loading questions:', err)
  } finally {
    loading.value = false
  }
}

const loadTags = async () => {
  try {
    const response = await get('/api/tags')
    allTags.value = response.data.tags
  } catch (err) {
    console.error('Error loading tags:', err)
  }
}

const viewQuestionDetails = async (question) => {
  try {
    const response = await get(`/api/questions/${question.id}/details`)
    selectedQuestion.value = response.data
    showDetailModal.value = true
  } catch (err) {
    console.error('Error loading question details:', err)
  }
}

// Selection Methods
const toggleSelect = (questionId) => {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(questionId)) {
    newSet.delete(questionId)
  } else {
    newSet.add(questionId)
  }
  selectedIds.value = newSet
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(questions.value.map(q => q.id))
  }
}

const selectRange = (rangeIds) => {
  const newSet = new Set(selectedIds.value)
  rangeIds.forEach(id => newSet.add(id))
  selectedIds.value = newSet
}

// Filter Methods
const applyFilters = (newFilters) => {
  filters.value = { ...filters.value, ...newFilters }
  pagination.value.page = 1
  loadQuestions()
}

const clearFilters = () => {
  filters.value = {
    search: '',
    type: '',
    tags: '',
    hasImage: '',
    archived: 'false',
    sortBy: 'created_at',
    sortOrder: 'desc',
    createdBy: ''
  }
  pagination.value.page = 1
  loadQuestions()
}

const handleSort = (field) => {
  if (filters.value.sortBy === field) {
    filters.value.sortOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc'
  } else {
    filters.value.sortBy = field
    filters.value.sortOrder = 'desc'
  }
  loadQuestions()
}

// Pagination Methods
const goToPage = (page) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    loadQuestions()
  }
}

// Tag Operations
const updateQuestionTags = async (questionId, tagIds) => {
  try {
    await put(`/api/questions/${questionId}/tags`, { tagIds })
    await loadQuestions()
    if (selectedQuestion.value?.id === questionId) {
      await viewQuestionDetails({ id: questionId })
    }
  } catch (err) {
    console.error('Error updating tags:', err)
  }
}

const applyBulkTags = async ({ tagIds, mode }) => {
  try {
    await post('/api/questions/bulk-tag', {
      questionIds: [...selectedIds.value],
      tagIds,
      mode
    })
    showBulkTagModal.value = false
    await loadQuestions()
  } catch (err) {
    console.error('Error applying bulk tags:', err)
  }
}

// Archive/Delete Operations
const archiveQuestion = async (questionId) => {
  try {
    await put(`/api/questions/${questionId}/archive`)
    showDetailModal.value = false
    await loadQuestions()
  } catch (err) {
    console.error('Error archiving question:', err)
  }
}

const bulkArchiveSelected = async () => {
  try {
    await post('/api/questions/bulk-archive', {
      questionIds: [...selectedIds.value]
    })
    selectedIds.value = new Set()
    await loadQuestions()
  } catch (err) {
    console.error('Error bulk archiving:', err)
  }
}

const deleteQuestion = async (questionId, confirm = false) => {
  try {
    const response = await delete_(`/api/questions/${questionId}?confirm=${confirm}`)

    if (response.data.requiresConfirmation) {
      deleteConfirmTitle.value = 'Delete Question'
      deleteConfirmMessage.value = 'This question is in use. Deleting it will affect existing data.'
      deleteUsage.value = response.data.usage
      pendingDeleteAction.value = () => deleteQuestion(questionId, true)
      showDeleteConfirmModal.value = true
      return
    }

    showDetailModal.value = false
    showDeleteConfirmModal.value = false
    await loadQuestions()
  } catch (err) {
    console.error('Error deleting question:', err)
  }
}

const confirmBulkDelete = async () => {
  try {
    const response = await post('/api/questions/bulk-delete', {
      questionIds: [...selectedIds.value],
      confirm: false
    })

    if (response.data.requiresConfirmation) {
      deleteConfirmTitle.value = `Delete ${selectedIds.value.size} Questions`
      deleteConfirmMessage.value = 'Some questions are in use. Deleting them will affect existing data.'
      deleteUsage.value = response.data.usage
      pendingDeleteAction.value = executeBulkDelete
      showDeleteConfirmModal.value = true
      return
    }

    selectedIds.value = new Set()
    await loadQuestions()
  } catch (err) {
    console.error('Error bulk deleting:', err)
  }
}

const executeBulkDelete = async () => {
  try {
    await post('/api/questions/bulk-delete', {
      questionIds: [...selectedIds.value],
      confirm: true
    })
    showDeleteConfirmModal.value = false
    selectedIds.value = new Set()
    await loadQuestions()
  } catch (err) {
    console.error('Error bulk deleting:', err)
  }
}

const executeDelete = () => {
  if (pendingDeleteAction.value) {
    pendingDeleteAction.value()
  }
}

// Question Edit
const editQuestion = async (questionId, updates) => {
  try {
    await put(`/api/questions/${questionId}`, updates)
    await loadQuestions()
    if (selectedQuestion.value?.id === questionId) {
      await viewQuestionDetails({ id: questionId })
    }
  } catch (err) {
    console.error('Error updating question:', err)
  }
}

// Quiz Creation
const handleQuizCreated = (quiz) => {
  showQuizFromSelectionModal.value = false
  selectedIds.value = new Set()
  emit('createQuizFromSelection', quiz)
}

// Tag Manager Events
const handleTagCreated = async () => {
  await loadTags()
}

const handleTagUpdated = async () => {
  await loadTags()
  await loadQuestions()
}

const handleTagDeleted = async () => {
  await loadTags()
  await loadQuestions()
}

// Lifecycle
onMounted(() => {
  loadQuestions()
  loadTags()
})
</script>

<style scoped>
.question-bank-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.select-all-label:hover {
  background: var(--bg-overlay-10);
}

.select-all-label input {
  cursor: pointer;
}

.results-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.results-count {
  font-weight: 500;
}

.archived-indicator {
  color: var(--warning-color);
  font-style: italic;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(.active) {
  background: var(--bg-secondary);
}

.page-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-overlay-10);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger-hover);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: flex-start;
  }

  .pagination {
    flex-wrap: wrap;
  }
}
</style>
