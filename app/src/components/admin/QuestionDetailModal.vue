<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Question Details</h2>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon name="x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Question Text -->
        <div class="section">
          <h3>Question</h3>
          <p class="question-text">{{ question.question_text }}</p>
        </div>

        <!-- Image Preview -->
        <div v-if="question.image_url" class="section">
          <h3>Image</h3>
          <img :src="question.image_url" alt="Question image" class="question-image" />
        </div>

        <!-- Answers -->
        <div class="section">
          <h3>Answers</h3>
          <div class="answers-list">
            <div
              v-for="(answer, index) in question.answers"
              :key="answer.id"
              class="answer-item"
              :class="{ correct: answer.is_correct }"
            >
              <span class="answer-letter">{{ String.fromCharCode(65 + index) }}.</span>
              <span class="answer-text">{{ answer.answer_text }}</span>
              <AppIcon
                v-if="answer.is_correct"
                name="check"
                size="sm"
                class="correct-icon"
              />
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="section metadata">
          <div class="meta-row">
            <span class="meta-label">Type:</span>
            <span class="meta-value">{{ formatType(question.question_type) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Created:</span>
            <span class="meta-value">{{ formatDate(question.created_at) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Created By:</span>
            <span class="meta-value">{{ question.created_by_username || 'Unknown' }}</span>
          </div>
          <div v-if="question.is_archived" class="meta-row">
            <span class="archived-badge">
              <AppIcon name="archive" size="sm" />
              Archived
            </span>
          </div>
        </div>

        <!-- Tags -->
        <div class="section">
          <h3>Tags</h3>
          <TagSelector
            :modelValue="currentTagIds"
            :tags="tags"
            mode="chips"
            @add="handleTagAdd"
            @remove="handleTagRemove"
          />
        </div>

        <!-- Quiz Usage -->
        <div class="section">
          <h3>Used in Quizzes ({{ question.quizzes?.length || 0 }})</h3>
          <div v-if="question.quizzes?.length > 0" class="quizzes-list">
            <div v-for="quiz in question.quizzes" :key="quiz.id" class="quiz-item">
              <span class="quiz-title">{{ quiz.title }}</span>
              <span class="quiz-position">#{{ quiz.question_order }}</span>
            </div>
          </div>
          <p v-else class="no-quizzes">Not used in any quizzes</p>
        </div>

        <!-- Session Usage -->
        <div class="section">
          <div class="meta-row">
            <span class="meta-label">Presented in Sessions:</span>
            <span class="meta-value">{{ question.sessionCount || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-left">
          <button
            v-if="question.is_archived"
            class="btn-secondary"
            @click="$emit('restore', question.id)"
          >
            <AppIcon name="archive-restore" size="sm" />
            Restore
          </button>
          <button
            v-else
            class="btn-secondary"
            @click="$emit('archive', question.id)"
          >
            <AppIcon name="archive" size="sm" />
            Archive
          </button>
          <button class="btn-danger" @click="$emit('delete', question.id)">
            <AppIcon name="trash-2" size="sm" />
            Delete Permanently
          </button>
        </div>
        <div class="footer-right">
          <button class="btn-secondary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import TagSelector from './TagSelector.vue'

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  tags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'edit', 'updateTags', 'archive', 'restore', 'delete'])

// Computed
const currentTagIds = computed(() =>
  (props.question.tags || []).map(t => t.id)
)

// Methods
const handleTagAdd = (tagId) => {
  const newTagIds = [...currentTagIds.value, tagId]
  emit('updateTags', props.question.id, newTagIds)
}

const handleTagRemove = (tagId) => {
  const newTagIds = currentTagIds.value.filter(id => id !== tagId)
  emit('updateTags', props.question.id, newTagIds)
}

const formatType = (type) => {
  const types = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    short_answer: 'Short Answer'
  }
  return types[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--bg-overlay-10);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.section {
  margin-bottom: 1.5rem;
}

.section:last-child {
  margin-bottom: 0;
}

.section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem 0;
}

.question-text {
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.question-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: contain;
}

.answers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.answer-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.answer-item.correct {
  background: var(--success-color-10);
  border-color: var(--success-color);
}

.answer-letter {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 24px;
}

.answer-text {
  flex: 1;
}

.correct-icon {
  color: var(--success-color);
}

.metadata {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.meta-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.meta-row:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: var(--text-secondary);
  min-width: 120px;
}

.meta-value {
  font-weight: 500;
}

.archived-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--warning-color-10);
  color: var(--warning-color);
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.quizzes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.quiz-title {
  font-weight: 500;
}

.quiz-position {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.no-quizzes {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  gap: 0.5rem;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-overlay-10);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  background: var(--danger-hover);
}

@media (max-width: 768px) {
  .modal-content {
    max-height: 95vh;
  }

  .modal-footer {
    flex-direction: column;
  }

  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: stretch;
  }

  .footer-left button,
  .footer-right button {
    flex: 1;
  }
}
</style>
