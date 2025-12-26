<template>
  <div class="room-info">
    <h3>Room Info</h3>
    <div><strong>Room Code:</strong> <span>{{ currentRoomCode }}</span></div>
    <div><strong>Your Name:</strong> <span>{{ currentDisplayName }}</span></div>

    <button class="btn-info" @click="$emit('showProgress')">📊 View Progress</button>
    <button class="btn-danger" @click="$emit('leaveRoom')">Leave Room</button>
  </div>
</template>

<script setup>
defineProps({
  currentRoomCode: { type: String, required: true },
  currentDisplayName: { type: String, required: true }
});

defineEmits(['showProgress', 'leaveRoom']);
</script>

<style scoped>
.room-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.room-info h3 {
  margin: 0;
  color: #4fc3f7;
  font-size: 1.1rem;
}

.room-info div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #fff;
}

.room-info strong {
  color: #aaa;
}

.btn-info,
.btn-danger {
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-info {
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  color: #4fc3f7;
}

.btn-info:hover {
  background: rgba(79, 195, 247, 0.3);
}

.btn-danger {
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.3);
  color: #f66;
}

.btn-danger:hover {
  background: rgba(200, 0, 0, 0.3);
}
</style>
