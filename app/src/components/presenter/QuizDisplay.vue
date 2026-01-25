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
          <!-- Question Image (if present) - with hover to enlarge -->
          <div v-if="question.imageUrl" class="question-image-wrapper" @mouseenter="showImagePreview($event, question.imageUrl)" @mouseleave="hideImagePreview">
            <span class="image-icon" title="Hover to enlarge image">🖼️</span>
            <img :src="question.imageUrl" alt="Question image" class="question-thumbnail" />
          </div>
          <ul>
            <li v-for="(choice, choiceIdx) in question.choices" :key="choiceIdx"
                :class="{ 'correct-choice': question.correctChoice === choiceIdx }">
              {{ choice }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Presenter Controls -->
      <div class="presenter-controls">
        <!-- Progress Indicator (when question is presented) -->
        <div v-if="presentedQuestionIndex !== null" class="answer-progress">
          <div class="progress-text">
            <span class="progress-count">{{ answeredCount }}/{{ totalActivePlayers }} answered</span>
            <span v-if="totalActivePlayers > 0" class="progress-percentage">({{ answerPercentage }}%)</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: `${answerPercentage}%` }"></div>
          </div>
        </div>

        <!-- All Players Answered Notification -->
        <div v-if="allAnswered && presentedQuestionIndex !== null" class="all-answered-notification">
          <div class="notification-content">
            <span class="notification-icon">🎯</span>
            <span class="notification-text">All players have answered!</span>
            <span v-if="autoRevealCountdown !== null" class="countdown-badge">Auto-revealing in {{ autoRevealCountdown }}s</span>
            <button v-if="autoRevealCountdown !== null" @click="$emit('cancelAutoReveal')" class="btn-cancel-auto">Cancel</button>
          </div>
        </div>

        <!-- Auto-Reveal Toggle -->
        <div class="auto-reveal-toggle">
          <label class="toggle-label">
            <input
              type="checkbox"
              :checked="autoRevealEnabled"
              @change="$emit('update:autoRevealEnabled', $event.target.checked)"
            />
            <span class="toggle-text">Auto-reveal when all answers are submitted (3s delay)</span>
          </label>
        </div>

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

    <!-- Image Preview Overlay -->
    <div v-if="previewImage" class="image-preview-overlay" :style="previewPosition">
      <img :src="previewImage" alt="Enlarged question image" />
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

// Image preview state
const previewImage = ref(null)
const previewPosition = ref({})

const showImagePreview = (event, imageUrl) => {
  previewImage.value = imageUrl
  // Position the preview near the mouse but within viewport
  const rect = event.target.getBoundingClientRect()
  previewPosition.value = {
    top: `${Math.min(rect.top, window.innerHeight - 350)}px`,
    left: `${Math.min(rect.right + 10, window.innerWidth - 420)}px`
  }
}

const hideImagePreview = () => {
  previewImage.value = null
}

const props = defineProps({
  currentQuizTitle: { type: String, default: '' },
  currentQuestions: { type: Array, default: () => [] },
  currentQuestionIndex: { type: Number, default: -1 },
  presentedQuestionIndex: { type: Number, default: null },
  presentedQuestions: { type: Array, default: () => [] },
  revealedQuestions: { type: Array, default: () => [] },
  currentRoomCode: { type: String, default: null },
  answeredCount: { type: Number, default: 0 },
  totalActivePlayers: { type: Number, default: 0 },
  allAnswered: { type: Boolean, default: false },
  autoRevealCountdown: { type: Number, default: null },
  autoRevealEnabled: { type: Boolean, default: true }
})

defineEmits([
  'selectQuestion',
  'previousQuestion',
  'nextQuestion',
  'presentQuestion',
  'revealAnswer',
  'completeQuiz',
  'cancelAutoReveal',
  'update:autoRevealEnabled'
])

// Computed: Answer percentage
const answerPercentage = computed(() => {
  if (props.totalActivePlayers === 0) return 0
  return Math.round((props.answeredCount / props.totalActivePlayers) * 100)
})
</script>

<style scoped>
.quiz-display {
  display: flex;
  flex-direction: column;
  background: var(--bg-overlay-50);
  border: 1px solid var(--info-bg-20);
  border-radius: 12px;
  padding: 1.5rem;
  overflow-y: auto;
  box-shadow: var(--shadow-md);
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
  background: var(--info-bg-05);
  border: 1px solid var(--info-bg-20);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.questionCard:hover {
  background: var(--info-bg-15);
}

.questionCard.presented {
  background: var(--info-bg-20);
  border-color: var(--info-light);
}

/* Question Image in Card */
.question-image-wrapper {
  margin: 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.question-image-wrapper:hover {
  background: var(--info-bg-20);
}

.image-icon {
  font-size: 1.2rem;
  opacity: 0.7;
}

.question-image-wrapper:hover .image-icon {
  opacity: 1;
}

.question-thumbnail {
  max-width: 80px;
  max-height: 60px;
  object-fit: contain;
  border-radius: 6px;
  background: var(--bg-overlay-10);
}

/* Image Preview Overlay */
.image-preview-overlay {
  position: fixed;
  z-index: 1000;
  background: var(--bg-overlay-95);
  border: 2px solid var(--info-light);
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: fadeIn 0.15s ease;
}

.image-preview-overlay img {
  max-width: 400px;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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
  background: var(--bg-overlay-30);
  font-weight: bold;
}

.status-badge.live {
  background: var(--warning-bg-30);
  color: var(--warning-light);
  border: 1px solid var(--warning-light);
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
  background: var(--secondary-bg-20);
  color: var(--secondary-light);
  border: 1px solid var(--secondary-light);
}

.status-badge.revealed {
  background: var(--danger-bg-20);
  color: var(--danger-light);
  border: 1px solid var(--danger-light);
}

.questionCard ul {
  list-style-position: inside;
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
  color: var(--text-tertiary);
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: auto;
}

.questionCard ul li.correct-choice {
  color: var(--secondary-light);
}

/* Answer Progress Indicator */
.answer-progress {
  background: var(--bg-overlay-30);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.progress-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.progress-count {
  color: var(--info-light);
}

.progress-percentage {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--bg-overlay-20);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--info-light), var(--secondary-light));
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* All Players Answered Notification */
.all-answered-notification {
  background: var(--secondary-bg-20);
  border: 2px solid var(--secondary-light);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.notification-icon {
  font-size: 1.5rem;
}

.notification-text {
  font-weight: 700;
  color: var(--secondary-light);
  font-size: 1rem;
  flex: 1;
  min-width: 150px;
}

.countdown-badge {
  background: var(--warning-bg-30);
  color: var(--warning-light);
  border: 1px solid var(--warning-light);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  animation: pulse 1s infinite;
}

.btn-cancel-auto {
  background: var(--danger-bg-20);
  color: var(--danger-light);
  border: 1px solid var(--danger-light);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-auto:hover {
  background: var(--danger-bg-30);
}

/* Auto-Reveal Toggle */
.auto-reveal-toggle {
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.toggle-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--secondary-light);
}

.toggle-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
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
  background: var(--info-bg-20);
  border: 1px solid var(--info-bg-40);
  border-radius: 8px;
  color: var(--info-light);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.presenter-controls button:hover,
.btn-complete:hover {
  background: var(--info-bg-30);
  border-color: var(--info-light);
}

.presenter-controls button:disabled,
.btn-complete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-complete {
  background: var(--info-bg-20);
  border-color: var(--info-bg-40);
}

.btn-complete:hover:not(:disabled) {
  background: var(--info-bg-30);
}

.empty-state {
  text-align: center;
  color: var(--text-tertiary);
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
