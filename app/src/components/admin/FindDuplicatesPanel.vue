<template>
  <div v-if="isVisible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal find-duplicates-modal">
      <div class="modal-header">
        <h2>
          <AppIcon name="copy" size="lg" />
          Find Duplicate Questions
        </h2>
        <button class="close-btn" @click="handleClose" title="Close">
          <AppIcon name="x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Controls -->
        <div class="controls-bar">
          <div class="threshold-control">
            <label>Similarity threshold:</label>
            <select v-model="threshold" @change="scanDuplicates">
              <option value="0.7">70%</option>
              <option value="0.8">80% (Default)</option>
              <option value="0.9">90%</option>
              <option value="0.95">95%</option>
            </select>
          </div>
          <button class="btn-secondary" @click="scanDuplicates" :disabled="loading">
            <AppIcon :name="loading ? 'loader-2' : 'refresh-cw'" size="sm" :class="{ spinning: loading }" />
            Rescan
          </button>
        </div>

        <!-- Summary -->
        <div class="summary-bar" v-if="!loading && groups.length > 0">
          <span class="summary-text">
            Found <strong>{{ totalGroups }}</strong> duplicate group{{ totalGroups !== 1 ? 's' : '' }}
            across <strong>{{ totalQuestions }}</strong> questions
          </span>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>Scanning for duplicates...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="groups.length === 0 && !error" class="empty-state">
          <AppIcon name="check-circle" size="2xl" class="success-icon" />
          <h3>No Duplicates Found</h3>
          <p>Your question bank is clean! No similar questions were detected at the {{ Math.round(threshold * 100) }}% threshold.</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <AppIcon name="alert-circle" size="2xl" class="error-icon" />
          <h3>Error</h3>
          <p>{{ error }}</p>
          <button class="btn-secondary" @click="scanDuplicates">Try Again</button>
        </div>

        <!-- Duplicate Groups -->
        <div v-else class="groups-container">
          <div
            v-for="(group, groupIndex) in groups"
            :key="groupIndex"
            class="duplicate-group"
          >
            <div class="group-header">
              <span class="group-title">Group {{ groupIndex + 1 }}</span>
              <span class="group-similarity">{{ Math.round(group.similarity * 100) }}% similar</span>
            </div>

            <div class="group-questions">
              <div
                v-for="question in group.questions"
                :key="question.id"
                class="question-item"
                :class="{ selected: isSelected(groupIndex, question.id) }"
              >
                <input
                  type="radio"
                  :name="`group-${groupIndex}`"
                  :checked="getSelectedId(groupIndex) === question.id"
                  @change="selectQuestion(groupIndex, question.id)"
                />
                <div class="question-content">
                  <div class="question-text">"{{ truncate(question.question_text, 100) }}"</div>
                  <div class="question-meta">
                    <span v-if="question.tags?.length" class="tags">
                      <span
                        v-for="tag in question.tags.slice(0, 2)"
                        :key="tag.id"
                        class="tag-badge"
                        :style="{ '--tag-color': tag.color }"
                      >
                        {{ tag.name }}
                      </span>
                    </span>
                    <span class="usage-count" :class="{ unused: question.usage_count === 0 }">
                      <AppIcon name="layers" size="xs" />
                      {{ question.usage_count }} quiz{{ question.usage_count !== 1 ? 'zes' : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="group-actions">
              <button
                class="btn-primary btn-sm"
                :disabled="!canMerge(groupIndex) || merging[groupIndex]"
                @click="handleMerge(groupIndex)"
              >
                <AppIcon :name="merging[groupIndex] ? 'loader-2' : 'git-merge'" size="sm" :class="{ spinning: merging[groupIndex] }" />
                Merge (Keep Selected)
              </button>
              <button class="btn-secondary btn-sm" @click="dismissGroup(groupIndex)">
                <AppIcon name="eye-off" size="sm" />
                Keep Both
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <span class="footer-note" v-if="groups.length > 0">
          Select the question to keep in each group, then click "Merge" to combine duplicates.
        </span>
        <button class="btn-secondary" @click="handleClose">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'merged'])

const threshold = ref('0.8')
const loading = ref(false)
const error = ref(null)
const groups = ref([])
const totalGroups = ref(0)
const totalQuestions = ref(0)
const selectedQuestions = reactive({}) // groupIndex -> questionId
const merging = reactive({}) // groupIndex -> boolean
const dismissedGroups = ref(new Set())

