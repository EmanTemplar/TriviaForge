<template>
  <nav class="navbar">
    <div class="logo">Trivia Player</div>

    <!-- Progress button in navbar -->
    <div class="nav-progress-container">
      <button v-if="inRoom" id="progressBtn" class="progress-btn" @click="$emit('showProgress')">
        📊 Progress
      </button>
    </div>

    <div v-if="inRoom" class="nav-room-info" :class="{ active: inRoom }">
      <span class="nav-room-code">{{ currentRoomCode || '----' }}</span>
      <span class="nav-connection-status" :class="connectionStateClass">{{ connectionStateSymbol }}</span>
      <span v-if="wakeLockActive" class="wake-lock-indicator" title="Screen will stay on">🔆</span>
    </div>

    <ThemeSelector />

    <div class="hamburger" @click="$emit('toggleMenu')">&#9776;</div>
    <ul class="menu" :class="{ open: menuOpen }">
      <li><RouterLink to="/display">Spectate</RouterLink></li>
      <li v-if="inRoom" id="menuLeaveRoom" class="mobile-only-menu-item">
        <a href="#" @click.prevent="$emit('leaveRoom')">Leave Room</a>
      </li>
      <li v-if="inRoom" id="menuPlayersSection" class="mobile-only-menu-item">
        <div>Players in Room</div>
        <div id="menuPlayersList" class="menu-players">
          <div v-for="(player, idx) in nonSpectatorPlayers" :key="player.id" class="player-item">
            <span>{{ idx + 1 }}.</span>
            <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
            <span>{{ player.name }}</span>
            <span v-if="player.choice !== null">✓</span>
          </div>
          <em v-if="nonSpectatorPlayers.length === 0">Not in a room yet</em>
        </div>
      </li>
      <li v-if="loginUsername" class="logout-item">
        <a href="#" @click.prevent="$emit('logout')" class="logout-link">Logout</a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import ThemeSelector from './ThemeSelector.vue';

defineProps({
  inRoom: { type: Boolean, required: true },
  currentRoomCode: { type: String, default: null },
  connectionStateClass: { type: String, required: true },
  connectionStateSymbol: { type: String, required: true },
  wakeLockActive: { type: Boolean, required: true },
  menuOpen: { type: Boolean, required: true },
  nonSpectatorPlayers: { type: Array, required: true },
  loginUsername: { type: String, default: '' }
});

defineEmits(['showProgress', 'toggleMenu', 'leaveRoom', 'logout']);
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg-tertiary-30);
  border-bottom: 1px solid var(--border-color);
  gap: 1rem;
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.nav-progress-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

.progress-btn {
  padding: 0.5rem 1rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--info-light);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.progress-btn:hover {
  background: var(--info-bg-30);
}

.nav-room-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.nav-room-code {
  color: var(--info-light);
  font-weight: bold;
}

.nav-connection-status {
  font-size: 1.2rem;
  transition: color 0.2s;
}

/* Connection states */
.nav-connection-status.status-connected,
.status-connected {
  color: var(--secondary-light); /* Green */
}

.nav-connection-status.status-away,
.status-away {
  color: var(--warning-light); /* Orange */
}

.nav-connection-status.status-disconnected,
.status-disconnected {
  color: var(--danger-light); /* Red */
}

.nav-connection-status.status-warning,
.status-warning {
  color: var(--warning-light); /* Yellow/Warning */
  animation: pulse-warning 1.5s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Wake Lock Indicator */
.wake-lock-indicator {
  font-size: 1rem;
  margin-left: 0.5rem;
  cursor: help;
  opacity: 0.9;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  flex-shrink: 0;
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

.logout-link {
  color: var(--danger-light);
}

.logout-link:hover {
  color: var(--danger-color);
}

/* Hide mobile-only menu items on desktop */
@media (min-width: 1025px) {
  .mobile-only-menu-item {
    display: none !important;
  }
}

.logout-item {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

/* Show separator only on mobile */
@media (max-width: 1024px) {
  .logout-item {
    border-top: 1px solid var(--border-color);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }
}

.menu-players {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.player-status {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.player-status.online {
  color: var(--secondary-light);
}

.player-status.offline {
  color: var(--danger-light);
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
    flex-direction: column;
    align-items: flex-start;
    border-bottom: 1px solid var(--bg-overlay-10);
    padding: 0.5rem 0;
  }

  .menu li:last-child {
    border-bottom: none;
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

  .menu-players {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
  }

  .menu-players .player-item {
    padding: 0.5rem 0.75rem;
    background: var(--bg-overlay-10);
    border-radius: 6px;
    margin-bottom: 0.25rem;
  }

  /* Leave Room button - red outline */
  #menuLeaveRoom a {
    border: 2px solid var(--danger-light);
    background: var(--danger-bg-10);
  }

  #menuLeaveRoom a:hover {
    background: var(--danger-bg-20);
    border-color: var(--danger-color);
  }

  /* Logout button - red transparent background */
  .logout-item a {
    background: var(--danger-bg-20);
    border: 2px solid var(--danger-light);
  }

  .logout-item a:hover {
    background: var(--danger-bg-30);
    border-color: var(--danger-color);
  }
}

@media (max-width: 768px) {
  .menu {
    background: var(--bg-primary);
    backdrop-filter: blur(10px);
  }
}
</style>
