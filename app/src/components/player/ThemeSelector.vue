<template>
  <div class="theme-selector-wrapper">
    <button class="theme-toggle-btn" @click="showSelector = !showSelector" title="Change Theme">
      🎨
    </button>

    <!-- Theme Selector Dropdown -->
    <transition name="fade">
      <div v-if="showSelector" class="theme-dropdown">
        <div class="theme-dropdown-header">
          <span>Choose Theme</span>
          <button class="close-btn" @click="showSelector = false">✕</button>
        </div>

        <div class="theme-options">
          <button
            v-for="theme in themes"
            :key="theme.value"
            class="theme-option"
            :class="{ active: currentTheme === theme.value }"
            @click="selectTheme(theme.value)"
          >
            <span class="theme-icon">{{ theme.icon }}</span>
            <span class="theme-name">{{ theme.label }}</span>
            <span v-if="currentTheme === theme.value" class="check-mark">✓</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Backdrop -->
    <div
      v-if="showSelector"
      class="backdrop"
      @click="showSelector = false"
    ></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from '../../composables/useTheme.js'

const { currentTheme, setTheme } = useTheme('PLAYER')

const showSelector = ref(false)

const themes = [
  { value: 'grey', label: 'Grey (Default)', icon: '🌫️' },
  { value: 'dark', label: 'Dark Blue', icon: '🌙' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'system', label: 'System', icon: '⚙️' }
]

const selectTheme = (theme) => {
  setTheme(theme)
  showSelector.value = false
}
</script>

<style scoped>
.theme-selector-wrapper {
  position: relative;
}

.theme-toggle-btn {
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-btn:hover {
  background: var(--bg-overlay-20);
  border-color: var(--border-dark);
  transform: scale(1.05);
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  z-index: 1000;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.theme-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-overlay-10);
  color: var(--text-primary);
}

.theme-options {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 0.95rem;
}

.theme-option:hover {
  background: var(--bg-overlay-10);
  border-color: var(--border-color);
}

.theme-option.active {
  background: var(--info-bg-15);
  border-color: var(--info-light);
  color: var(--info-light);
}

.theme-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.theme-name {
  flex: 1;
}

.check-mark {
  color: var(--info-light);
  font-weight: bold;
  font-size: 1.1rem;
}

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile optimization */
@media (max-width: 640px) {
  .theme-dropdown {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 12px 12px 0 0;
    min-width: unset;
  }

  .theme-toggle-btn {
    padding: 0.4rem 0.6rem;
    font-size: 1rem;
  }
}
</style>
