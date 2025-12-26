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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.status-message.success {
  background: rgba(0, 200, 0, 0.1);
  border-color: rgba(0, 200, 0, 0.3);
  color: #0f0;
}

.status-message.error {
  background: rgba(200, 0, 0, 0.1);
  border-color: rgba(200, 0, 0, 0.3);
  color: #f66;
}

.status-message.warning {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
  color: #ffa500;
}

.status-message.info {
  background: rgba(79, 195, 247, 0.1);
  border-color: rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}
</style>
