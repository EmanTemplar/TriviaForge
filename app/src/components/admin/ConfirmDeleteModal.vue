<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <div class="modal-header">
        <AppIcon icon="lucide:alert-triangle" size="lg" class="warning-icon" />
        <h2>{{ title }}</h2>
      </div>

      <div class="modal-body">
        <p class="message">{{ message }}</p>

        <div v-if="usage" class="usage-info">
          <div v-if="usage.quizCount || usage.totalQuizzes" class="usage-row">
            <AppIcon icon="lucide:file-text" size="sm" />
            <span>
              Used in <strong>{{ usage.quizCount || usage.totalQuizzes }}</strong> quiz{{ (usage.quizCount || usage.totalQuizzes) !== 1 ? 'zes' : '' }}
            </span>
          </div>
          <div v-if="usage.sessionCount || usage.totalSessions" class="usage-row">
            <AppIcon icon="lucide:play-circle" size="sm" />
            <span>
              Presented in <strong>{{ usage.sessionCount || usage.totalSessions }}</strong> session{{ (usage.sessionCount || usage.totalSessions) !== 1 ? 's' : '' }}
            </span>
          </div>
          <div v-if="usage.questionCount" class="usage-row">
            <AppIcon icon="lucide:help-circle" size="sm" />
            <span>
              <strong>{{ usage.questionCount }}</strong> question{{ usage.questionCount !== 1 ? 's' : '' }} selected
            </span>
          </div>
        </div>

        <label class="confirm-checkbox">
          <input type="checkbox" v-model="confirmed" />
          <span>I understand this action cannot be undone</span>
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('cancel')">Cancel</button>
        <button
          class="btn-danger"
          :disabled="!confirmed"
          @click="$emit('confirm')"
        >
          <AppIcon icon="lucide:trash-2" size="sm" />
          Delete Permanently
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  title: {
    type: String,
    default: 'Confirm Delete'
  },
  message: {
    type: String,
    default: 'This action cannot be undone.'
  },
  usage: {
    type: Object,
    default: null
  }
})

defineEmits(['confirm', 'cancel'])

const confirmed = ref(false)
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
  max-width: 420px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.warning-icon {
  color: var(--danger-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.modal-body {
  padding: 1.5rem;
}

.message {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
}

.usage-info {
  background: var(--danger-color-10);
  border: 1px solid var(--danger-color-20);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.usage-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.usage-row:last-child {
  margin-bottom: 0;
}

.usage-row strong {
  color: var(--danger-color);
}

.confirm-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.confirm-checkbox input {
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-danger {
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

.btn-danger:hover:not(:disabled) {
  background: var(--danger-hover);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
