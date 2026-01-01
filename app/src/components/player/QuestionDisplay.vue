<template>
  <div class="question-display-area">
    <h2 class="question-text">{{ currentQuestion?.text }}</h2>

    <div class="choices-container">
      <button
        v-for="(choice, idx) in currentQuestion?.choices || []"
        :key="idx"
        class="choice-btn"
        :class="{
          selected: selectedAnswer === idx,
          correct: idx === currentQuestion?.correctChoice && answerRevealed,
          incorrect: idx === selectedAnswer && selectedAnswer !== currentQuestion?.correctChoice && answerRevealed
        }"
        :disabled="answeredCurrentQuestion || answerRevealed"
        @click="$emit('selectAnswer', idx)"
      >
        <span class="choice-letter">{{ String.fromCharCode(65 + idx) }}.</span>
        <span class="choice-text">{{ choice }}</span>
      </button>
    </div>

    <div v-if="answerRevealed" class="answer-feedback" :class="{ correct: playerGotCorrect, incorrect: !playerGotCorrect }">
      <span v-if="playerGotCorrect">✓ Correct!</span>
      <span v-else>✗ Incorrect.</span>
      The correct answer was: <strong>{{ currentQuestion?.choices[currentQuestion?.correctChoice] }}</strong>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentQuestion: { type: Object, default: null },
  selectedAnswer: { type: Number, default: null },
  answerRevealed: { type: Boolean, required: true },
  playerGotCorrect: { type: Boolean, required: true },
  answeredCurrentQuestion: { type: Boolean, required: true }
});

defineEmits(['selectAnswer']);
</script>

<style scoped>
.question-display-area {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-sizing: border-box;
}

.question-text {
  text-align: center;
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  margin: 0;
  line-height: 1.3;
  word-wrap: break-word;
  color: var(--text-primary);
}

.choices-container {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.choice-btn {
  padding: 2rem;
  background: var(--bg-overlay-20);
  border: 3px solid var(--border-color);
  border-radius: 15px;
  color: var(--text-primary);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  text-align: left;
}

.choice-btn:hover:not(:disabled) {
  background: var(--bg-overlay-30);
  border-color: var(--border-dark);
}

.choice-btn.selected {
  background: var(--info-bg-30);
  border-color: var(--info-light);
}

.choice-btn.correct {
  background: var(--secondary-bg-30);
  border-color: var(--secondary-light);
}

.choice-btn.incorrect {
  background: var(--danger-bg-30);
  border-color: var(--danger-light);
}

.choice-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Answer choice letter (A. B. C. D.) - never wraps */
.choice-letter {
  font-weight: bold;
  font-size: 1.3rem;
  white-space: nowrap;
  flex-shrink: 0;
  color: var(--text-primary);
}

/* Answer choice text - allows wrapping */
.choice-text {
  flex: 1;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word; /* Breaks long unbroken words (URLs, technical terms) */
  line-height: 1.4;
}

.answer-feedback {
  padding: 1.5rem;
  border-radius: 10px;
  font-size: 1.1rem;
  text-align: center;
  animation: fadeIn 0.3s ease-in;
}

.answer-feedback.correct {
  background: var(--secondary-bg-20);
  color: var(--secondary-light);
}

.answer-feedback.incorrect {
  background: var(--danger-bg-20);
  color: var(--danger-light);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .choices-container {
    grid-template-columns: 1fr;
  }
}
</style>
