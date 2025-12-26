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
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-weight: 500;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-btn.active-tab {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.4);
  color: #4fc3f7;
}

@media (max-width: 768px) {
  .tabs-container {
    justify-content: flex-start;
  }

  .tab-btn {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}
</style>
