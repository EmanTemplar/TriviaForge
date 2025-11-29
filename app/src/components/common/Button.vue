<template>
  <button
    :type="type"
    :class="[
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      {
        'btn-loading': isLoading,
        'btn-fullwidth': fullWidth
      }
    ]"
    :disabled="disabled || isLoading"
  >
    <span v-if="isLoading" class="spinner"></span>
    <span v-if="icon" class="btn-icon">{{ icon }}</span>
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

defineProps({
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) =>
      ['primary', 'secondary', 'danger', 'outline', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: null
  }
})
</script>

<style scoped>
.btn {
  font-family: inherit;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  white-space: nowrap;
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-sm);
}

.btn-medium {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-base);
}

.btn-large {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-lg);
}

/* Variants */
.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--secondary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-secondary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--danger-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-danger:active:not(:disabled) {
  transform: translateY(0);
}

.btn-outline {
  background-color: transparent;
  border: 2px solid var(--border-dark);
  color: var(--text-primary);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--bg-secondary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-ghost {
  background-color: transparent;
  color: var(--text-primary);
}

.btn-ghost:hover:not(:disabled) {
  background-color: var(--bg-secondary);
}

/* States */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading .spinner {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.btn-small .spinner {
  width: 0.75rem;
  height: 0.75rem;
}

.btn-large .spinner {
  width: 1.25rem;
  height: 1.25rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-fullwidth {
  width: 100%;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 640px) {
  .btn {
    font-size: var(--font-sm);
    padding: var(--spacing-xs) var(--spacing-md);
  }
}
</style>
