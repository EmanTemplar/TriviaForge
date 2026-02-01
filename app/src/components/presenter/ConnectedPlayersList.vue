<template>
  <section class="presenter-players">
    <!-- Player Count Summary -->
    <div class="player-summary">
      <div class="summary-counts">
        <span class="count-item count-connected" title="Connected players">
          <AppIcon name="check-circle" size="md" class="count-icon" />
          <span class="count-number">{{ connectedPlayers.length }}</span>
        </span>
        <span class="count-separator">•</span>
        <span class="count-item count-away" title="Away players">
          <AppIcon name="alert-triangle" size="md" class="count-icon" />
          <span class="count-number">{{ awayPlayers.length }}</span>
        </span>
        <span class="count-separator">•</span>
        <span class="count-item count-disconnected" title="Disconnected players">
          <AppIcon name="x-circle" size="md" class="count-icon" />
          <span class="count-number">{{ disconnectedPlayers.length }}</span>
        </span>
      </div>
    </div>

    <button v-if="currentRoomCode" class="btn-standings" @click="$emit('showPresenterProgress')"><AppIcon name="bar-chart-3" size="sm" /> Standings</button>

    <div class="live-feed">
      <div v-if="nonSpectatorPlayers.length === 0" class="empty-state"><em>No players yet</em></div>

      <!-- Connected Players Group -->
      <div v-if="connectedPlayers.length > 0" class="player-group">
        <div class="group-header" @click="toggleGroup('connected')">
          <AppIcon :name="groupCollapsed.connected ? 'chevron-right' : 'chevron-down'" size="sm" class="group-icon" />
          <span class="group-title"><AppIcon name="check-circle" size="sm" /> Connected ({{ connectedPlayers.length }})</span>
        </div>
        <div v-if="!groupCollapsed.connected" class="group-content">
          <div v-for="player in connectedPlayers" :key="player.name" class="player-item">
            <span class="player-status" :class="getConnectionStateClass(player)">{{ getConnectionSymbol(player) }}</span>
            {{ player.name }}
            <AppIcon v-if="player.connectionState === 'warning'" name="alert-triangle" size="sm" class="player-warning-icon" title="Rapid switching detected" />
            <AppIcon v-if="player.choice !== null" name="check" size="sm" class="player-answered" />
            <div class="player-menu-container">
              <button class="btn-player-menu" @click="togglePlayerMenu(player.name)" title="Player actions">⋮</button>
              <div v-if="playerMenuOpen === player.name" class="player-menu">
                <button @click="$emit('kickPlayer', player.name)" class="menu-item menu-item-kick">
                  <AppIcon name="user-x" size="md" class="menu-icon" /> Kick Player
                </button>
                <button @click="$emit('banDisplayName', player.name)" class="menu-item menu-item-ban">
                  <AppIcon name="ban" size="md" class="menu-icon" /> Ban Display Name
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Away Players Group -->
      <div v-if="awayPlayers.length > 0" class="player-group">
        <div class="group-header" @click="toggleGroup('away')">
          <AppIcon :name="groupCollapsed.away ? 'chevron-right' : 'chevron-down'" size="sm" class="group-icon" />
          <span class="group-title"><AppIcon name="alert-triangle" size="sm" /> Away ({{ awayPlayers.length }})</span>
        </div>
        <div v-if="!groupCollapsed.away" class="group-content">
          <div v-for="player in awayPlayers" :key="player.name" class="player-item">
            <span class="player-status" :class="getConnectionStateClass(player)">{{ getConnectionSymbol(player) }}</span>
            {{ player.name }}
            <AppIcon v-if="player.connectionState === 'warning'" name="alert-triangle" size="sm" class="player-warning-icon" title="Rapid switching detected" />
            <AppIcon v-if="player.choice !== null" name="check" size="sm" class="player-answered" />
            <div class="player-menu-container">
              <button class="btn-player-menu" @click="togglePlayerMenu(player.name)" title="Player actions">⋮</button>
              <div v-if="playerMenuOpen === player.name" class="player-menu">
                <button @click="$emit('kickPlayer', player.name)" class="menu-item menu-item-kick">
                  <AppIcon name="user-x" size="md" class="menu-icon" /> Kick Player
                </button>
                <button @click="$emit('banDisplayName', player.name)" class="menu-item menu-item-ban">
                  <AppIcon name="ban" size="md" class="menu-icon" /> Ban Display Name
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Disconnected Players Group -->
      <div v-if="disconnectedPlayers.length > 0" class="player-group">
        <div class="group-header" @click="toggleGroup('disconnected')">
          <AppIcon :name="groupCollapsed.disconnected ? 'chevron-right' : 'chevron-down'" size="sm" class="group-icon" />
          <span class="group-title"><AppIcon name="x-circle" size="sm" /> Disconnected ({{ disconnectedPlayers.length }})</span>
        </div>
        <div v-if="!groupCollapsed.disconnected" class="group-content">
          <div v-for="player in disconnectedPlayers" :key="player.name" class="player-item">
            <span class="player-status" :class="getConnectionStateClass(player)">{{ getConnectionSymbol(player) }}</span>
            {{ player.name }}
            <AppIcon v-if="player.connectionState === 'warning'" name="alert-triangle" size="sm" class="player-warning-icon" title="Rapid switching detected" />
            <AppIcon v-if="player.choice !== null" name="check" size="sm" class="player-answered" />
            <div class="player-menu-container">
              <button class="btn-player-menu" @click="togglePlayerMenu(player.name)" title="Player actions">⋮</button>
              <div v-if="playerMenuOpen === player.name" class="player-menu">
                <button @click="$emit('kickPlayer', player.name)" class="menu-item menu-item-kick">
                  <AppIcon name="user-x" size="md" class="menu-icon" /> Kick Player
                </button>
                <button @click="$emit('banDisplayName', player.name)" class="menu-item menu-item-ban">
                  <AppIcon name="ban" size="md" class="menu-icon" /> Ban Display Name
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  nonSpectatorPlayers: { type: Array, default: () => [] },
  currentRoomCode: { type: String, default: null }
})

