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
  background: rgba(0, 0, 0, 0.3);
  padding: 0 2rem;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-weight: 500;
  font-size: 1rem;
}

.tab-btn:hover {
  color: #fff;
}

.tab-btn.active-tab {
  color: #fff;
  border-bottom-color: #007bff;
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
