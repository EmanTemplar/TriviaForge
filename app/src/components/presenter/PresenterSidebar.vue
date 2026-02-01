<template>
  <section class="presenter-sidebar">
    <!-- Create Room -->
    <div class="presenter-widget">
      <h2>Create Room</h2>
      <select v-model="selectedQuizValue" @change="$emit('update:selectedQuizFilename', selectedQuizValue)">
        <option value="">Select a quiz</option>
        <option v-for="quiz in quizzes" :key="quiz.filename" :value="quiz.filename">
          {{ quiz.title }}
        </option>
      </select>
      <button @click="$emit('makeRoomLive')" :disabled="!selectedQuizFilename">Make Live</button>
      <button @click="$emit('showQRModal')" :disabled="!currentRoomCode">Show Player QR Code</button>
    </div>

    <!-- Resume Session -->
    <div class="presenter-widget">
      <h2>Resume Session</h2>
      <select v-model="selectedSessionValue" @change="$emit('update:selectedSessionFilename', selectedSessionValue)">
        <option value="">{{ incompleteSessions.length === 0 ? 'No incomplete sessions' : 'Select session to resume' }}</option>
        <option v-for="session in incompleteSessions" :key="session.filename" :value="session.filename">
          {{ session.quizTitle }} ({{ session.roomCode }}) - {{ session.status === 'interrupted' ? 'Interrupted' : 'In Progress' }} - {{ formatSessionDate(session) }}
        </option>
      </select>
      <button @click="$emit('resumeSession')" :disabled="incompleteSessions.length === 0 || !selectedSessionFilename">Resume</button>
    </div>

    <!-- Active Rooms -->
    <div class="presenter-widget flex-grow">
      <h2>Active Rooms</h2>
      <div class="active-rooms-list">
        <div v-if="activeRooms.length === 0" class="empty-state"><em>No active rooms</em></div>
        <div v-for="room in activeRooms" :key="room.roomCode" class="roomCard" :class="{ activeRoom: room.roomCode === currentRoomCode }" @click="$emit('viewRoom', room.roomCode)">
          <div><strong>{{ room.quizTitle }}</strong> ({{ room.roomCode }})</div>
          <div>{{ room.playerCount }} player(s)</div>
          <button @click.stop="$emit('closeRoom', room.roomCode)">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  quizzes: { type: Array, default: () => [] },
  selectedQuizFilename: { type: String, default: '' },
  currentRoomCode: { type: String, default: null },
  incompleteSessions: { type: Array, default: () => [] },
  selectedSessionFilename: { type: String, default: '' },
  activeRooms: { type: Array, default: () => [] }
})

defineEmits([
  'update:selectedQuizFilename',
  'makeRoomLive',
  'showQRModal',
  'update:selectedSessionFilename',
  'resumeSession',
  'viewRoom',
  'closeRoom'
])

const selectedQuizValue = ref(props.selectedQuizFilename)
const selectedSessionValue = ref(props.selectedSessionFilename)

watch(() => props.selectedQuizFilename, (newVal) => {
  selectedQuizValue.value = newVal
})

watch(() => props.selectedSessionFilename, (newVal) => {
  selectedSessionValue.value = newVal
})

// Format session date for display
const formatSessionDate = (session) => {
  const date = session.resumedAt ? new Date(session.resumedAt) : new Date(session.createdAt)
  const dateLabel = session.resumedAt ? 'Resumed' : 'Started'
  const icon = session.resumedAt ? '↻ ' : ''
  return `${icon}${dateLabel}: ${date.toLocaleString()}`
}
</script>

<style scoped>
.presenter-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
}

.presenter-widget {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.presenter-widget:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.presenter-widget h2 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.presenter-widget select,
.presenter-widget button {
  display: block;
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--info-bg-10);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.presenter-widget select:hover,
.presenter-widget button:hover {
  background: var(--info-bg-20);
  border-color: var(--info-light);
}

.presenter-widget button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flex-grow {
  flex: 1;
}

.active-rooms-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
}

.roomCard {
  background: var(--info-bg-10);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.roomCard:hover {
  background: var(--info-bg-20);
}

.roomCard.activeRoom {
  background: var(--info-bg-30);
  border-color: var(--info-light);
}

.roomCard button {
  width: 100%;
  padding: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.empty-state {
  text-align: center;
  color: var(--text-tertiary);
  padding: 1rem;
}

@media (max-width: 900px) {
  .presenter-sidebar {
    max-height: 50vh;
  }
}

@media (max-width: 600px) {
  .presenter-sidebar {
    padding: 1rem;
  }
}
</style>
