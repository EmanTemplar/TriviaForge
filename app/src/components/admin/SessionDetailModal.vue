<template>
  <Modal :isOpen="isOpen" size="large" title="Session Details" @close="$emit('close')">
    <div v-if="session" class="session-detail-content">
      <div class="session-detail-header">
        <h3>{{ session.quizTitle }}</h3>
        <div class="session-detail-meta">
          <span>Room: {{ session.roomCode }}</span>
          <span class="session-status" :class="'status-' + session.status">{{ session.status }}</span>
          <span v-if="session.completedAt">Completed: {{ formatDate(session.completedAt) }}</span>
          <span v-else>Started: {{ formatDate(session.createdAt) }}</span>
        </div>
      </div>

      <!-- Player Summary -->
      <PlayerResultsTable
        v-if="session.playerResults && session.playerResults.length > 0"
        :rankedPlayers="rankedPlayers"
      />
      <div v-else class="session-results">
        <p class="empty-state"><em>No player results available</em></p>
      </div>

      <!-- Detailed Question Breakdown -->
      <QuestionBreakdown
        v-if="session.questions && session.questions.length > 0"
        :questions="session.questions"
        :playerResults="session.playerResults || []"
        :presentedQuestions="session.presentedQuestions"
        :expandedQuestions="expandedQuestions"
        @toggleQuestion="$emit('toggleQuestion', $event)"
      />
    </div>
    <template #footer>
      <button class="btn-danger" @click="$emit('deleteSession', session)">Delete Session</button>
      <button class="btn-secondary" @click="$emit('close')">Close</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from '@/components/common/Modal.vue';
import PlayerResultsTable from './PlayerResultsTable.vue';
import QuestionBreakdown from './QuestionBreakdown.vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  session: { type: Object, default: null },
  expandedQuestions: { type: Set, required: true },
  formatDate: { type: Function, required: true }
});

defineEmits(['close', 'deleteSession', 'toggleQuestion']);

const rankedPlayers = computed(() => {
  if (!props.session || !props.session.playerResults) return [];
  // Sort players by correct answers (descending), then by accuracy (descending)
  return [...props.session.playerResults].sort((a, b) => {
    if (b.correct !== a.correct) {
      return b.correct - a.correct;
    }
    // If correct answers are the same, sort by accuracy
    const accA = a.answered > 0 ? (a.correct / a.answered) * 100 : 0;
    const accB = b.answered > 0 ? (b.correct / b.answered) * 100 : 0;
    return accB - accA;
  });
});
</script>

<style scoped>
.session-detail-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-detail-header {
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(79, 195, 247, 0.3);
}

.session-detail-header h3 {
  margin: 0 0 0.75rem 0;
  color: #4fc3f7;
  font-size: 1.5rem;
}

.session-detail-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: #aaa;
  font-size: 0.9rem;
}

.session-detail-meta span {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.session-status {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}

.session-status.status-completed {
  background: rgba(76, 175, 80, 0.2) !important;
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #81c784;
}

.session-status.status-active {
  background: rgba(79, 195, 247, 0.2) !important;
  border: 1px solid rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}

.session-status.status-pending {
  background: rgba(255, 152, 0, 0.2) !important;
  border: 1px solid rgba(255, 152, 0, 0.3);
  color: #ffa726;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.btn-danger,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger {
  background: rgba(200, 0, 0, 0.3);
  border: 1px solid rgba(200, 0, 0, 0.5);
  color: #f66;
}

.btn-danger:hover {
  background: rgba(200, 0, 0, 0.5);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

@media (max-width: 768px) {
  .session-detail-header h3 {
    font-size: 1.2rem;
  }

  .session-detail-meta {
    flex-direction: column;
  }
}
</style>
