<template>
  <div class="theme-toggle">
    <button
      class="toggle-btn"
      @click="toggleTheme"
      :title="`Switch to ${nextTheme} theme`"
    >
      <span class="icon">{{ themeIcon }}</span>
      <span class="label">{{ themeLabel }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme.js'

const { currentTheme, setTheme } = useTheme('DISPLAY')

// Cycle through: grey → dark → light → grey
const themeConfig = {
  grey: { next: 'dark', icon: '🌫️', label: 'Grey' },
  dark: { next: 'light', icon: '🌙', label: 'Dark' },
  light: { next: 'grey', icon: '☀️', label: 'Light' },
  system: { next: 'grey', icon: '⚙️', label: 'System' }
}

const themeIcon = computed(() => themeConfig[currentTheme.value]?.icon || '🎨')
const themeLabel = computed(() => themeConfig[currentTheme.value]?.label || 'Theme')
const nextTheme = computed(() => themeConfig[currentTheme.value]?.next || 'grey')

const toggleTheme = () => {
  setTheme(nextTheme.value)
}
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  z-index: 1000;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-overlay-60);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
}

.toggle-btn:hover {
  background: var(--bg-overlay-75);
  border-color: var(--border-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.toggle-btn:active {
  transform: translateY(0);
}

.icon {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
}

.label {
  font-size: 0.9rem;
  opacity: 0.9;
}

/* Mobile optimization */
@media (max-width: 640px) {
  .theme-toggle {
    top: 1rem;
    left: 1rem;
  }

  .toggle-btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }

  .icon {
    font-size: 1.1rem;
  }

  .label {
    display: none; /* Hide label on mobile to save space */
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .theme-toggle {
    top: 1.25rem;
    left: 1.25rem;
  }
}
</style>
