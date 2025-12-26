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
        <a href="#" @click.prevent="$emit('logout')" style="color: #f66;">Logout</a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router';

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
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 8px;
  color: #4fc3f7;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.progress-btn:hover {
  background: rgba(79, 195, 247, 0.3);
}

.nav-room-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.nav-room-code {
  color: #4fc3f7;
  font-weight: bold;
}

.nav-connection-status {
  font-size: 1.2rem;
  transition: color 0.2s;
}

/* Connection states */
.nav-connection-status.status-connected,
.status-connected {
  color: #0f0; /* Green */
}

.nav-connection-status.status-away,
.status-away {
  color: #ff8c00; /* Orange */
}

.nav-connection-status.status-disconnected,
.status-disconnected {
  color: #f00; /* Red */
}

.nav-connection-status.status-warning,
.status-warning {
  color: #ffd700; /* Yellow/Gold */
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
  color: #fff;
  text-decoration: none;
  transition: color 0.2s;
}

.menu a:hover {
  color: #4fc3f7;
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
    border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #fff;
}

.player-status {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.player-status.online {
  color: #0f0;
}

.player-status.offline {
  color: #f00;
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
    flex-direction: column;
    align-items: flex-start;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
    background: rgba(79, 195, 247, 0.1);
  }

  .menu-players {
    margin-left: 0;
    margin-top: 0.5rem;
    width: 100%;
  }

  .menu-players .player-item {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    margin-bottom: 0.25rem;
  }

  /* Leave Room button - red outline */
  #menuLeaveRoom a {
    border: 2px solid rgba(255, 102, 102, 0.5);
    background: rgba(255, 102, 102, 0.05);
  }

  #menuLeaveRoom a:hover {
    background: rgba(255, 102, 102, 0.15);
    border-color: rgba(255, 102, 102, 0.7);
  }

  /* Logout button - red transparent background */
  .logout-item a {
    background: rgba(255, 102, 102, 0.15);
    border: 2px solid rgba(255, 102, 102, 0.6);
  }

  .logout-item a:hover {
    background: rgba(255, 102, 102, 0.25);
    border-color: rgba(255, 102, 102, 0.8);
  }
}

@media (max-width: 768px) {
  .menu {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
  }
}
</style>