// Scan for duplicates when modal opens
watch(() => props.isVisible, (visible) => {
  if (visible) {
    scanDuplicates()
  }
})

const scanDuplicates = async () => {
  loading.value = true
  error.value = null
  dismissedGroups.value = new Set()

  try {
    const response = await fetch(`/api/questions/find-duplicates?threshold=${threshold.value}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to scan for duplicates')
    }

    const data = await response.json()
    groups.value = data.groups || []
    totalGroups.value = data.totalGroups || 0
    totalQuestions.value = data.totalQuestions || 0

    // Pre-select the question with highest usage in each group
    groups.value.forEach((group, index) => {
      const sorted = [...group.questions].sort((a, b) => b.usage_count - a.usage_count)
      if (sorted.length > 0) {
        selectedQuestions[index] = sorted[0].id
      }
    })
  } catch (err) {
    console.error('Error scanning duplicates:', err)
    error.value = err.message || 'An error occurred while scanning'
  } finally {
    loading.value = false
  }
}

const truncate = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const isSelected = (groupIndex, questionId) => {
  return selectedQuestions[groupIndex] === questionId
}

const getSelectedId = (groupIndex) => {
  return selectedQuestions[groupIndex]
}

const selectQuestion = (groupIndex, questionId) => {
  selectedQuestions[groupIndex] = questionId
}

const canMerge = (groupIndex) => {
  return selectedQuestions[groupIndex] && groups.value[groupIndex]?.questions.length > 1
}

const handleMerge = async (groupIndex) => {
  const keepId = selectedQuestions[groupIndex]
  const group = groups.value[groupIndex]

  if (!keepId || !group) return

  const mergeIds = group.questions
    .filter(q => q.id !== keepId)
    .map(q => q.id)

  if (mergeIds.length === 0) return

  merging[groupIndex] = true

  try {
    const response = await fetch('/api/questions/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ keepId, mergeIds })
    })

    if (!response.ok) {
      throw new Error('Failed to merge questions')
    }

    // Remove the merged group from the list
    groups.value.splice(groupIndex, 1)
    totalGroups.value--

    // Re-index selected questions
    const newSelected = {}
    Object.keys(selectedQuestions).forEach(key => {
      const idx = parseInt(key, 10)
      if (idx < groupIndex) {
        newSelected[idx] = selectedQuestions[idx]
      } else if (idx > groupIndex) {
        newSelected[idx - 1] = selectedQuestions[idx]
      }
    })
    Object.keys(selectedQuestions).forEach(key => delete selectedQuestions[key])
    Object.assign(selectedQuestions, newSelected)

    emit('merged')
  } catch (err) {
    console.error('Error merging questions:', err)
    error.value = err.message || 'Failed to merge questions'
  } finally {
    merging[groupIndex] = false
  }
}

const dismissGroup = (groupIndex) => {
  groups.value.splice(groupIndex, 1)
  totalGroups.value--
}

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.find-duplicates-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-overlay-10);
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.threshold-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.threshold-control label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.threshold-control select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.summary-bar {
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.summary-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.summary-text strong {
  color: var(--text-primary);
}

.loading-state,
.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

.empty-state h3,
.error-state h3 {
  margin: 1rem 0 0.5rem;
  color: var(--text-primary);
}

.success-icon {
  color: var(--success-color);
}

.error-icon {
  color: var(--error-color);
}

.groups-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.duplicate-group {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.group-title {
  font-weight: 600;
  color: var(--text-primary);
}

.group-similarity {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--warning-color);
  background: var(--warning-color-10);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.group-questions {
  padding: 0.5rem;
}

.question-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.question-item:hover {
  background: var(--bg-overlay-5);
}

.question-item.selected {
  background: var(--primary-color-10);
}

.question-item input[type="radio"] {
  margin-top: 0.25rem;
  accent-color: var(--primary-color);
}

.question-content {
  flex: 1;
  min-width: 0;
}

.question-text {
  color: var(--text-primary);
  font-size: 0.9375rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.tags {
  display: flex;
  gap: 0.25rem;
}

.tag-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  color: var(--tag-color, var(--primary-color));
}

.usage-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.usage-count.unused {
  color: var(--text-muted);
}

.group-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-secondary,
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.btn-primary {
  background: var(--primary-color);
  border: 1px solid var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-dark, color-mix(in srgb, var(--primary-color) 85%, black));
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.footer-note {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  flex: 1;
}

@media (max-width: 640px) {
  .controls-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .footer-note {
    text-align: center;
  }
}
</style>
