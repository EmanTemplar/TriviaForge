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
        <strong>{{ String.fromCharCode(65 + idx) }}.</strong> {{ choice }}
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
  color: #fff;
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
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  -ms-hyphens: auto;
  hyphens: auto;
  min-width: 0;
  box-sizing: border-box;
}

.choice-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.choice-btn.selected {
  background: rgba(79, 195, 247, 0.3);
  border-color: rgba(79, 195, 247, 0.6);
}

.choice-btn.correct {
  background: rgba(0, 200, 0, 0.3);
  border-color: #0f0;
}

.choice-btn.incorrect {
  background: rgba(200, 0, 0, 0.3);
  border-color: #f66;
}

.choice-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.answer-feedback {
  padding: 1.5rem;
  border-radius: 10px;
  font-size: 1.1rem;
  text-align: center;
  animation: fadeIn 0.3s ease-in;
}

.answer-feedback.correct {
  background: rgba(0, 200, 0, 0.2);
  color: #0f0;
}

.answer-feedback.incorrect {
  background: rgba(200, 0, 0, 0.2);
  color: #f66;
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
