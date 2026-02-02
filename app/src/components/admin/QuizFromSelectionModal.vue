<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Quiz from Selected Questions</h2>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon icon="lucide:x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Quiz Title *</label>
          <input
            v-model="title"
            type="text"
            placeholder="Enter quiz title..."
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea
            v-model="description"
            placeholder="Enter quiz description (optional)..."
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">
            Selected Questions ({{ questions.length }})
            <span class="drag-hint">Drag to reorder</span>
          </label>
          <div class="questions-list">
            <div
              v-for="(question, index) in questions"
              :key="question.id"
              class="question-item"
              :class="{ 'dragging': draggedIndex === index, 'drag-over': dragOverIndex === index }"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver($event, index)"
              @dragleave="handleDragLeave"
              @drop="handleDrop($event, index)"
            >
              <span class="drag-handle">
                <AppIcon icon="lucide:grip-vertical" size="sm" />
              </span>
              <span class="question-number">{{ index + 1 }}.</span>
              <span class="question-text">{{ truncate(question.question_text, 60) }}</span>
              <div class="question-actions">
                <button
                  class="btn-icon"
                  :disabled="index === 0"
                  @click="moveUp(index)"
                  title="Move up"
                >
                  <AppIcon icon="lucide:chevron-up" size="sm" />
                </button>
                <button
                  class="btn-icon"
                  :disabled="index === questions.length - 1"
                  @click="moveDown(index)"
                  title="Move down"
                >
                  <AppIcon icon="lucide:chevron-down" size="sm" />
                </button>
                <button class="btn-icon btn-remove" @click="removeQuestion(index)" title="Remove">
                  <AppIcon icon="lucide:x" size="sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button
          class="btn-primary"
          :disabled="!canCreate || creating"
          @click="createQuiz"
        >
          <AppIcon v-if="creating" icon="lucide:loader-2" size="sm" class="spinning" />
          {{ creating ? 'Creating...' : 'Create Quiz' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  selectedQuestions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'created'])

const { post } = useApi()

// State
const title = ref('')
const description = ref('')
const questions = ref([...props.selectedQuestions])
const creating = ref(false)
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// Computed
const canCreate = computed(() =>
  title.value.trim() && questions.value.length > 0
)

// Methods
const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const moveUp = (index) => {
  if (index > 0) {
    const item = questions.value.splice(index, 1)[0]
    questions.value.splice(index - 1, 0, item)
  }
}

const moveDown = (index) => {
  if (index < questions.value.length - 1) {
    const item = questions.value.splice(index, 1)[0]
    questions.value.splice(index + 1, 0, item)
  }
}

const removeQuestion = (index) => {
  questions.value.splice(index, 1)
}

// Drag and drop handlers
const handleDragStart = (event, index) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index)
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragOver = (event, index) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

const handleDragLeave = () => {
  dragOverIndex.value = null
}

const handleDrop = (event, dropIndex) => {
  event.preventDefault()
  const dragIndex = draggedIndex.value

  if (dragIndex === null || dragIndex === dropIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }

  // Reorder the array
  const item = questions.value.splice(dragIndex, 1)[0]
  questions.value.splice(dropIndex, 0, item)

  draggedIndex.value = null
  dragOverIndex.value = null
}

const createQuiz = async () => {
  if (!canCreate.value) return

  creating.value = true
  try {
    const response = await post('/api/quizzes/from-selection', {
      title: title.value.trim(),
      description: description.value.trim() || null,
      questionIds: questions.value.map(q => q.id)
    })
    emit('created', response.data.quiz)
  } catch (err) {
    console.error('Error creating quiz:', err)
  } finally {
    creating.value = false
  }
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
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.drag-hint {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
  font-style: italic;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.question-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: grab;
  transition: all 0.15s ease;
  border: 2px solid transparent;
}

.question-item:active {
  cursor: grabbing;
}

.question-item.dragging {
  opacity: 0.5;
  background: var(--bg-tertiary);
}

.question-item.drag-over {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, var(--bg-secondary));
}

.drag-handle {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.question-number {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 24px;
}

.question-text {
  flex: 1;
  font-size: 0.875rem;
}

.question-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-overlay-10);
  color: var(--primary-color);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon.btn-remove:hover {
  color: var(--danger-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
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

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
