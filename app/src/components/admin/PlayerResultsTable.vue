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
            <span v-if="idx === 0" class="medal gold">🥇</span>
            <span v-else-if="idx === 1" class="medal silver">🥈</span>
            <span v-else-if="idx === 2" class="medal bronze">🥉</span>
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
  color: #4fc3f7;
  font-size: 1.1rem;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.results-table thead {
  background: rgba(79, 195, 247, 0.1);
}

.results-table th {
  padding: 0.75rem;
  text-align: left;
  color: #4fc3f7;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.results-table td {
  padding: 0.75rem;
  color: #ccc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.results-table tr:last-child td {
  border-bottom: none;
}

.results-table tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank-cell {
  text-align: center;
}

.medal {
  font-size: 1.2rem;
}

.rank-number {
  color: #aaa;
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
