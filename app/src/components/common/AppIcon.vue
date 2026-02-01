<template>
  <Icon :icon="fullIconName" :class="['app-icon', sizeClass]" :style="iconStyle" />
</template>

<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps({
  // Icon name (without prefix, e.g., "home" becomes "lucide:home")
  name: { type: String, required: true },
  // Size preset: xs, sm, md, lg, xl, 2xl
  size: { type: String, default: 'md' },
  // Custom color (uses currentColor by default)
  color: { type: String, default: null },
  // Icon set prefix (defaults to lucide)
  prefix: { type: String, default: 'lucide' }
});

const fullIconName = computed(() => {
  // Allow full icon names (with colon) to pass through
  if (props.name.includes(':')) {
    return props.name;
  }
  return `${props.prefix}:${props.name}`;
});

const sizeClass = computed(() => `icon-${props.size}`);

const iconStyle = computed(() => {
  if (props.color) {
    return { color: props.color };
  }
  return {};
});
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

/* Size presets */
.icon-xs { font-size: 0.75rem; }   /* 12px */
.icon-sm { font-size: 0.875rem; }  /* 14px */
.icon-md { font-size: 1rem; }      /* 16px */
.icon-lg { font-size: 1.25rem; }   /* 20px */
.icon-xl { font-size: 1.5rem; }    /* 24px */
.icon-2xl { font-size: 2rem; }     /* 32px */
</style>
