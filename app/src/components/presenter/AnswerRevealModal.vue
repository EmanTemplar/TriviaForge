<template>
  <Modal :isOpen="isOpen" size="large" title="Answer Revealed!" @close="$emit('close')">
    <template #default>
      <div v-if="answerRevealData" class="answer-reveal-content">
        <div class="correct-answer-box">
          <div class="label">Correct Answer:</div>
          <div class="answer">{{ answerRevealData.question.choices[answerRevealData.question.correctChoice] }}</div>
        </div>

        <div class="answer-stats">
          <div><strong>{{ answerRevealData.correctCount }}/{{ answerRevealData.answeredCount }}</strong> correct</div>
          <div><strong>{{ answerRevealData.correctPercentage }}%</strong> accuracy</div>
          <div><strong>{{ answerRevealData.totalPlayers - answerRevealData.answeredCount }}</strong> no answer</div>
        </div>

        <div v-if="answerRevealData.results.length > 0" class="player-responses">
          <div class="label">Player Responses:</div>
          <table class="response-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Answer</th>
                <th style="width: 60px;">Result</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="result in answerRevealData.results" :key="result.name" :class="getResultRowClass(result)">
                <td class="player-name">{{ result.name }}</td>
                <td class="answer-text">{{ result.choice !== null ? answerRevealData.question.choices[result.choice] : 'No answer' }}</td>
                <td class="result-icon"><AppIcon v-if="getResultIcon(result)" :name="getResultIcon(result)" size="md" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="dialog-buttons">
        <button @click="$emit('close')" class="btn-primary">Close</button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/common/Modal.vue'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  isOpen: { type: Boolean, required: true },
  answerRevealData: { type: Object, default: null }
})

defineEmits(['close'])

// Helper functions
const getResultIcon = (result) => {
  if (result.is_correct) return 'check'
  if (result.choice !== null) return 'x'
  return null
}

const getResultRowClass = (result) => {
  if (result.is_correct) return 'correct'
  if (result.choice !== null) return 'incorrect'
  return 'no-answer'
}
</script>

<style scoped>
.answer-reveal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.correct-answer-box {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--secondary-bg-20);
  border-radius: 8px;
  border: 1px solid var(--secondary-light);
}

.correct-answer-box .label {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.correct-answer-box .answer {
  font-size: 1.1rem;
  color: var(--secondary-light);
}

.answer-stats {
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: space-around;
  font-size: 0.9rem;
}

.player-responses {
  margin-top: 1.5rem;
}

.player-responses .label {
  font-weight: bold;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.response-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-overlay-30);
  border-radius: 8px;
  overflow: hidden;
}

.response-table thead {
  background: var(--bg-overlay-50);
}

.response-table th {
  text-align: left;
  padding: 0.75rem 0.5rem;
  color: var(--text-tertiary);
  font-weight: bold;
  border-bottom: 2px solid var(--border-color);
}

.response-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.response-table .correct {
  background: var(--secondary-bg-10);
}

.response-table .incorrect {
  background: var(--danger-bg-10);
}

.response-table .no-answer {
  background: var(--bg-overlay-10);
}

.response-table .player-name {
  font-weight: bold;
}

.response-table .answer-text {
  color: var(--text-primary);
}

.response-table .no-answer .answer-text {
  color: var(--text-tertiary);
}

.response-table .result-icon {
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  width: 60px;
}

.response-table .correct .result-icon {
  color: var(--secondary-light);
}

.response-table .incorrect .result-icon {
  color: var(--danger-light);
}

.response-table .no-answer .result-icon {
  color: var(--text-tertiary);
}

.dialog-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--info-bg-40);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--info-light);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--info-bg-60);
}
</style>
