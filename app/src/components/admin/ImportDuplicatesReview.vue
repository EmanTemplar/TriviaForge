<template>
  <div v-if="isVisible" class="modal-backdrop" @click.self="handleCancel">
    <div class="modal import-duplicates-modal">
      <div class="modal-header">
        <h2>
          <AppIcon name="alert-triangle" size="lg" class="warning-icon" />
          Review Import: {{ duplicateCount }} Potential Duplicate{{ duplicateCount !== 1 ? 's' : '' }} Found
        </h2>
        <button class="close-btn" @click="handleCancel" title="Close">
          <AppIcon name="x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <p class="description">
          The following questions from your import file are similar to existing questions.
          Choose how to handle each one.
        </p>

        <!-- Duplicates List -->
        <div class="duplicates-list">
          <div
            v-for="item in duplicateItems"
            :key="item.rowIndex"
            class="duplicate-item"
          >
            <div class="duplicate-header">
              <span class="row-badge">Row {{ item.rowIndex }}</span>
              <span class="question-preview">"{{ truncate(item.questionText, 60) }}"</span>
            </div>

            <div v-if="item.topMatch" class="similar-match">
              <div class="match-info">
                <span class="match-label">Similar to:</span>
                <span class="match-text">"{{ truncate(item.topMatch.question_text, 60) }}"</span>
                <span class="match-similarity">({{ Math.round(item.topMatch.similarity * 100) }}%)</span>
              </div>
              <div v-if="item.topMatch.tags?.length" class="match-tags">
                <span
                  v-for="tag in item.topMatch.tags.slice(0, 3)"
                  :key="tag.id"
                  class="tag-badge"
                  :style="{ '--tag-color': tag.color }"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>

            <div class="action-selector">
              <label class="action-label">Action:</label>
              <select v-model="decisions[item.rowIndex]" class="action-select">
                <option value="use-existing">Use Existing Question</option>
                <option value="create-new">Create New Anyway</option>
                <option value="skip">Skip This Question</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="bulk-actions" v-if="duplicateItems.length > 1">
          <span class="bulk-label">Apply to all:</span>
          <button class="btn-outline btn-sm" @click="applyToAll('use-existing')">
            <AppIcon name="check-circle" size="xs" />
            Use All Existing
          </button>
          <button class="btn-outline btn-sm" @click="applyToAll('create-new')">
            <AppIcon name="plus-circle" size="xs" />
            Create All New
          </button>
          <button class="btn-outline btn-sm" @click="applyToAll('skip')">
            <AppIcon name="x-circle" size="xs" />
            Skip All
          </button>
        </div>

        <!-- Summary -->
        <div class="summary">
          <div class="summary-item">
            <AppIcon name="check-circle" size="sm" class="icon-success" />
            <span>{{ summaryStats.useExisting }} will use existing</span>
          </div>
          <div class="summary-item">
            <AppIcon name="plus-circle" size="sm" class="icon-info" />
            <span>{{ summaryStats.createNew }} will be created new</span>
          </div>
          <div class="summary-item">
            <AppIcon name="x-circle" size="sm" class="icon-warning" />
            <span>{{ summaryStats.skip }} will be skipped</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="handleCancel">
          Cancel Import
        </button>
        <button class="btn-primary" @click="handleContinue" :disabled="loading">
          <AppIcon v-if="loading" name="loader-2" size="sm" class="spinning" />
          {{ loading ? 'Importing...' : 'Continue Import' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  duplicateResults: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'continue'])

// Decisions map: rowIndex -> 'use-existing' | 'create-new' | 'skip'
const decisions = reactive({})

// Filter to only show items that have duplicates and add topMatch
const duplicateItems = computed(() =>
  props.duplicateResults
    .filter(r => r.hasDuplicates && r.similarQuestions?.length > 0)
    .map(item => ({
      ...item,
      topMatch: item.similarQuestions?.[0] || null
    }))
)

const duplicateCount = computed(() => duplicateItems.value.length)

// Initialize decisions when results change
watch(() => props.duplicateResults, () => {
  duplicateItems.value.forEach(item => {
    if (decisions[item.rowIndex] === undefined) {
      decisions[item.rowIndex] = 'use-existing' // Default to use existing
    }
  })
}, { immediate: true })

// Summary statistics
const summaryStats = computed(() => {
  const stats = { useExisting: 0, createNew: 0, skip: 0 }
  duplicateItems.value.forEach(item => {
    const decision = decisions[item.rowIndex] || 'use-existing'
    if (decision === 'use-existing') stats.useExisting++
    else if (decision === 'create-new') stats.createNew++
    else if (decision === 'skip') stats.skip++
  })
  return stats
})

const truncate = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const applyToAll = (action) => {
  duplicateItems.value.forEach(item => {
    decisions[item.rowIndex] = action
  })
}

const handleCancel = () => {
  emit('cancel')
}

const handleContinue = () => {
  // Build decisions map for the parent
  const decisionsMap = {}
  duplicateItems.value.forEach(item => {
    decisionsMap[item.rowIndex] = {
      action: decisions[item.rowIndex] || 'use-existing',
      existingQuestionId: item.similarQuestions?.[0]?.id || null
    }
  })
  emit('continue', decisionsMap)
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

.import-duplicates-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
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
  background: var(--warning-color-10);
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.125rem;
  color: var(--warning-color);
}

.warning-icon {
  color: var(--warning-color);
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

.description {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.duplicates-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.duplicate-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.duplicate-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.row-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--primary-color-10);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.question-preview {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.similar-match {
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.match-info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.match-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.match-text {
  color: var(--text-primary);
}

.match-similarity {
  color: var(--warning-color);
  font-weight: 600;
  font-size: 0.8125rem;
}

.match-tags {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.tag-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  color: var(--tag-color, var(--primary-color));
}

.action-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.action-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.action-select {
  flex: 1;
  max-width: 250px;
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
}

.action-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.bulk-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-outline:hover {
  background: var(--bg-overlay-10);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-sm {
  padding: 0.375rem 0.625rem;
}

.summary {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.icon-success {
  color: var(--success-color);
}

.icon-info {
  color: var(--info-color);
}

.icon-warning {
  color: var(--warning-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.btn-secondary,
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover {
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .import-duplicates-modal {
    width: 95%;
    max-height: 95vh;
  }

  .modal-header h2 {
    font-size: 1rem;
  }

  .duplicate-header {
    flex-direction: column;
  }

  .bulk-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .summary {
    flex-direction: column;
    gap: 0.5rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn-secondary,
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
