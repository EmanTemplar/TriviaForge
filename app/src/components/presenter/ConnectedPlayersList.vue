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
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
}

.presenter-players h2 {
  margin: 0 0 1rem 0;
}

.btn-standings {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--info-light);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-standings:hover {
  background: var(--info-bg-30);
  border-color: var(--info-light);
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
  background: var(--bg-overlay-10);
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
  color: var(--secondary-light);
}

.player-status.status-away {
  color: var(--warning-light);
}

.player-status.status-disconnected {
  color: var(--danger-light);
}

.player-status.status-warning {
  color: var(--warning-light);
  animation: pulse-warning 1.5s ease-in-out infinite;
}

.player-warning-icon {
  font-size: 0.9rem;
  margin-left: 0.25rem;
  color: var(--warning-light);
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.player-answered {
  margin-left: auto;
  color: var(--secondary-light);
}

/* Player menu */
.player-menu-container {
  margin-left: auto;
  position: relative;
}

.btn-player-menu {
  background: var(--info-bg-10);
  color: var(--info-light);
  border: 1px solid var(--info-light);
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-player-menu:hover {
  background: var(--info-bg-20);
  border-color: var(--info-light);
}

.player-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--bg-tertiary);
  border: 1px solid var(--info-light);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
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
  color: var(--text-primary);
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: var(--info-bg-20);
}

.menu-item-kick {
  border-bottom: 1px solid var(--border-color);
}

.menu-item-kick:hover {
  background: var(--danger-bg-20);
  color: var(--danger-light);
}

.menu-item-ban:hover {
  background: var(--warning-bg-20);
  color: var(--warning-light);
}

.menu-icon {
  font-size: 1rem;
}

.empty-state {
  text-align: center;
  color: var(--text-tertiary);
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
