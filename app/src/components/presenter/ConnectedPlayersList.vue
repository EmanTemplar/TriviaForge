<template>
  <section class="presenter-players">
    <h2>Connected Players</h2>
    <button v-if="currentRoomCode" class="btn-standings" @click="$emit('showPresenterProgress')">📊 Standings</button>
    <div class="live-feed">
      <div v-if="nonSpectatorPlayers.length === 0" class="empty-state"><em>No players yet</em></div>
      <div v-for="player in nonSpectatorPlayers" :key="player.name" class="player-item">
        <span class="player-status" :class="getConnectionStateClass(player)">{{ getConnectionSymbol(player) }}</span>
        {{ player.name }}
        <span v-if="player.connectionState === 'warning'" class="player-warning-icon" title="Rapid switching detected">⚠️</span>
        <span v-if="player.choice !== null" class="player-answered">✓</span>
        <div class="player-menu-container">
          <button class="btn-player-menu" @click="togglePlayerMenu(player.name)" title="Player actions">⋮</button>
          <div v-if="playerMenuOpen === player.name" class="player-menu">
            <button @click="$emit('kickPlayer', player.name)" class="menu-item menu-item-kick">
              <span class="menu-icon">👢</span> Kick Player
            </button>
            <button @click="$emit('banDisplayName', player.name)" class="menu-item menu-item-ban">
              <span class="menu-icon">🚫</span> Ban Display Name
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  nonSpectatorPlayers: { type: Array, default: () => [] },
  currentRoomCode: { type: String, default: null }
})

defineEmits(['showPresenterProgress', 'kickPlayer', 'banDisplayName'])

const playerMenuOpen = ref(null)

const togglePlayerMenu = (playerName) => {
  playerMenuOpen.value = playerMenuOpen.value === playerName ? null : playerName
}

const getConnectionStateClass = (player) => {
  const state = player.connectionState || 'connected'
  return `status-${state}`
}

const getConnectionSymbol = (player) => {
  const state = player.connectionState || 'connected'
  switch (state) {
    case 'connected': return '●' // Green
    case 'away': return '●' // Orange
    case 'disconnected': return '●' // Red
    case 'warning': return '⚠' // Yellow warning
    default: return '○'
  }
}
</script>

<style scoped>
.presenter-players {
  display: flex;
  flex-direction: column;
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
}

.presenter-players h2 {
  margin: 0 0 1rem 0;
}

.btn-standings {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 8px;
  color: #4fc3f7;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-standings:hover {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.live-feed {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.player-item {
  padding: 0.5rem;
  background: rgba(79, 195, 247, 0.05);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.player-status {
  font-size: 1.2rem;
}

/* Connection states */
.player-status.status-connected {
  color: #0f0; /* Green */
}

.player-status.status-away {
  color: #ff8c00; /* Orange */
}

.player-status.status-disconnected {
  color: #f00; /* Red */
}

.player-status.status-warning {
  color: #ffd700; /* Yellow/Gold */
  animation: pulse-warning 1.5s ease-in-out infinite;
}

.player-warning-icon {
  font-size: 0.9rem;
  margin-left: 0.25rem;
  color: #ffd700;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.player-answered {
  margin-left: auto;
  color: #0f0;
}

/* Player menu */
.player-menu-container {
  margin-left: auto;
  position: relative;
}

.btn-player-menu {
  background: rgba(79, 195, 247, 0.1);
  color: #4fc3f7;
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-player-menu:hover {
  background: rgba(79, 195, 247, 0.2);
  border-color: #4fc3f7;
}

.player-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(79, 195, 247, 0.15);
}

.menu-item-kick {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-item-kick:hover {
  background: rgba(255, 68, 68, 0.15);
  color: #ff4444;
}

.menu-item-ban:hover {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.menu-icon {
  font-size: 1rem;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 1rem;
}

@media (max-width: 900px) {
  .presenter-players {
    max-height: 50vh;
  }
}

@media (max-width: 600px) {
  .presenter-players {
    padding: 1rem;
  }
}
</style>
