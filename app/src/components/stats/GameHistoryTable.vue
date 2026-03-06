<template>
  <div class="game-history">
    <div class="history-header">
      <h3><AppIcon name="history" size="sm" /> Game History</h3>
      <div class="filter-group">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: filter === f.value }"
          @click="$emit('changeFilter', f.value)"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="history-loading">
      <AppIcon name="loader" size="xl" class="spinner" />
      <p>Loading game history...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="games.length === 0" class="history-empty">
      <AppIcon name="folder-open" size="2xl" />
      <p>No games played yet. Start playing to see your history!</p>
    </div>

    <!-- Game list -->
    <div v-else class="history-list">
      <!-- Desktop table -->
      <table class="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Quiz</th>
            <th>Score</th>
            <th>Accuracy</th>
            <th>Rank</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="game in games" :key="game.sessionId">
            <td>{{ formatDate(game.playedAt) }}</td>
            <td class="quiz-name">{{ game.quizName }}</td>
            <td>{{ game.correctAnswers }} / {{ game.totalQuestions }}</td>
            <td>
              <span class="accuracy-badge" :class="accuracyClass(game.accuracy)">
                {{ game.accuracy }}%
              </span>
            </td>
            <td>
              <span class="rank-badge">
                <AppIcon v-if="game.rank === 1" name="medal" size="sm" color="#FFD700" />
                <AppIcon v-else-if="game.rank === 2" name="medal" size="sm" color="#C0C0C0" />
                <AppIcon v-else-if="game.rank === 3" name="medal" size="sm" color="#CD7F32" />
                <span v-else>#{{ game.rank }}</span>
                <span v-if="game.totalPlayers > 1" class="rank-total"> / {{ game.totalPlayers }}</span>
              </span>
            </td>
            <td>
              <span class="type-badge" :class="game.sessionType">
                {{ game.sessionType === 'solo' ? 'Solo' : 'Multi' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile cards -->
      <div class="history-cards">
        <div v-for="game in games" :key="'card-' + game.sessionId" class="history-card">
          <div class="card-header">
            <span class="card-quiz">{{ game.quizName }}</span>
            <span class="type-badge" :class="game.sessionType">
              {{ game.sessionType === 'solo' ? 'Solo' : 'Multi' }}
            </span>
          </div>
          <div class="card-stats">
            <div class="card-stat">
              <span class="card-stat-label">Score</span>
              <span class="card-stat-value">{{ game.correctAnswers }} / {{ game.totalQuestions }}</span>
            </div>
            <div class="card-stat">
              <span class="card-stat-label">Accuracy</span>
              <span class="accuracy-badge" :class="accuracyClass(game.accuracy)">{{ game.accuracy }}%</span>
            </div>
            <div class="card-stat">
              <span class="card-stat-label">Rank</span>
              <span class="card-stat-value">
                <AppIcon v-if="game.rank === 1" name="medal" size="sm" color="#FFD700" />
                <AppIcon v-else-if="game.rank === 2" name="medal" size="sm" color="#C0C0C0" />
                <AppIcon v-else-if="game.rank === 3" name="medal" size="sm" color="#CD7F32" />
                <span v-else>#{{ game.rank }}</span>
                <span v-if="game.totalPlayers > 1"> / {{ game.totalPlayers }}</span>
              </span>
            </div>
          </div>
          <div class="card-date">{{ formatDate(game.playedAt) }}</div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="page <= 1"
          @click="$emit('changePage', page - 1)"
        >
          <AppIcon name="chevron-left" size="sm" /> Prev
        </button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button
          class="page-btn"
          :disabled="page >= totalPages"
          @click="$emit('changePage', page + 1)"
        >
          Next <AppIcon name="chevron-right" size="sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  games: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  filter: { type: String, default: 'all' }
})

defineEmits(['changePage', 'changeFilter'])

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Multiplayer', value: 'multiplayer' },
  { label: 'Solo', value: 'solo' }
]

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function accuracyClass(accuracy) {
  if (accuracy >= 80) return 'high'
  if (accuracy >= 50) return 'medium'
  return 'low'
}
</script>

<style scoped>
.game-history {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.history-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.filter-group {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-overlay-10);
  border-radius: 8px;
  padding: 0.2rem;
}

.filter-btn {
  padding: 0.35rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.filter-btn.active {
  background: var(--info-light);
  color: white;
}

.filter-btn:hover:not(.active) {
  background: var(--bg-overlay-10);
}

/* Desktop Table */
.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  text-align: left;
  padding: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
}

.history-table td {
  padding: 0.75rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--bg-overlay-10);
  font-size: 0.9rem;
}

.history-table tbody tr:hover {
  background: var(--bg-overlay-10);
}

.quiz-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Badges */
.accuracy-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.accuracy-badge.high {
  background: var(--secondary-light);
  color: white;
}

.accuracy-badge.medium {
  background: var(--warning-light);
  color: white;
}

.accuracy-badge.low {
  background: var(--danger-light);
  color: white;
}

.type-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.type-badge.solo {
  background: var(--accent-primary, #8b5cf6);
  color: white;
}

.type-badge.multiplayer {
  background: var(--info-light);
  color: white;
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.rank-total {
  color: var(--text-muted);
  font-size: 0.8rem;
}

/* Mobile cards - hidden on desktop */
.history-cards {
  display: none;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 1rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: var(--info-bg-20);
  border-color: var(--info-light);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* Loading / Empty states */
.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
  gap: 0.75rem;
}

.history-loading p,
.history-empty p {
  margin: 0;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .history-table {
    display: none;
  }

  .history-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .history-card {
    background: var(--bg-overlay-10);
    border-radius: 10px;
    padding: 1rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .card-quiz {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .card-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .card-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .card-stat-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .card-stat-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-date {
    text-align: right;
    font-size: 0.75rem;
    color: var(--text-muted);
  }
}
</style>
