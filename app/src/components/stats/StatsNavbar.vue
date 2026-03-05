<template>
  <nav class="stats-navbar">
    <div class="navbar-brand">
      <AppIcon name="bar-chart-3" size="lg" />
      <span class="brand-text">TriviaForge Stats</span>
    </div>
    <div class="navbar-actions">
      <router-link to="/player" class="nav-link">
        <AppIcon name="users" size="sm" /> Multiplayer
      </router-link>
      <router-link to="/solo" class="nav-link">
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </router-link>
      <button v-if="showLogout" class="logout-btn" @click="$emit('logout')">
        <AppIcon name="log-out" size="sm" /> Logout
      </button>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  showLogout: { type: Boolean, default: false }
})

defineEmits(['logout'])
</script>

<style scoped>
.stats-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-tertiary-30);
  border-bottom: 1px solid var(--border-color);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-primary);
  text-decoration: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.nav-link:hover {
  background: var(--bg-overlay-10);
  color: var(--info-light);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: var(--danger-bg-20, rgba(239, 68, 68, 0.2));
}

@media (max-width: 600px) {
  .stats-navbar {
    padding: 0.75rem 1rem;
  }
  .brand-text {
    font-size: 1rem;
  }
  .nav-link span,
  .logout-btn span {
    display: none;
  }
}
</style>
