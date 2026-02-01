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
      <div class="footer-left">
        <button class="btn-export" @click="$emit('exportCSV', session)" title="Export as CSV">
          <AppIcon name="bar-chart-3" size="md" class="export-icon" /> Export CSV
        </button>
      </div>
      <div class="footer-right">
        <button class="btn-danger" @click="$emit('deleteSession', session)">Delete Session</button>
        <button class="btn-secondary" @click="$emit('close')">Close</button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from '@/components/common/Modal.vue';
import PlayerResultsTable from './PlayerResultsTable.vue';
import QuestionBreakdown from './QuestionBreakdown.vue';
import AppIcon from '@/components/common/AppIcon.vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  session: { type: Object, default: null },
  expandedQuestions: { type: Set, required: true },
  formatDate: { type: Function, required: true }
});

defineEmits(['close', 'deleteSession', 'toggleQuestion', 'exportCSV']);

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
  border-bottom: 2px solid var(--info-light);
}

.session-detail-header h3 {
  margin: 0 0 0.75rem 0;
  color: var(--info-light);
  font-size: 1.5rem;
}

.session-detail-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.session-detail-meta span {
  padding: 0.25rem 0.75rem;
  background: var(--bg-overlay-10);
  border-radius: 4px;
}

.session-status {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}

.session-status.status-completed {
  background: var(--secondary-bg-20) !important;
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.session-status.status-active {
  background: var(--info-bg-20) !important;
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.session-status.status-pending {
  background: var(--warning-bg-20) !important;
  border: 1px solid var(--warning-light);
  color: var(--warning-light);
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg-overlay-10);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
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
  background: var(--danger-bg-30);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

.btn-danger:hover {
  background: var(--danger-bg-50);
}

.btn-secondary {
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-overlay-30);
  color: var(--text-primary);
}

.footer-left,
.footer-right {
  display: flex;
  gap: 0.5rem;
}

.btn-export {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-export:hover {
  background: var(--info-bg-30);
}

.export-icon {
  font-size: 1rem;
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
