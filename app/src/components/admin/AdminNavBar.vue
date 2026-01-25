<template>
  <nav class="navbar">
    <div class="logo">Trivia Admin</div>
    <div class="hamburger" @click.stop="$emit('toggle-menu')">&#9776;</div>
    <ul class="menu" :class="{ open: menuOpen }" id="menu">
      <li><RouterLink to="/admin">Admin</RouterLink></li>
      <li><RouterLink to="/player">Player</RouterLink></li>
      <li><RouterLink to="/presenter">Presenter</RouterLink></li>
      <li><RouterLink to="/display">Spectate</RouterLink></li>
      <li class="username-item">
        <span>{{ username || 'Admin' }}</span>
        <a href="#" @click.prevent="$emit('settings')" class="settings-link" title="Account Settings">&#9881;</a>
      </li>
      <li>
        <a href="#" @click.prevent="$emit('logout')" class="logout-link">Logout</a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router';

defineProps({
  username: { type: String, default: 'Admin' },
  menuOpen: { type: Boolean, required: true }
});

defineEmits(['toggle-menu', 'logout', 'settings']);
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg-tertiary-30);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--text-primary);
}

.menu {
  display: flex;
  list-style: none;
  gap: 1.5rem;
  padding: 0;
  margin: 0;
}

.menu li {
  display: flex;
  align-items: center;
}

.menu a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.2s;
}

.menu a:hover {
  color: var(--info-light);
}

.username-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--info-light);
  font-weight: 600;
}

.settings-link {
  font-size: 1.1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.settings-link:hover {
  opacity: 1;
}

.logout-link {
  color: var(--danger-color);
  font-weight: 600;
  padding: 0.5rem 1rem;
  background: var(--danger-bg-10);
  border-radius: 6px;
  border: 1px solid var(--danger-light);
}

.logout-link:hover {
  background: var(--danger-bg-20);
  color: var(--danger-dark);
  border-color: var(--danger-color);
}

/* Mobile styles */
@media (max-width: 1024px) {
  .hamburger {
    display: block !important;
    z-index: 101;
  }

  .menu {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--info-light);
    padding: 1rem;
    gap: 0.5rem;
    display: none !important;
    z-index: 999;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
    box-shadow: 0 4px 6px var(--bg-overlay-70);
  }

  .menu.open {
    display: flex !important;
  }

  .menu li {
    width: 100%;
    white-space: normal;
  }

  .menu a {
    display: block;
    padding: 0.75rem;
    width: 100%;
    border-radius: 8px;
    transition: background 0.2s;
  }

  .menu a:hover {
    background: var(--info-bg-10);
  }
}

@media (max-width: 768px) {
  .menu {
    background: var(--bg-primary);
    backdrop-filter: blur(10px);
  }
}
</style>
