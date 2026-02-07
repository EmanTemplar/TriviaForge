<template>
  <div class="waiting-display">
    <h2 class="waiting-title">{{ inRoom ? 'Waiting for Question' : 'Join a Room to Start' }}</h2>
    <p class="waiting-message">{{ inRoom ? 'Waiting for the presenter to start the quiz...' : 'Enter your name and room code to begin playing.' }}</p>

    <!-- Solo Practice Link (when not in room) -->
    <div v-if="!inRoom" class="solo-practice-section">
      <p class="solo-hint">or practice on your own</p>
      <RouterLink to="/solo" class="solo-practice-btn">
        <span class="solo-icon">🎯</span>
        <span class="solo-text">Solo Practice Mode</span>
      </RouterLink>
    </div>

    <!-- Recent Rooms Section -->
    <div v-if="!inRoom && recentRooms.length > 0" class="recent-rooms-section">
      <h3>Recent Rooms</h3>
      <div class="recent-rooms-list">
        <button
          v-for="room in recentRooms"
          :key="room.code"
          class="recent-room-btn"
          @click="$emit('quickJoin', room.code)"
        >
          <div class="recent-room-content">
            <div class="recent-room-code">Room {{ room.code }}</div>
            <div class="recent-room-time">Joined {{ getTimeAgo(room.timestamp) }}</div>
          </div>
          <div class="recent-room-arrow">→ Quick Join</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  inRoom: { type: Boolean, required: true },
  recentRooms: { type: Array, required: true }
});

defineEmits(['quickJoin']);

const getTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};
</script>

<style scoped>
.waiting-display {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.waiting-title {
  font-size: 2rem;
  margin: 0;
}

.waiting-message {
  font-size: 1.1rem;
  color: var(--text-tertiary);
  margin: 0;
}

.solo-practice-section {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.solo-hint {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin: 0;
}

.solo-practice-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary-bg-30);
  border: 1px solid var(--primary-light);
  border-radius: 8px;
  color: var(--text-primary);
  text-decoration: none;
  font-weight: bold;
  transition: all 0.2s;
}

.solo-practice-btn:hover {
  background: var(--primary-bg-50);
  transform: translateY(-2px);
}

.solo-icon {
  font-size: 1.2rem;
}

.solo-text {
  color: var(--primary-light);
}

.recent-rooms-section {
  margin-top: 2rem;
}

.recent-rooms-section h3 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--info-light);
}

.recent-rooms-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recent-room-btn {
  padding: 1rem;
  background: var(--info-bg-10);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.recent-room-btn:hover {
  background: var(--info-bg-20);
}

.recent-room-content {
  text-align: left;
}

.recent-room-code {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--info-light);
}

.recent-room-time {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-top: 0.25rem;
}

.recent-room-arrow {
  font-size: 0.9rem;
  color: var(--info-light);
}
</style>
