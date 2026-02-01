<template>
  <section>
    <h2>Banned Display Names</h2>
    <p class="section-description">Manage globally banned display names to prevent offensive or inappropriate names</p>

    <div class="banned-names-header">
      <button @click="$emit('addBannedName')" class="btn-primary">+ Add Banned Name</button>
      <button @click="$emit('refresh')" class="btn-refresh"><AppIcon name="refresh-cw" size="sm" /> Refresh</button>
      <div class="banned-count">{{ bannedNames.length }} banned pattern(s)</div>
    </div>

    <div class="banned-names-list">
      <div v-if="bannedNames.length === 0" class="empty-state"><em>No banned display names</em></div>
      <div v-for="name in bannedNames" :key="name.id" class="banned-name-item">
        <div class="banned-pattern">
          <span class="pattern-text">{{ name.pattern }}</span>
          <span class="pattern-type-badge" :class="'type-' + name.pattern_type">
            {{ name.pattern_type === 'exact' ? 'Exact' : 'Contains' }}
          </span>
        </div>
        <div class="banned-meta">
          <span class="banned-by">Banned by: {{ name.banned_by || 'System' }}</span>
          <span class="banned-date">{{ formatDate(name.created_at) }}</span>
        </div>
        <div class="banned-actions">
          <button @click="$emit('removeBannedName', name)" class="btn-delete" title="Remove Ban"><AppIcon name="trash-2" size="sm" /></button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue';

defineProps({
  bannedNames: { type: Array, required: true },
  formatDate: { type: Function, required: true }
});

defineEmits(['addBannedName', 'refresh', 'removeBannedName']);
</script>

<style scoped>
section {
  padding: 2rem;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: var(--info-light);
  font-size: 1.8rem;
}

.section-description {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  font-size: 0.95rem;
}

.banned-names-header {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--primary-bg-30);
  border: 1px solid var(--primary-light);
  border-radius: 8px;
  color: var(--info-light);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-bg-50);
}

.btn-refresh {
  padding: 0.75rem 1rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: var(--bg-overlay-30);
  color: var(--text-primary);
}

.banned-count {
  margin-left: auto;
  color: var(--info-light);
  font-weight: 500;
}

.banned-names-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg-overlay-10);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.banned-name-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.banned-name-item:hover {
  background: var(--bg-overlay-20);
  border-color: var(--info-light);
}

.banned-pattern {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.pattern-text {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 1rem;
}

.pattern-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pattern-type-badge.type-exact {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

.pattern-type-badge.type-contains {
  background: var(--warning-bg-20);
  border: 1px solid var(--warning-light);
  color: var(--warning-light);
}

.banned-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.banned-by {
  color: var(--text-secondary);
}

.banned-date {
  color: var(--text-tertiary);
}

.banned-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-delete {
  padding: 0.5rem 0.75rem;
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  border-radius: 6px;
  color: var(--danger-light);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: var(--danger-bg-30);
}

@media (max-width: 768px) {
  section {
    padding: 1rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .banned-name-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .banned-pattern {
    width: 100%;
  }

  .banned-meta {
    width: 100%;
  }

  .banned-count {
    margin-left: 0;
    width: 100%;
  }
}
</style>
