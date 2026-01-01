<template>
  <div class="notifications-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', `notification-${notification.type}`]"
      >
        <div class="notification-content">
          <span class="notification-icon">{{ getIcon(notification.type) }}</span>
          <span class="notification-message">{{ notification.message }}</span>
        </div>
        <button
          class="notification-close"
          aria-label="Close notification"
          @click="removeNotification(notification.id)"
        >
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui.js'

const uiStore = useUIStore()

const notifications = computed(() => uiStore.notifications)

const getIcon = (type) => {
  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠',
    error: '✕'
  }
  return icons[type] || 'ℹ️'
}

const removeNotification = (id) => {
  uiStore.removeNotification(id)
}
</script>

<style scoped>
.notifications-container {
  position: fixed;
  top: var(--spacing-md);
  right: var(--spacing-md);
  z-index: var(--z-popover);
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  animation: slideInRight 0.3s ease-out;
  min-height: 56px;
}

.notification-info {
  background-color: var(--info-light);
  border-left: 4px solid var(--info-color);
}

.notification-success {
  background-color: var(--secondary-light);
  border-left: 4px solid var(--secondary-color);
}

.notification-warning {
  background-color: var(--warning-light);
  border-left: 4px solid var(--warning-color);
}

.notification-error {
  background-color: var(--danger-light);
  border-left: 4px solid var(--danger-color);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-grow: 1;
}

.notification-icon {
  flex-shrink: 0;
  font-size: 20px;
}

.notification-message {
  font-size: var(--font-sm);
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0 var(--spacing-md);
  font-size: 18px;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

.notification-close:hover {
  opacity: 1;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 640px) {
  .notifications-container {
    left: var(--spacing-md);
    right: var(--spacing-md);
    max-width: none;
  }

  .notification {
    padding: var(--spacing-md);
  }

  .notification-message {
    font-size: var(--font-xs);
  }
}
</style>
