<template>
  <section class="quiz-display">
    <h2>{{ currentQuizTitle || 'No Quiz Loaded' }}</h2>
    <div v-if="currentQuestions.length > 0" class="questions-section">
      <div class="questions-list">
        <div v-for="(question, idx) in currentQuestions" :key="idx"
             class="questionCard"
             :class="{ presented: idx === currentQuestionIndex }"
             @click="$emit('selectQuestion', idx)">
          <div class="question-header">
            <strong>Q{{ idx + 1 }}:</strong> {{ question.text }}
            <div class="status-badges">
              <span v-if="idx === presentedQuestionIndex" class="status-badge live">● LIVE</span>
              <span v-else-if="presentedQuestions.includes(idx)" class="status-badge presented">✓ Presented</span>
              <span v-if="revealedQuestions.includes(idx)" class="status-badge revealed">✓ Revealed</span>
            </div>
          </div>
          <ul>
            <li v-for="(choice, choiceIdx) in question.choices" :key="choiceIdx"
                :style="question.correctChoice === choiceIdx ? { color: '#0f0' } : {}">
              {{ choice }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Presenter Controls -->
      <div class="presenter-controls">
        <div class="presenter-controls-row">
          <button @click="$emit('previousQuestion')">← Previous</button>
          <button @click="$emit('nextQuestion')">Next →</button>
          <button @click="$emit('presentQuestion')">Present Question to Players</button>
          <button @click="$emit('revealAnswer')" :disabled="presentedQuestionIndex === null">Reveal Answer</button>
        </div>
        <button class="btn-complete" @click="$emit('completeQuiz')" :disabled="!currentRoomCode">Complete Quiz & Save Results</button>
      </div>
    </div>
    <div v-else class="empty-state">
      <em>No quiz loaded</em>
    </div>
  </section>
</template>

<script setup>
defineProps({
  currentQuizTitle: { type: String, default: '' },
  currentQuestions: { type: Array, default: () => [] },
  currentQuestionIndex: { type: Number, default: -1 },
  presentedQuestionIndex: { type: Number, default: null },
  presentedQuestions: { type: Array, default: () => [] },
  revealedQuestions: { type: Array, default: () => [] },
  currentRoomCode: { type: String, default: null }
})

defineEmits([
  'selectQuestion',
  'previousQuestion',
  'nextQuestion',
  'presentQuestion',
  'revealAnswer',
  'completeQuiz'
])
</script>

<style scoped>
.quiz-display {
  display: flex;
  flex-direction: column;
  background: rgba(22, 33, 62, 0.5);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
}

.quiz-display h2 {
  margin: 0 0 1rem 0;
}

.questions-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.questionCard {
  background: rgba(79, 195, 247, 0.05);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.questionCard:hover {
  background: rgba(79, 195, 247, 0.15);
}

.questionCard.presented {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.5);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  flex-wrap: wrap;
}

.status-badges {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  align-items: center;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
}

.status-badge.live {
  color: #ff0;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-badge.presented {
  color: #0f0;
}

.status-badge.revealed {
  color: #f00;
}

.questionCard ul {
  list-style-position: inside;
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
  color: #aaa;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: auto;
}

.presenter-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.presenter-controls-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.presenter-controls button,
.btn-complete {
  padding: 0.5rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.4);
  border-radius: 8px;
  color: #4fc3f7;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.presenter-controls button:hover,
.btn-complete:hover {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.presenter-controls button:disabled,
.btn-complete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-complete {
  background: rgba(0, 123, 255, 0.2);
  border-color: rgba(0, 123, 255, 0.4);
}

.btn-complete:hover:not(:disabled) {
  background: rgba(0, 123, 255, 0.3);
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 1rem;
}

@media (max-width: 900px) {
  .quiz-display {
    max-height: 50vh;
  }
}

@media (max-width: 600px) {
  .quiz-display {
    padding: 1rem;
  }

  .presenter-controls-row {
    grid-template-columns: 1fr;
  }
}
</style>
