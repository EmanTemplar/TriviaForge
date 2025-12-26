<template>
  <Modal
    :isOpen="isOpen"
    @close="$emit('close')"
    size="large"
    title="📊 Your Progress"
  >
    <template #default>
      <div class="progress-content">
        <!-- Stats Summary -->
        <div v-if="presentedQuestions.length > 0" class="progress-stats">
          <div class="stat-card correct">
            <div class="stat-value">{{ correctCount }}</div>
            <div class="stat-label">Correct</div>
          </div>
          <div class="stat-card incorrect">
            <div class="stat-value">{{ incorrectCount }}</div>
            <div class="stat-label">Incorrect</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ accuracy }}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          <div class="stat-card answered">
            <div class="stat-value">{{ answeredCount }}</div>
            <div class="stat-label">Answered</div>
          </div>
        </div>

        <!-- Question History -->
        <div v-if="presentedQuestions.length > 0" class="question-history">
          <h4>Question History</h4>
          <div
            v-for="(q, idx) in presentedQuestions"
            :key="q.index"
            class="history-item"
            :class="getQuestionStatusClass(q)"
          >
            <div class="history-content">
              <div class="history-question">Q{{ q.index + 1 }}. {{ q.text }}</div>
              <div class="history-answer">
                <strong style="color: #4fc3f7;">Your answer:</strong>
                {{ q.playerChoice !== null ? `${String.fromCharCode(65 + q.playerChoice)}. ${q.choices[q.playerChoice]}` : 'No answer submitted' }}
              </div>
              <div v-if="q.revealed" class="history-correct">
                <strong style="color: #0f0;">Correct answer:</strong>
                {{ `${String.fromCharCode(65 + q.correctChoice)}. ${q.choices[q.correctChoice]}` }}
              </div>
            </div>
            <div class="history-status" :class="getQuestionStatusClass(q)">
              <div class="status-icon">{{ getQuestionStatusIcon(q) }}</div>
              <div class="status-text">{{ getQuestionStatusText(q) }}</div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="progress-empty">
          <div class="empty-icon">📝</div>
          <p>No questions answered yet!</p>
          <p style="font-size: 0.9rem; color: #aaa;">Your progress will appear here once the presenter starts the quiz.</p>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from '@/components/common/Modal.vue';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  questionHistory: { type: Array, required: true }
});

defineEmits(['close']);

// Computed properties for progress statistics
const presentedQuestions = computed(() => props.questionHistory.filter(q => q.presented));
const correctCount = computed(() => presentedQuestions.value.filter(q => q.revealed && q.isCorrect).length);
const incorrectCount = computed(() => presentedQuestions.value.filter(q => q.revealed && !q.isCorrect).length);
const answeredCount = computed(() => presentedQuestions.value.filter(q => q.revealed).length);
const accuracy = computed(() => answeredCount.value > 0 ? ((correctCount.value / answeredCount.value) * 100).toFixed(1) : '0.0');

// Helper functions for question status display
const getQuestionStatusClass = (q) => {
  if (q.missedWhileAway && q.revealed) return 'missed-away';
  if (q.revealed && q.isCorrect) return 'correct';
  if (q.revealed && !q.isCorrect) return 'incorrect';
  if (q.playerChoice !== null) return 'answered';
  return 'unanswered';
};

const getQuestionStatusIcon = (q) => {
  if (q.missedWhileAway && q.revealed) return '⚠';
  if (q.revealed && q.isCorrect) return '✓';
  if (q.revealed && !q.isCorrect) return '✗';
  if (q.playerChoice !== null) return '⏳';
  return '○';
};

const getQuestionStatusText = (q) => {
  if (q.missedWhileAway && q.revealed) return 'Missed - Away';
  if (q.revealed && q.isCorrect) return 'Correct';
  if (q.revealed && !q.isCorrect) return 'Incorrect';
  if (q.playerChoice !== null) return 'Waiting for reveal';
  return 'Not answered';
};
</script>

<style scoped>
.progress-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.stat-card.correct {
  background: rgba(0, 200, 0, 0.1);
  border-color: rgba(0, 200, 0, 0.3);
}

.stat-card.incorrect {
  background: rgba(200, 0, 0, 0.1);
  border-color: rgba(200, 0, 0, 0.3);
}

.stat-card.answered {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4fc3f7;
  margin-bottom: 0.5rem;
}

.stat-card.correct .stat-value {
  color: #0f0;
}

.stat-card.incorrect .stat-value {
  color: #f66;
}

.stat-card.answered .stat-value {
  color: #ffa500;
}

.stat-label {
  font-size: 0.9rem;
  color: #aaa;
}

.question-history h4 {
  margin: 0 0 1rem 0;
  color: #aaa;
  font-size: 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.history-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.history-item.correct {
  background: rgba(0, 200, 0, 0.1);
  border-color: rgba(0, 200, 0, 0.3);
}

.history-item.incorrect {
  background: rgba(200, 0, 0, 0.1);
  border-color: rgba(200, 0, 0, 0.3);
}

.history-item.missed-away {
  background: rgba(150, 150, 150, 0.1);
  border-color: rgba(150, 150, 150, 0.3);
  opacity: 0.7;
}

.history-item.answered {
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
}

.history-content {
  flex: 1;
  text-align: left;
}

.history-question {
  font-weight: bold;
  color: #fff;
  margin-bottom: 0.5rem;
}

.history-answer {
  font-size: 0.85rem;
  color: #aaa;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.history-correct {
  font-size: 0.85rem;
  color: #0f0;
  line-height: 1.4;
}

.history-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.status-icon {
  font-size: 2rem;
  color: #4fc3f7;
}

.history-item.correct .status-icon {
  color: #0f0;
}

.history-item.incorrect .status-icon {
  color: #f66;
}

.history-item.missed-away .status-icon {
  color: #ff8c00;
}

.history-item.answered .status-icon {
  color: #ffa500;
}

.status-text {
  font-size: 0.75rem;
  color: #aaa;
  text-align: center;
}

.progress-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #aaa;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
</style>
