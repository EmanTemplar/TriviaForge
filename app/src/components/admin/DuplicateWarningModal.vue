<template>
  <div v-if="isVisible" class="modal-backdrop" @click.self="handleCancel">
    <div class="modal duplicate-warning-modal">
      <div class="modal-header">
        <h2>
          <AppIcon name="alert-triangle" size="lg" class="warning-icon" />
          {{ exactMatch ? 'Exact Duplicate Found' : 'Similar Question Found' }}
        </h2>
        <button class="close-btn" @click="handleCancel" title="Close">
          <AppIcon name="x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <!-- User's Question -->
        <div class="question-section">
          <label>Your question:</label>
          <div class="question-box user-question">
            "{{ questionText }}"
          </div>
        </div>

        <!-- Similar Question -->
        <div class="question-section">
          <label>
            {{ exactMatch ? 'Existing identical question:' : `Similar existing question (${Math.round(topMatch.similarity * 100)}% match):` }}
          </label>
          <div class="question-box existing-question">
            <div class="question-text">"{{ topMatch.question_text }}"</div>
            <div class="question-meta">
              <div v-if="topMatch.tags?.length" class="tags">
                <span
                  v-for="tag in topMatch.tags.slice(0, 3)"
                  :key="tag.id"
                  class="tag-badge"
                  :style="{ '--tag-color': tag.color }"
                >
                  {{ tag.name }}
                </span>
              </div>
              <span class="usage-info">
                <AppIcon name="layers" size="xs" />
                Used in {{ topMatch.usage_count }} quiz{{ topMatch.usage_count !== 1 ? 'zes' : '' }}
              </span>
            </div>
            <button class="view-details-btn" @click="viewDetails">
              <AppIcon name="eye" size="sm" />
              View Details
            </button>
          </div>
        </div>

        <!-- Additional Matches -->
        <div v-if="otherMatches.length > 0" class="other-matches">
          <button class="toggle-others" @click="showOthers = !showOthers">
            <AppIcon :name="showOthers ? 'chevron-up' : 'chevron-down'" size="sm" />
            {{ showOthers ? 'Hide' : 'Show' }} {{ otherMatches.length }} other similar question{{ otherMatches.length !== 1 ? 's' : '' }}
          </button>
          <div v-if="showOthers" class="others-list">
            <div
              v-for="match in otherMatches"
              :key="match.id"
              class="other-match"
              @click="selectMatch(match)"
            >
              <span class="match-text">"{{ truncate(match.question_text, 60) }}"</span>
              <span class="match-similarity">{{ Math.round(match.similarity * 100) }}%</span>
            </div>
          </div>
        </div>

        <!-- Action Selection -->
        <div class="action-selection">
          <label>What would you like to do?</label>
          <div class="action-options">
            <label class="action-option" :class="{ selected: selectedAction === 'use-existing' }">
              <input
                type="radio"
                v-model="selectedAction"
                value="use-existing"
              />
              <div class="option-content">
                <span class="option-title">Use existing question</span>
                <span class="option-desc">Link to the existing question instead of creating a new one</span>
                <span v-if="exactMatch" class="recommended-badge">Recommended</span>
              </div>
            </label>

            <label class="action-option" :class="{ selected: selectedAction === 'create-new' }">
              <input
                type="radio"
                v-model="selectedAction"
                value="create-new"
              />
              <div class="option-content">
                <span class="option-title">Create new question anyway</span>
                <span class="option-desc">Add as a separate question (creates duplicate)</span>
              </div>
            </label>

            <label class="action-option" :class="{ selected: selectedAction === 'update-existing' }">
              <input
                type="radio"
                v-model="selectedAction"
                value="update-existing"
              />
              <div class="option-content">
                <span class="option-title">Update existing question</span>
                <span class="option-desc">Replace the existing question text with your version</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="handleCancel">Cancel</button>
        <button
          class="btn-primary"
          :disabled="!selectedAction"
          @click="handleContinue"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  questionText: {
    type: String,
    required: true
  },
  exactMatch: {
    type: Object,
    default: null
  },
  similarQuestions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['cancel', 'continue', 'viewDetails'])

const selectedAction = ref('use-existing')
const showOthers = ref(false)
const selectedMatchId = ref(null)

// Get the top match (exact or highest similarity)
const topMatch = computed(() => {
  if (props.exactMatch) return props.exactMatch
  if (props.similarQuestions.length > 0) return props.similarQuestions[0]
  return null
})

// Get other matches beyond the top one
const otherMatches = computed(() => {
  if (props.exactMatch) return props.similarQuestions
  return props.similarQuestions.slice(1)
})

// Currently selected match for action
const currentMatch = computed(() => {
  if (selectedMatchId.value) {
    const allMatches = props.exactMatch
      ? [props.exactMatch, ...props.similarQuestions]
      : props.similarQuestions
    return allMatches.find(m => m.id === selectedMatchId.value) || topMatch.value
  }
  return topMatch.value
})

const truncate = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const selectMatch = (match) => {
  selectedMatchId.value = match.id
}

const viewDetails = () => {
  emit('viewDetails', currentMatch.value)
}

const handleCancel = () => {
  selectedAction.value = 'use-existing'
  showOthers.value = false
  selectedMatchId.value = null
  emit('cancel')
}

const handleContinue = () => {
  emit('continue', {
    action: selectedAction.value,
    existingQuestion: currentMatch.value
  })
  selectedAction.value = 'use-existing'
  showOthers.value = false
  selectedMatchId.value = null
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

.duplicate-warning-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
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
  font-size: 1.25rem;
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

.question-section {
  margin-bottom: 1.5rem;
}

.question-section label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.question-box {
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.user-question {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.existing-question {
  background: var(--primary-color-10);
  border: 1px solid var(--primary-color-30);
}

.question-text {
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.8125rem;
}

.tags {
  display: flex;
  gap: 0.25rem;
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

.usage-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
}

.view-details-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.75rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.view-details-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.other-matches {
  margin-bottom: 1.5rem;
}

.toggle-others {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.5rem 0;
}

.toggle-others:hover {
  color: var(--primary-color);
}

.others-list {
  margin-top: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.other-match {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
}

.other-match:last-child {
  border-bottom: none;
}

.other-match:hover {
  background: var(--bg-overlay-5);
}

.match-text {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.match-similarity {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.action-selection label:first-child {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-option:hover {
  border-color: var(--primary-color-50);
  background: var(--bg-overlay-5);
}

.action-option.selected {
  border-color: var(--primary-color);
  background: var(--primary-color-10);
}

.action-option input[type="radio"] {
  margin-top: 0.25rem;
  accent-color: var(--primary-color);
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-title {
  font-weight: 600;
  color: var(--text-primary);
}

.option-desc {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.recommended-badge {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--success-color);
  color: white;
  border-radius: 4px;
  width: fit-content;
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
</style>
