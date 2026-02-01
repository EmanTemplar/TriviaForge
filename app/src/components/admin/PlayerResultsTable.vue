<template>
  <div class="session-results">
    <h4>Player Summary</h4>
    <table class="results-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Correct</th>
          <th>Incorrect</th>
          <th>Accuracy</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(result, idx) in rankedPlayers" :key="idx">
          <td class="rank-cell">
            <AppIcon v-if="idx === 0" name="medal" size="lg" class="medal gold" />
            <AppIcon v-else-if="idx === 1" name="medal" size="lg" class="medal silver" />
            <AppIcon v-else-if="idx === 2" name="medal" size="lg" class="medal bronze" />
            <span v-else class="rank-number">{{ idx + 1 }}</span>
          </td>
          <td>{{ result.name }}</td>
          <td>{{ result.correct }}</td>
          <td>{{ (result.answered || 0) - (result.correct || 0) }}</td>
          <td>{{ getAccuracy(result) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue';

defineProps({
  rankedPlayers: { type: Array, required: true }
});

const getAccuracy = (result) => {
  if (!result.answered || result.answered === 0) return '-';
  return ((result.correct / result.answered) * 100).toFixed(1);
};
</script>

<style scoped>
.session-results {
  margin-top: 1.5rem;
}

.session-results h4 {
  margin: 0 0 1rem 0;
  color: var(--info-light);
  font-size: 1.1rem;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-overlay-10);
  border-radius: 8px;
  overflow: hidden;
}

.results-table thead {
  background: var(--info-bg-10);
}

.results-table th {
  padding: 0.75rem;
  text-align: left;
  color: var(--info-light);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.results-table td {
  padding: 0.75rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--bg-overlay-10);
}

.results-table tr:last-child td {
  border-bottom: none;
}

.results-table tr:hover {
  background: var(--bg-overlay-10);
}

.rank-cell {
  text-align: center;
}

.medal {
  font-size: 1.2rem;
}

.medal.gold {
  color: #FFD700;
}

.medal.silver {
  color: #C0C0C0;
}

.medal.bronze {
  color: #CD7F32;
}

.rank-number {
  color: var(--text-tertiary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .results-table {
    font-size: 0.85rem;
  }

  .results-table th,
  .results-table td {
    padding: 0.5rem;
  }
}
</style>
