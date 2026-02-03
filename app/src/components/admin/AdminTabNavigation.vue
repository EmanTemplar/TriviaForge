<template>
  <div class="tabs-wrapper">
    <div class="tabs-container" ref="tabsContainer">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :ref="el => setTabRef(tab.id, el)"
        class="tab-btn"
        :class="{ 'active-tab': activeTab === tab.id }"
        @click="$emit('switchTab', tab.id)"
      >
        {{ tab.label }}
      </button>
      <div
        class="tab-slider"
        :style="sliderStyle"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
  activeTab: { type: String, required: true },
  tabs: { type: Array, required: true }
});

defineEmits(['switchTab']);

const tabRefs = ref({});
const tabsContainer = ref(null);
const sliderLeft = ref(0);
const sliderWidth = ref(0);
const initialized = ref(false);

const setTabRef = (id, el) => {
  if (el) tabRefs.value[id] = el;
};

const updateSlider = () => {
  const el = tabRefs.value[props.activeTab];
  const container = tabsContainer.value;
  if (el && container) {
    const containerRect = container.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();
    sliderLeft.value = tabRect.left - containerRect.left + container.scrollLeft;
    sliderWidth.value = tabRect.width;
    initialized.value = true;
  }
};

const sliderStyle = computed(() => ({
  transform: `translateX(${sliderLeft.value}px)`,
  width: `${sliderWidth.value}px`,
  opacity: initialized.value ? 1 : 0
}));

watch(() => props.activeTab, () => {
  nextTick(updateSlider);
});

onMounted(() => {
  nextTick(updateSlider);
  window.addEventListener('resize', updateSlider);
});
</script>

<style scoped>
.tabs-wrapper {
  background: var(--bg-tertiary-60);
  padding: 0 2rem;
}

.tabs-container {
  display: flex;
  gap: 0.25rem;
  position: relative;
  padding-top: 0.5rem;
  overflow-x: auto;
}

.tab-btn {
  padding: 0.75rem 1.75rem;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.25s, background 0.25s;
  white-space: nowrap;
  font-weight: 500;
  font-size: 1rem;
  position: relative;
  z-index: 2;
}

.tab-btn:hover:not(.active-tab) {
  color: var(--text-secondary);
  background: var(--bg-overlay-10);
}

.tab-btn.active-tab {
  color: var(--text-primary);
  background: var(--bg-primary);
  border-color: var(--border-color);
  font-weight: 600;
}

/* Slider that sits behind the tabs at the bottom edge */
.tab-slider {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--primary-color);
  border-radius: 3px 3px 0 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 3;
}

@media (max-width: 768px) {
  .tabs-wrapper {
    padding: 0 1rem;
  }

  .tab-btn {
    padding: 0.6rem 1.25rem;
    font-size: 0.9rem;
  }
}
</style>
