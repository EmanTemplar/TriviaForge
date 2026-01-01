<template>
  <Modal :isOpen="isOpen" @close="$emit('cancel')" title="Confirm Your Answer" size="medium">
    <template #default>
      <div class="answer-confirm-content">
        <p class="selection-label">You selected:</p>
        <div class="selected-answer-display">
          <strong class="answer-letter">{{ answerLetter }}.</strong>
          <span class="answer-text">{{ answerText }}</span>
        </div>
        <p class="confirmation-prompt">
          Are you sure you want to submit this answer?
          <br>
          <span class="lock-warning">Once confirmed, you cannot change your answer.</span>
        </p>
      </div>
    </template>
    <template #footer>
      <button class="btn-success btn-large" @click="$emit('confirm')" autofocus>
        Confirm Answer
      </button>
      <button class="btn-cancel btn-large" @click="$emit('cancel')">
        Cancel
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import Modal from '@/components/common/Modal.vue';

/**
 * AnswerConfirmModal - Confirmation modal to prevent accidental answer submissions
 *
 * @emits confirm - When user confirms their answer selection
 * @emits cancel - When user cancels and wants to reselect
 */
const props = defineProps({
  /** Whether the modal is open */
  isOpen: {
    type: Boolean,
    required: true
  },
  /** Index of the selected answer (0-based) */
  selectedIndex: {
    type: Number,
    required: true
  },
  /** Array of answer choice texts */
  choices: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['confirm', 'cancel']);

// Computed properties for display
const answerLetter = computed(() => {
  return String.fromCharCode(65 + props.selectedIndex); // A, B, C, D
});

const answerText = computed(() => {
  return props.choices[props.selectedIndex] || '';
});

// Keyboard support - Enter to confirm, Esc to cancel
const handleKeydown = (event) => {
  if (!props.isOpen) return;

  if (event.key === 'Enter') {
    event.preventDefault();
    emit('confirm');
  } else if (event.key === 'Escape') {
    event.preventDefault();
    emit('cancel');
  }
};

// Add keyboard listener when modal is open
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.answer-confirm-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.selection-label {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
}

.selected-answer-display {
  background: var(--info-bg-20);
  border: 3px solid var(--info-light);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 80px;
}

.answer-letter {
  font-size: 2rem;
  color: var(--info-light);
  flex-shrink: 0;
  min-width: 2.5rem;
  text-align: center;
  white-space: nowrap; /* Prevent letter and period from wrapping */
}

.answer-text {
  font-size: 1.2rem;
  color: var(--text-primary);
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.confirmation-prompt {
  text-align: center;
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.lock-warning {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--warning-light);
  font-style: italic;
}

/* Large button variant for mobile-friendly touch targets */
.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  min-height: 56px; /* iOS recommended touch target */
  font-weight: 600;
}

/* Cancel button styling - grey/neutral to differentiate from confirm */
.btn-cancel {
  background: var(--bg-overlay-20);
  color: var(--text-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: var(--bg-overlay-30);
  border-color: var(--border-dark);
  color: var(--text-primary);
}

.btn-cancel:active {
  transform: scale(0.98);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .selected-answer-display {
    padding: 1.25rem 1.5rem;
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .answer-letter {
    font-size: 2.5rem;
  }

  .answer-text {
    font-size: 1.1rem;
  }

  .btn-large {
    padding: 1.25rem 2rem;
    font-size: 1.2rem;
    min-height: 64px; /* Extra large for mobile */
  }
}

/* Focus states for accessibility */
.btn-large:focus-visible {
  outline: 3px solid var(--primary-light);
  outline-offset: 2px;
}
</style>