defineEmits(['showPresenterProgress', 'kickPlayer', 'banDisplayName'])

const playerMenuOpen = ref(null)

// Group collapse state (disconnected starts collapsed)
const groupCollapsed = ref({
  connected: false,
  away: false,
  disconnected: true
})

// Computed properties to group and sort players
const connectedPlayers = computed(() => {
  return props.nonSpectatorPlayers
    .filter(p => (p.connectionState || 'connected') === 'connected' || (p.connectionState || 'connected') === 'warning')
    .sort((a, b) => a.name.localeCompare(b.name))
})

const awayPlayers = computed(() => {
  return props.nonSpectatorPlayers
    .filter(p => (p.connectionState || 'connected') === 'away')
    .sort((a, b) => a.name.localeCompare(b.name))
})

const disconnectedPlayers = computed(() => {
  return props.nonSpectatorPlayers
    .filter(p => (p.connectionState || 'connected') === 'disconnected')
    .sort((a, b) => a.name.localeCompare(b.name))
})

const togglePlayerMenu = (playerName) => {
  playerMenuOpen.value = playerMenuOpen.value === playerName ? null : playerName
}

const toggleGroup = (groupName) => {
  groupCollapsed.value[groupName] = !groupCollapsed.value[groupName]
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
    case 'warning': return '!' // Yellow warning
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

/* Player Count Summary */
.player-summary {
  margin-bottom: 1rem;
}

.summary-counts {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: nowrap;
  font-size: 1rem;
  font-weight: 600;
}

.count-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}

.count-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.count-number {
  font-size: 1rem;
  font-weight: 700;
}

.count-connected .count-number {
  color: var(--secondary-light);
}

.count-away .count-number {
  color: var(--warning-light);
}

.count-disconnected .count-number {
  color: var(--danger-light);
}

.count-separator {
  color: var(--text-tertiary);
  font-size: 0.9rem;
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
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
}

/* Player Groups */
.player-group {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-overlay-10);
  position: relative;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-overlay-20);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.2s ease;
  border-radius: 6px 6px 0 0;
}

.group-header:hover {
  background: var(--bg-overlay-30);
}

.group-icon {
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 12px;
}

.group-title {
  flex: 1;
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  overflow: visible;
  position: relative;
}

.player-item {
  padding: 0.5rem;
  background: var(--bg-overlay-10);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  position: relative;
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
  z-index: 9999;
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
