<template>
  <section>
    <h2>Session Management</h2>
    <div class="sessions-list">
      <div v-if="sessions.length === 0" class="empty-state"><em>No sessions found</em></div>
      <div v-for="session in sessions" :key="session.filename" class="session-item">
        <div class="session-content" @click="$emit('viewSession', session)">
          <div class="session-header">
            <div class="session-title">{{ session.quizTitle }} ({{ session.roomCode }})</div>
            <div class="session-status" :class="'status-' + session.status">{{ session.status }}</div>
          </div>
          <div class="session-date">{{ formatDate(session.completedAt || session.createdAt) }}</div>
          <div class="session-stats">{{ session.playerCount || 0 }} players · {{ session.presentedCount || 0 }}/{{ session.questionCount || 0 }} presented</div>
        </div>
        <button class="btn-delete-inline" @click.stop="$emit('deleteSession', session)" title="Delete Session">🗑️</button>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  sessions: { type: Array, required: true },
  formatDate: { type: Function, required: true }
});

defineEmits(['viewSession', 'deleteSession']);
</script>

<style scoped>
section {
  padding: 2rem;
}

h2 {
  margin: 0 0 1.5rem 0;
  color: var(--info-light);
  font-size: 1.8rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg-overlay-10);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.session-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
  overflow: hidden;
}

.session-item:hover {
  background: var(--bg-overlay-20);
  border-color: var(--info-light);
}

.session-content {
  flex: 1;
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.session-title {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 1rem;
}

.session-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-status.status-completed {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.session-status.status-active {
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.session-status.status-pending {
  background: var(--warning-bg-20);
  border: 1px solid var(--warning-light);
  color: var(--warning-light);
}

.session-date {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.session-stats {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.btn-delete-inline {
  padding: 1rem;
  background: var(--danger-bg-10);
  border: none;
  border-left: 1px solid var(--border-color);
  color: var(--danger-light);
  cursor: pointer;
  transition: all 0.2s;
  align-self: stretch;
}

.btn-delete-inline:hover {
  background: var(--danger-bg-20);
  color: var(--danger-color);
}

@media (max-width: 768px) {
  section {
    padding: 1rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .session-item {
    flex-direction: column;
    align-items: stretch;
  }

  .session-content {
    padding: 1rem;
  }

  .session-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-delete-inline {
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding: 0.75rem;
    text-align: center;
  }
}
</style>
