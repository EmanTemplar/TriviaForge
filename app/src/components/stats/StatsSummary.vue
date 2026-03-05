<template>
  <div class="stats-summary">
    <div class="stat-card">
      <AppIcon name="gamepad-2" size="lg" class="stat-icon" />
      <div class="stat-value">{{ stats.totalGames }}</div>
      <div class="stat-label">Games Played</div>
    </div>
    <div class="stat-card">
      <AppIcon name="target" size="lg" class="stat-icon accuracy" />
      <div class="stat-value">{{ stats.overallAccuracy }}%</div>
      <div class="stat-label">Accuracy</div>
    </div>
    <div class="stat-card">
      <AppIcon name="trophy" size="lg" class="stat-icon best" />
      <div class="stat-value">{{ stats.bestScore }}</div>
      <div class="stat-label">Best Score</div>
    </div>
    <div class="stat-card">
      <AppIcon name="crown" size="lg" class="stat-icon wins" />
      <div class="stat-value">{{ stats.winCount }}</div>
      <div class="stat-label">Wins</div>
    </div>
    <div class="stat-card">
      <AppIcon name="bar-chart-3" size="lg" class="stat-icon rank" />
      <div class="stat-value">{{ stats.avgRank || '-' }}</div>
      <div class="stat-label">Avg Rank</div>
    </div>
    <div class="stat-card">
      <AppIcon name="flame" size="lg" class="stat-icon streak" />
      <div class="stat-value">{{ stats.playStreak }}</div>
      <div class="stat-label">Day Streak</div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      totalGames: 0,
      overallAccuracy: 0,
      bestScore: 0,
      winCount: 0,
      avgRank: null,
      playStreak: 0
    })
  }
})
</script>

<style scoped>
.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--bg-overlay-10);
}

.stat-icon {
  color: var(--info-light);
}

.stat-icon.accuracy {
  color: var(--secondary-light);
}

.stat-icon.best {
  color: #f59e0b;
}

.stat-icon.wins {
  color: #f59e0b;
}

.stat-icon.rank {
  color: var(--accent-primary);
}

.stat-icon.streak {
  color: #ef4444;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
