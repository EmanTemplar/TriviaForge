<template>
  <nav class="navbar">
    <div class="logo">Trivia Presenter</div>
    <div class="room-code" v-if="currentRoomCode">Room: {{ currentRoomCode }}</div>
    <div v-else class="room-code"></div>
    <div class="hamburger" @click.stop="$emit('toggleMenu')" id="hamburger">&#9776;</div>
    <ul class="menu" :class="{ open: menuOpen }" id="menu">
      <li><RouterLink to="/admin">Admin</RouterLink></li>
      <li><RouterLink to="/player">Player</RouterLink></li>
      <li><RouterLink to="/presenter/room">Presenter</RouterLink></li>
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
import { RouterLink } from 'vue-router'

defineProps({
  currentRoomCode: { type: String, default: null },
  menuOpen: { type: Boolean, default: false },
  username: { type: String, default: '' }
})

defineEmits(['toggleMenu', 'logout'])
</script>

<style scoped>
.navbar {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
  flex-wrap: wrap;
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  color: #4fc3f7;
}

.room-code {
  color: #aaa;
  font-size: 0.9rem;
  flex: 1;
  text-align: center;
  min-height: 20px;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #4fc3f7;
}

.menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
  align-items: center;
}

.menu li {
  white-space: nowrap;
}

.menu a {
  color: #c9d1d9;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu a:hover {
  background: rgba(79, 195, 247, 0.2);
}

.username-item {
  color: #4fc3f7;
}

/* Hide user separator line on desktop */
.menu li:nth-child(n+5) {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}

@media (max-width: 1024px) {
  .menu li:nth-child(n+5) {
    border-top: 1px solid rgba(255,255,255,0.1);
    margin-top: 0.5rem;
    padding-top: 0.5rem;
  }

  .hamburger {
    display: block !important;
    z-index: 101;
  }

  .menu {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid rgba(79, 195, 247, 0.2);
    padding: 1rem;
    gap: 0;
    display: none !important;
    z-index: 99;
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
  }
}

@media (max-width: 600px) {
  .navbar {
    padding: 0.75rem;
  }

  .logo {
    font-size: 1rem;
  }
}
</style>
