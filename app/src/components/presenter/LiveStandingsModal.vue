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

        <!-- Question Breakdown (with images and player responses) -->
        <div v-if="questions.length > 0" class="question-breakdown">
          <h4>Question Breakdown</h4>
          <div v-for="(question, qIdx) in questions" :key="qIdx" class="question-detail">
            <div class="question-header-detail">
              <div class="question-number-badge">Q{{ qIdx + 1 }}</div>
              <div class="question-status-badges">
                <span v-if="presentedQuestions.includes(qIdx)" class="status-badge presented">Presented</span>
                <span v-if="revealedQuestions.includes(qIdx)" class="status-badge revealed">Revealed</span>
              </div>
            </div>
            <div class="question-text-detail">{{ question.text }}</div>

            <!-- Question Image -->
            <div v-if="question.imageUrl" class="question-image-detail">
              <img :src="question.imageUrl" alt="Question image" @error="handleImageError" />
            </div>

            <!-- Answer Choices -->
            <div class="question-choices">
              <div
                v-for="(choice, cIdx) in question.choices"
                :key="cIdx"
                :class="['choice-item', { 'choice-correct': cIdx === question.correctChoice && revealedQuestions.includes(qIdx) }]"
              >
                <strong>{{ String.fromCharCode(65 + cIdx) }}.</strong> {{ choice }}
                <span v-if="cIdx === question.correctChoice && revealedQuestions.includes(qIdx)" class="correct-indicator">✓ Correct</span>
              </div>
            </div>

            <!-- Player Responses (expandable) -->
            <div v-if="presentedQuestions.includes(qIdx)" class="player-answers">
              <div class="player-answers-header" @click="toggleQuestion(qIdx)">
                <strong>Player Responses ({{ getAnswerCount(qIdx) }}/{{ sortedPlayers.length }})</strong>
                <span class="toggle-arrow" :class="{ expanded: expandedQuestions.has(qIdx) }">▼</span>
              </div>
              <div v-if="expandedQuestions.has(qIdx)" class="player-responses-grid">
                <div
                  v-for="player in sortedPlayers"
                  :key="player.name"
                  :class="['player-response', getResponseClass(player, qIdx, question.correctChoice)]"
                >
                  <span class="player-name">{{ player.name }}:</span>
                  <span class="player-answer">
                    <template v-if="player.answers && player.answers[qIdx] !== undefined">
                      {{ String.fromCharCode(65 + player.answers[qIdx]) }}
                      <template v-if="revealedQuestions.includes(qIdx)">
                        <span v-if="player.answers[qIdx] === question.correctChoice" class="answer-result correct">✓</span>
                        <span v-else class="answer-result incorrect">✗</span>
                      </template>
                    </template>
                    <template v-else>
                      <em class="no-answer">No answer</em>
                    </template>
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="not-presented">
              <em>Question not yet presented</em>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref } from 'vue'
import Modal from '@/components/common/Modal.vue'

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  progressStats: { type: Object, default: null },
  sortedPlayers: { type: Array, default: () => [] },
  questions: { type: Array, default: () => [] },
  revealedQuestions: { type: Array, default: () => [] },
  presentedQuestions: { type: Array, default: () => [] }
})

defineEmits(['close'])

// Expanded questions state (local to modal)
const expandedQuestions = ref(new Set())

// Toggle expanded state for a question
const toggleQuestion = (qIdx) => {
  if (expandedQuestions.value.has(qIdx)) {
    expandedQuestions.value.delete(qIdx)
  } else {
    expandedQuestions.value.add(qIdx)
  }
  // Force reactivity update
  expandedQuestions.value = new Set(expandedQuestions.value)
}

// Get count of players who answered a question
const getAnswerCount = (qIdx) => {
  return props.sortedPlayers.filter(p => p.answers && p.answers[qIdx] !== undefined).length
}

// Get response class for player answer
const getResponseClass = (player, qIdx, correctChoice) => {
  if (!player.answers || player.answers[qIdx] === undefined) {
    return 'response-unanswered'
  }
  // Only show correct/incorrect if the question has been revealed
  if (props.revealedQuestions.includes(qIdx)) {
    return player.answers[qIdx] === correctChoice ? 'response-correct' : 'response-incorrect'
  }
  return 'response-answered'
}

// Handle broken images
const handleImageError = (event) => {
  event.target.style.display = 'none'
}

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

/* Question Breakdown Section */
.question-breakdown {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.question-breakdown h4 {
  margin: 0 0 1rem 0;
  color: var(--info-light);
  font-size: 1.1rem;
}

.question-detail {
  margin-bottom: 1.5rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.question-header-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.question-number-badge {
  font-weight: bold;
  color: var(--info-light);
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  background: var(--info-bg-20);
  border-radius: 4px;
}

.question-status-badges {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.status-badge.presented {
  background: var(--warning-bg-20);
  color: var(--warning-light);
}

.status-badge.revealed {
  background: var(--secondary-bg-20);
  color: var(--secondary-light);
}

.question-text-detail {
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.5;
}

.question-image-detail {
  margin: 0.75rem 0;
  display: flex;
  justify-content: center;
}

.question-image-detail img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-overlay-10);
}

.question-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.choice-item {
  padding: 0.5rem 0.75rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.choice-item.choice-correct {
  background: var(--secondary-bg-10);
  border-color: var(--secondary-light);
  color: var(--secondary-light);
}

.choice-item strong {
  margin-right: 0.5rem;
}

.correct-indicator {
  color: var(--secondary-light);
  font-weight: bold;
}

.player-answers {
  margin-top: 1rem;
}

.player-answers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--info-bg-10);
  border: 1px solid var(--info-light);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--info-light);
  font-weight: 500;
}

.player-answers-header:hover {
  background: var(--info-bg-20);
}

.toggle-arrow {
  transition: transform 0.2s;
  color: var(--info-light);
}

.toggle-arrow.expanded {
  transform: rotate(180deg);
}

.player-responses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-overlay-30);
  border-radius: 6px;
}

.player-response {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.player-response.response-correct {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
}

.player-response.response-incorrect {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
}

.player-response.response-unanswered {
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
}

.player-response.response-answered {
  background: var(--warning-bg-10);
  border: 1px solid var(--warning-light);
}

.player-name {
  color: var(--text-secondary);
  font-weight: 500;
}

.player-answer {
  color: var(--text-primary);
  font-weight: bold;
}

.answer-result {
  margin-left: 0.25rem;
}

.answer-result.correct {
  color: var(--secondary-light);
}

.answer-result.incorrect {
  color: var(--danger-light);
}

.no-answer {
  color: var(--text-tertiary);
  font-weight: normal;
}

.not-presented {
  padding: 1rem;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg-overlay-10);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  font-style: italic;
}

@media (max-width: 768px) {
  .overall-stats {
    grid-template-columns: 1fr;
  }

  .player-responses-grid {
    grid-template-columns: 1fr;
  }
}
</style>
