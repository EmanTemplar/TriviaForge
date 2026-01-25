<template>
  <div class="question-display-area">
    <!-- Question Image (if present) -->
    <div v-if="currentQuestion?.imageUrl" class="question-image-container">
      <img
        :src="currentQuestion.imageUrl"
        alt="Question image"
        class="question-image"
        @error="handleImageError"
      />
    </div>

    <h2 class="question-text">{{ currentQuestion?.text }}</h2>

    <!-- True/False Question Layout -->
    <div v-if="isTrueFalse" class="true-false-container">
      <button
        v-for="(choice, idx) in currentQuestion?.choices || []"
        :key="idx"
        class="tf-choice-btn"
        :class="{
          'tf-true': idx === 0,
          'tf-false': idx === 1,
          selected: selectedAnswer === idx,
          correct: idx === currentQuestion?.correctChoice && answerRevealed,
          incorrect: idx === selectedAnswer && selectedAnswer !== currentQuestion?.correctChoice && answerRevealed
        }"
        :disabled="answeredCurrentQuestion || answerRevealed"
        @click="$emit('selectAnswer', idx)"
      >
        <span class="tf-icon">{{ idx === 0 ? '✓' : '✗' }}</span>
        <span class="tf-text">{{ choice }}</span>
      </button>
    </div>

    <!-- Multiple Choice Question Layout -->
    <div v-else class="choices-container">
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
import { computed } from 'vue';

const props = defineProps({
  currentQuestion: { type: Object, default: null },
  selectedAnswer: { type: Number, default: null },
  answerRevealed: { type: Boolean, required: true },
  playerGotCorrect: { type: Boolean, required: true },
  answeredCurrentQuestion: { type: Boolean, required: true }
});

defineEmits(['selectAnswer']);

// Detect True/False questions
const isTrueFalse = computed(() => {
  return props.currentQuestion?.type === 'true_false' ||
    (props.currentQuestion?.choices?.length === 2 &&
     props.currentQuestion?.choices[0]?.toLowerCase() === 'true' &&
     props.currentQuestion?.choices[1]?.toLowerCase() === 'false');
});

// Handle broken image
const handleImageError = (event) => {
  event.target.style.display = 'none';
};
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

/* Question Image Styles */
.question-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-height: 300px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--bg-overlay-10);
}

.question-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
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

/* True/False Question Styles */
.true-false-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.tf-choice-btn {
  padding: 3rem 2rem;
  border: 4px solid var(--border-color);
  border-radius: 20px;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
}

.tf-icon {
  font-size: 3rem;
  line-height: 1;
}

.tf-text {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* True button - green theme */
.tf-choice-btn.tf-true {
  background: var(--secondary-bg-20);
  border-color: var(--secondary-light);
  color: var(--secondary-light);
}

.tf-choice-btn.tf-true:hover:not(:disabled) {
  background: var(--secondary-bg-40);
  border-color: var(--secondary-color);
}

/* False button - red theme */
.tf-choice-btn.tf-false {
  background: var(--danger-bg-20);
  border-color: var(--danger-light);
  color: var(--danger-light);
}

.tf-choice-btn.tf-false:hover:not(:disabled) {
  background: var(--danger-bg-40);
  border-color: var(--danger-color);
}

/* Selected state for True/False */
.tf-choice-btn.selected {
  transform: scale(1.05);
  box-shadow: 0 0 20px var(--info-bg-40);
}

.tf-choice-btn.tf-true.selected {
  background: var(--secondary-bg-50);
  border-color: var(--secondary-color);
}

.tf-choice-btn.tf-false.selected {
  background: var(--danger-bg-50);
  border-color: var(--danger-color);
}

/* Answer revealed states for True/False */
.tf-choice-btn.correct {
  background: var(--secondary-bg-50);
  border-color: var(--secondary-color);
  color: var(--secondary-color);
}

.tf-choice-btn.incorrect {
  background: var(--danger-bg-50);
  border-color: var(--danger-color);
  color: var(--danger-color);
  opacity: 0.7;
}

.tf-choice-btn:disabled {
  cursor: not-allowed;
}

/* Mobile - keep side-by-side for True/False */
@media (max-width: 768px) {
  .true-false-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .tf-choice-btn {
    padding: 2rem 1rem;
  }

  .tf-icon {
    font-size: 2.5rem;
  }

  .tf-text {
    font-size: 1.1rem;
  }
}
</style>
