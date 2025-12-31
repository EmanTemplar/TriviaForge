<template>
  <div class="players-list-container">
    <h3>Players in Room</h3>
    <div class="players-list">
      <div v-for="(player, idx) in nonSpectatorPlayers" :key="player.id" class="player-item">
        <span class="player-number">{{ idx + 1 }}.</span>
        <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
        <span class="player-name">{{ player.name }}</span>
        <span v-if="player.choice !== null" class="player-answer">✓</span>
      </div>
      <em v-if="nonSpectatorPlayers.length === 0">Not in a room yet</em>
    </div>
  </div>
</template>

<script setup>
defineProps({
  nonSpectatorPlayers: { type: Array, required: true }
});
</script>

<style scoped>
.players-list-container h3 {
  margin: 0 0 1rem 0;
  color: var(--info-light);
  font-size: 1.1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.player-number {
  color: var(--text-tertiary);
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

.player-name {
  flex: 1;
}

.player-answer {
  color: var(--secondary-light);
}
</style>
