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
      </li>
      <li>
        <a href="#" @click.prevent="$emit('logout')" style="color: #f66;">Logout</a>
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

defineEmits(['toggle-menu', 'logout']);
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #fff;
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
  color: #fff;
  text-decoration: none;
  transition: color 0.2s;
}

.menu a:hover {
  color: #4fc3f7;
}

.username-item {
  padding: 0.5rem 1rem;
  background: rgba(79, 195, 247, 0.1);
  border-radius: 8px;
  color: #4fc3f7;
  font-weight: 500;
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
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid rgba(79, 195, 247, 0.2);
    padding: 1rem;
    gap: 0.5rem;
    display: none !important;
    z-index: 999;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
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
    background: rgba(79, 195, 247, 0.1);
  }
}

@media (max-width: 768px) {
  .menu {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
  }
}
</style>
