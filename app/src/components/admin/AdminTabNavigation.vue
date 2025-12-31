<template>
  <div class="tabs-container">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-btn"
      :class="{ 'active-tab': activeTab === tab.id }"
      @click="$emit('switchTab', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  activeTab: { type: String, required: true },
  tabs: { type: Array, required: true }
});

defineEmits(['switchTab']);
</script>

<style scoped>
.tabs-container {
  display: flex;
  gap: 0;
  background: var(--bg-tertiary-60);
  padding: 0 2rem;
  border-bottom: 1px solid var(--info-light);
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-weight: 500;
  font-size: 1rem;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active-tab {
  color: var(--text-primary);
  border-bottom-color: var(--primary-color);
}

@media (max-width: 768px) {
  .tabs-container {
    padding: 0 1rem;
  }

  .tab-btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>
