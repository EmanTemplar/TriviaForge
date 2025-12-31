<template>
  <div class="status-message" :class="messageType">{{ message }}</div>
</template>

<script setup>
defineProps({
  message: { type: String, required: true },
  messageType: { type: String, default: '' }
});
</script>

<style scoped>
.status-message {
  padding: 1rem;
  background: var(--bg-overlay-10);
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  margin-top: auto;
}

.status-message.success {
  background: var(--secondary-bg-10);
  border-color: var(--secondary-light);
  color: var(--secondary-light);
}

.status-message.error {
  background: var(--danger-bg-10);
  border-color: var(--danger-light);
  color: var(--danger-light);
}

.status-message.warning {
  background: var(--warning-bg-10);
  border-color: var(--warning-light);
  color: var(--warning-light);
}

.status-message.info {
  background: var(--info-bg-10);
  border-color: var(--info-light);
  color: var(--info-light);
}
</style>
