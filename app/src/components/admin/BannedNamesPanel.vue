<template>
  <section>
    <h2>Banned Display Names</h2>
    <p class="section-description">Manage globally banned display names to prevent offensive or inappropriate names</p>

    <div class="banned-names-header">
      <button @click="$emit('addBannedName')" class="btn-primary">+ Add Banned Name</button>
      <button @click="$emit('refresh')" class="btn-refresh">🔄 Refresh</button>
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
          <button @click="$emit('removeBannedName', name)" class="btn-delete" title="Remove Ban">🗑️</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
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
  color: #4fc3f7;
  font-size: 1.8rem;
}

.section-description {
  color: #aaa;
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
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  border-radius: 8px;
  color: #4fc3f7;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

.btn-refresh {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.banned-count {
  margin-left: auto;
  color: #4fc3f7;
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
  color: #666;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.banned-name-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s;
}

.banned-name-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(79, 195, 247, 0.3);
}

.banned-pattern {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.pattern-text {
  font-weight: 500;
  color: #fff;
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
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #ef5350;
}

.pattern-type-badge.type-contains {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.3);
  color: #ffa726;
}

.banned-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #aaa;
  font-size: 0.85rem;
}

.banned-by {
  color: #ccc;
}

.banned-date {
  color: #888;
}

.banned-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-delete {
  padding: 0.5rem 0.75rem;
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.3);
  border-radius: 6px;
  color: #f66;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: rgba(200, 0, 0, 0.3);
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
