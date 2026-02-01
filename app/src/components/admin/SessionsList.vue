<template>
  <section>
    <div class="section-header">
      <h2>Session Management</h2>
      <div v-if="selectable && sessions.length > 0" class="select-all">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="someSelected && !allSelected"
            @change="toggleSelectAll"
          />
          <span>Select All</span>
        </label>
      </div>
    </div>

    <!-- Bulk Action Bar -->
    <div v-if="selectedCount > 0" class="bulk-actions">
      <span class="selected-count">{{ selectedCount }} selected</span>
      <div class="action-buttons">
        <button class="btn-export" @click="$emit('bulkExportCSV', selectedSessionIds)" title="Export CSV">
          <AppIcon name="file-text" size="sm" /> Export CSV
        </button>
        <button class="btn-danger-sm" @click="$emit('bulkDelete', selectedSessionIds)" title="Delete Selected">
          <AppIcon name="trash-2" size="sm" /> Delete Selected
        </button>
      </div>
      <button class="btn-clear" @click="clearSelection">Clear Selection</button>
    </div>

    <div class="sessions-list">
      <div v-if="sessions.length === 0" class="empty-state"><em>No sessions found</em></div>
      <div v-for="session in sessions" :key="session.filename" class="session-item" :class="{ selected: isSelected(session) }">
        <label v-if="selectable" class="session-checkbox" @click.stop>
          <input
            type="checkbox"
            :checked="isSelected(session)"
            @change="toggleSession(session)"
          />
        </label>
        <div class="session-content" @click="$emit('viewSession', session)">
          <div class="session-header">
            <div class="session-title">{{ session.quizTitle }} ({{ session.roomCode }})</div>
            <div class="session-status" :class="'status-' + session.status">{{ session.status }}</div>
          </div>
          <div class="session-meta">
            <span class="session-date">{{ formatDate(session.completedAt || session.createdAt) }}</span>
            <span v-if="isRootAdmin && session.createdByUsername" class="session-creator">
              by <strong>{{ session.createdByUsername }}</strong>
            </span>
          </div>
          <div class="session-stats">{{ session.playerCount || 0 }} players · {{ session.presentedCount || 0 }}/{{ session.questionCount || 0 }} presented</div>
        </div>
        <button class="btn-delete-inline" @click.stop="$emit('deleteSession', session)" title="Delete Session"><AppIcon name="trash-2" size="md" /></button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';

const props = defineProps({
  sessions: { type: Array, required: true },
  formatDate: { type: Function, required: true },
  isRootAdmin: { type: Boolean, default: false },
  selectable: { type: Boolean, default: true }
});

const emit = defineEmits(['viewSession', 'deleteSession', 'bulkDelete', 'bulkExportCSV']);

// Track selected session IDs
const selectedIds = ref(new Set());

// Computed properties
const selectedCount = computed(() => selectedIds.value.size);
const allSelected = computed(() => props.sessions.length > 0 && selectedIds.value.size === props.sessions.length);
const someSelected = computed(() => selectedIds.value.size > 0);
const selectedSessionIds = computed(() => Array.from(selectedIds.value));

// Check if a session is selected
function isSelected(session) {
  return selectedIds.value.has(session.sessionId);
}

// Toggle single session selection
function toggleSession(session) {
  const newSet = new Set(selectedIds.value);
  if (newSet.has(session.sessionId)) {
    newSet.delete(session.sessionId);
  } else {
    newSet.add(session.sessionId);
  }
  selectedIds.value = newSet;
}

// Toggle all sessions
function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(props.sessions.map(s => s.sessionId));
  }
}

// Clear selection
function clearSelection() {
  selectedIds.value = new Set();
}

// Clear selection when sessions list changes
watch(() => props.sessions, () => {
  // Remove any selected IDs that no longer exist in sessions
  const validIds = new Set(props.sessions.map(s => s.sessionId));
  const newSelection = new Set();
  selectedIds.value.forEach(id => {
    if (validIds.has(id)) {
      newSelection.add(id);
    }
  });
  selectedIds.value = newSelection;
}, { deep: true });
</script>

<style scoped>
section {
  padding: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

h2 {
  margin: 0;
  color: var(--info-light);
  font-size: 1.8rem;
}

.select-all {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-light);
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--info-bg-10);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.selected-count {
  font-weight: 600;
  color: var(--info-light);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.btn-export {
  padding: 0.4rem 0.75rem;
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-export:hover {
  background: var(--bg-overlay-30);
  border-color: var(--primary-light);
}

.btn-danger-sm {
  padding: 0.4rem 0.75rem;
  background: var(--danger-bg-10);
  border: 1px solid var(--danger-light);
  border-radius: 6px;
  color: var(--danger-light);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-danger-sm:hover {
  background: var(--danger-bg-20);
}

.btn-clear {
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 0.85rem;
  margin-left: auto;
}

.btn-clear:hover {
  background: var(--bg-overlay-10);
  color: var(--text-secondary);
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
  gap: 0;
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

.session-item.selected {
  border-color: var(--primary-light);
  background: var(--primary-bg-10);
}

.session-checkbox {
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  align-self: stretch;
  border-right: 1px solid var(--border-color);
}

.session-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-light);
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

.session-status.status-in_progress {
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.session-status.status-interrupted {
  background: var(--warning-bg-20);
  border: 1px solid var(--warning-light);
  color: var(--warning-light);
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

.session-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.session-date {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.session-creator {
  color: var(--info-light);
  font-size: 0.85rem;
  padding: 0.15rem 0.5rem;
  background: var(--info-bg-10);
  border-radius: 4px;
}

.session-creator strong {
  color: var(--info-color);
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

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .bulk-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .action-buttons {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .btn-clear {
    margin-left: 0;
  }

  .session-item {
    flex-direction: column;
    align-items: stretch;
  }

  .session-checkbox {
    padding: 0.75rem;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    justify-content: flex-start;
    gap: 0.5rem;
  }

  .session-checkbox::after {
    content: 'Select';
    color: var(--text-tertiary);
    font-size: 0.85rem;
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
