<template>
  <Modal :isOpen="isOpen" size="large" title="📊 Live Standings" @close="$emit('close')">
    <template #default>
      <div class="progress-modal-content">
        <!-- Overall Stats Summary -->
        <div v-if="progressStats" class="overall-stats">
          <div class="stat-card">
            <div class="stat-value">{{ progressStats.totalPlayers }}</div>
            <div class="stat-label">Players</div>
          </div>
          <div class="stat-card correct">
            <div class="stat-value">{{ progressStats.totalCorrect }}</div>
            <div class="stat-label">Total Correct</div>
          </div>
          <div class="stat-card incorrect">
            <div class="stat-value">{{ progressStats.totalIncorrect }}</div>
            <div class="stat-label">Total Incorrect</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ progressStats.overallAccuracy }}%</div>
            <div class="stat-label">Class Accuracy</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-value">{{ progressStats.avgCorrect }}</div>
            <div class="stat-label">Avg per Player</div>
          </div>
        </div>

        <!-- Standings Table -->
        <div v-if="sortedPlayers.length > 0" class="standings-wrapper">
          <h4>Player Standings</h4>
          <table class="standings-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Player</th>
                <th>Correct</th>
                <th>Incorrect</th>
                <th>Accuracy</th>
                <th>Answered</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(player, idx) in sortedPlayers" :key="player.name" :class="['standings-row', getRankClass(idx)]">
                <td class="rank">{{ getMedal(idx) || idx + 1 }}</td>
                <td class="player-name">{{ player.name }}</td>
                <td class="correct">{{ player.correct }}</td>
                <td class="incorrect">{{ player.answered - player.correct }}</td>
                <td class="accuracy">{{ getAccuracy(player) }}%</td>
                <td class="answered">{{ player.answered }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state-standings">
          <div class="empty-icon">📝</div>
          <p>No players have answered yet!</p>
          <p class="empty-hint">Standings will appear here once you present questions and players start answering.</p>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/common/Modal.vue'

defineProps({
  isOpen: { type: Boolean, required: true },
  progressStats: { type: Object, default: null },
  sortedPlayers: { type: Array, default: () => [] }
})

defineEmits(['close'])

// Helper functions
const getAccuracy = (player) => {
  return player.answered > 0 ? ((player.correct / player.answered) * 100).toFixed(1) : '-'
}

const getRankClass = (idx) => {
  if (idx === 0) return 'gold'
  if (idx === 1) return 'silver'
  if (idx === 2) return 'bronze'
  return ''
}

const getMedal = (idx) => {
  if (idx === 0) return '🥇'
  if (idx === 1) return '🥈'
  if (idx === 2) return '🥉'
  return null
}
</script>

<style scoped>
.progress-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.overall-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--info-bg-20);
  border: 1px solid var(--info-bg-30);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-card.correct {
  background: var(--secondary-bg-20);
  border-color: var(--secondary-bg-30);
}

.stat-card.incorrect {
  background: var(--danger-bg-20);
  border-color: var(--danger-bg-30);
}

.stat-card.orange {
  background: var(--warning-bg-20);
  border-color: var(--warning-bg-30);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--info-light);
}

.stat-card.correct .stat-value {
  color: var(--secondary-light);
}

.stat-card.incorrect .stat-value {
  color: var(--danger-light);
}

.stat-card.orange .stat-value {
  color: var(--warning-light);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin-top: 0.5rem;
}

.standings-wrapper {
  margin-top: 1rem;
}

.standings-wrapper h4 {
  color: var(--text-tertiary);
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-overlay-30);
  border-radius: 8px;
  overflow: hidden;
}

.standings-table thead {
  background: var(--bg-overlay-50);
}

.standings-table th {
  text-align: left;
  padding: 1rem 0.5rem;
  color: var(--text-tertiary);
  font-weight: bold;
  border-bottom: 2px solid var(--border-color);
}

.standings-table td {
  padding: 1rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.standings-row {
  transition: background 0.2s;
}

.standings-row:hover {
  background: var(--info-bg-10);
}

.standings-row.gold {
  background: var(--warning-bg-15);
}

.standings-row.silver {
  background: var(--bg-overlay-15);
}

.standings-row.bronze {
  background: var(--warning-bg-15);
}

.standings-table .rank {
  text-align: center;
  color: var(--text-tertiary);
  font-weight: bold;
  width: 40px;
}

.standings-table .player-name {
  font-weight: bold;
  color: var(--text-primary);
}

.standings-table .correct {
  text-align: center;
  color: var(--secondary-light);
  font-weight: bold;
}

.standings-table .incorrect {
  text-align: center;
  color: var(--danger-light);
  font-weight: bold;
}

.standings-table .accuracy {
  text-align: center;
  color: var(--info-light);
  font-weight: bold;
}

.standings-table .answered {
  text-align: center;
  color: var(--warning-light);
  font-weight: bold;
}

.empty-state-standings {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .overall-stats {
    grid-template-columns: 1fr;
  }
}
</style>
