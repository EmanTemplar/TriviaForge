<template>
  <div :class="['card', `card-${variant}`, { 'card-clickable': clickable }]" @click="handleClick">
    <div v-if="title" class="card-header">
      <h3 class="card-title">{{ title }}</h3>
      <slot name="header-action" />
    </div>

    <div class="card-body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: null
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) =>
      ['default', 'highlighted', 'warning', 'success', 'danger'].includes(value)
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.card-default {
  box-shadow: var(--shadow-sm);
}

.card-default:hover {
  box-shadow: var(--shadow-md);
}

.card-highlighted {
  border: 2px solid var(--primary-color);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, transparent 100%);
}

.card-highlighted:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-dark);
}

.card-warning {
  border-left: 4px solid var(--warning-color);
}

.card-success {
  border-left: 4px solid var(--secondary-color);
}

.card-danger {
  border-left: 4px solid var(--danger-color);
}

.card-clickable {
  cursor: pointer;
}

.card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  margin: 0;
  font-size: var(--font-lg);
  font-weight: 600;
}

.card-body {
  padding: var(--spacing-lg);
}

.card-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

@media (max-width: 640px) {
  .card-header,
  .card-body,
  .card-footer {
    padding: var(--spacing-md);
  }

  .card-title {
    font-size: var(--font-base);
  }
}
</style>
