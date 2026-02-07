<template>
  <div class="solo-play-page">
    <!-- Navbar -->
    <nav class="solo-navbar">
      <div class="navbar-brand">
        <AppIcon name="gamepad-2" size="lg" />
        <span class="brand-text">Trivia Forge - Solo Mode</span>
      </div>
      <div class="navbar-actions">
        <router-link to="/player" class="nav-link">
          <AppIcon name="users" size="sm" /> Multiplayer
        </router-link>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="solo-container">
      <!-- Quiz Browser Phase -->
      <div v-if="gamePhase === 'browse'" class="browse-phase">
        <div class="browse-header">
          <h1>Choose a Quiz</h1>
          <p class="subtitle">Practice on your own - no room code needed!</p>
        </div>

        <!-- Player Name Input -->
        <div class="player-name-section">
          <label for="playerName">Your Name</label>
          <input
            id="playerName"
            v-model="playerNameInput"
            type="text"
            placeholder="Enter your display name"
            maxlength="20"
          />
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingQuizzes" class="loading-state">
          <AppIcon name="loader" size="xl" class="spinner" />
          <p>Loading quizzes...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="quizzesError" class="error-state">
          <AppIcon name="alert-triangle" size="xl" />
          <p>{{ quizzesError }}</p>
          <button class="btn-retry" @click="loadQuizzes">Try Again</button>
        </div>

        <!-- Empty State -->
        <div v-else-if="quizzes.length === 0" class="empty-state">
          <AppIcon name="folder-open" size="2xl" />
          <p>No quizzes available for solo play</p>
        </div>

        <!-- Quiz Grid -->
        <div v-else class="quiz-grid">
          <div
            v-for="quiz in quizzes"
            :key="quiz.id"
            class="quiz-card"
            @click="selectQuiz(quiz)"
          >
            <div class="quiz-card-header">
              <AppIcon name="brain" size="lg" class="quiz-icon" />
              <h3>{{ quiz.title }}</h3>
            </div>
            <p v-if="quiz.description" class="quiz-description">{{ quiz.description }}</p>
            <div class="quiz-meta">
              <span><AppIcon name="list" size="xs" /> {{ quiz.question_count }} questions</span>
              <span v-if="quiz.question_timer"><AppIcon name="clock" size="xs" /> {{ quiz.question_timer }}s per question</span>
            </div>
            <button class="btn-start" @click.stop="startSelectedQuiz(quiz)">
              <AppIcon name="play" size="sm" /> Start Quiz
            </button>
          </div>
        </div>
      </div>

      <!-- Playing Phase -->
      <div v-else-if="gamePhase === 'playing'" class="playing-phase">
        <!-- Progress Header -->
        <div class="game-header">
          <div class="quiz-info">
            <h2>{{ quizTitle }}</h2>
            <div class="progress-info">
              Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}
            </div>
          </div>
          <div class="score-display">
            <AppIcon name="trophy" size="sm" />
            Score: {{ score }}/{{ answeredCount }}
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
        </div>

        <!-- Countdown Timer -->
        <CountdownTimer
          v-if="timerStartedAt && !isAnswerRevealed"
          :startedAt="timerStartedAt"
          :duration="questionTimer"
          :active="!isAnswerRevealed"
          @expired="handleTimerExpired"
        />

        <!-- Question Display -->
        <div class="question-area">
          <!-- Question Image -->
          <div v-if="currentQuestion?.imageUrl" class="question-image-container">
            <img :src="currentQuestion.imageUrl" alt="Question image" class="question-image" />
          </div>

          <h3 class="question-text">{{ currentQuestion?.text }}</h3>

          <!-- Answer Choices -->
          <div class="choices-container">
            <button
              v-for="(choice, idx) in currentQuestion?.choices || []"
              :key="idx"
              class="choice-btn"
              :class="{
                selected: selectedAnswer === idx,
                correct: isAnswerRevealed && lastAnswerResult?.correctChoice === idx,
                incorrect: isAnswerRevealed && selectedAnswer === idx && lastAnswerResult?.correctChoice !== idx,
                disabled: isAnswerRevealed || isAnswerSubmitting
              }"
              :disabled="isAnswerRevealed || isAnswerSubmitting"
              @click="selectAnswer(idx)"
            >
              <span class="choice-letter">{{ String.fromCharCode(65 + idx) }}.</span>
              <span class="choice-text">{{ choice }}</span>
            </button>
          </div>

          <!-- Answer Feedback -->
          <div v-if="isAnswerRevealed" class="answer-feedback" :class="{ correct: lastAnswerResult?.isCorrect }">
            <div class="feedback-icon">
              <AppIcon :name="lastAnswerResult?.isCorrect ? 'check-circle' : 'x-circle'" size="xl" />
            </div>
            <div class="feedback-text">
              <strong v-if="lastAnswerResult?.isCorrect">Correct!</strong>
              <strong v-else>Incorrect</strong>
              <p>The correct answer was: <em>{{ lastAnswerResult?.correctAnswerText }}</em></p>
            </div>
          </div>

          <!-- Next Button -->
          <button
            v-if="isAnswerRevealed"
            class="btn-next"
            @click="goToNextQuestion"
          >
            {{ isQuizComplete ? 'See Results' : 'Next Question' }}
            <AppIcon name="arrow-right" size="sm" />
          </button>
        </div>
      </div>

      <!-- Results Phase -->
      <div v-else-if="gamePhase === 'results'" class="results-phase">
        <div v-if="isLoadingResults" class="loading-state">
          <AppIcon name="loader" size="xl" class="spinner" />
          <p>Loading results...</p>
        </div>

        <div v-else-if="results" class="results-content">
          <div class="results-header">
            <h1>Quiz Complete!</h1>
            <h2>{{ results.quizTitle }}</h2>
          </div>

          <!-- Score Summary -->
          <div class="score-summary">
            <div class="score-circle" :class="scoreGrade">
              <span class="score-value">{{ results.percentage }}%</span>
            </div>
            <div class="score-details">
              <p class="score-text">{{ results.correctCount }} of {{ results.totalQuestions }} correct</p>
              <p class="player-name">Player: {{ results.playerName }}</p>
            </div>
          </div>

          <!-- Question Breakdown -->
          <div class="question-breakdown">
            <h3>Question Breakdown</h3>
            <div class="breakdown-list">
              <div
                v-for="(q, idx) in results.questions"
                :key="idx"
                class="breakdown-item"
                :class="{ correct: q.isCorrect, incorrect: q.answered && !q.isCorrect, skipped: !q.answered }"
              >
                <div class="item-number">{{ idx + 1 }}</div>
                <div class="item-content">
                  <p class="item-question">{{ q.text }}</p>
                  <p class="item-answer">
                    <span v-if="!q.answered" class="skipped-label">Not answered</span>
                    <span v-else-if="q.isCorrect" class="correct-label">
                      <AppIcon name="check" size="xs" /> {{ q.selectedAnswer }}
                    </span>
                    <span v-else class="incorrect-label">
                      <AppIcon name="x" size="xs" /> {{ q.selectedAnswer }}
                      <span class="correct-was"> (Correct: {{ q.correctAnswer }})</span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="results-actions">
            <button class="btn-secondary" @click="resetGame">
              <AppIcon name="list" size="sm" /> Choose Another Quiz
            </button>
            <button class="btn-primary" @click="playAgain">
              <AppIcon name="refresh-cw" size="sm" /> Play Again
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSoloGame } from '@/composables/useSoloGame.js'
import AppIcon from '@/components/common/AppIcon.vue'
import CountdownTimer from '@/components/player/CountdownTimer.vue'

const {
  gamePhase,
  quizzes,
  isLoadingQuizzes,
  quizzesError,
  quizTitle,
  totalQuestions,
  questionTimer,
  currentQuestionIndex,
  currentQuestion,
  isAnswerSubmitting,
  isAnswerRevealed,
  lastAnswerResult,
  score,
  answeredCount,
  timerStartedAt,
  results,
  isLoadingResults,
  playerName,
  progressPercent,
  isQuizComplete,
  loadQuizzes,
  startQuiz,
  submitAnswer,
  handleTimerExpired,
  advanceToNextQuestion,
  resetGame,
  playAgain
} = useSoloGame()

const playerNameInput = ref('')
const selectedAnswer = ref(null)

// Score grade for styling
const scoreGrade = computed(() => {
  if (!results.value) return 'grade-c'
  const pct = results.value.percentage
  if (pct >= 90) return 'grade-a'
  if (pct >= 70) return 'grade-b'
  if (pct >= 50) return 'grade-c'
  return 'grade-d'
})

// Load quizzes on mount
onMounted(() => {
  loadQuizzes()
  playerNameInput.value = playerName.value
})

// Select a quiz (just highlight, don't start yet)
function selectQuiz(quiz) {
  // Could add selection state if needed
}

// Start the selected quiz
async function startSelectedQuiz(quiz) {
  if (!playerNameInput.value.trim()) {
    alert('Please enter your name to play')
    return
  }

  try {
    await startQuiz(quiz.id, playerNameInput.value)
    selectedAnswer.value = null
  } catch (error) {
    alert(error.message)
  }
}

// Select an answer
async function selectAnswer(idx) {
  if (isAnswerRevealed.value || isAnswerSubmitting.value) return

  selectedAnswer.value = idx

  try {
    await submitAnswer(idx)
  } catch (error) {
    console.error('Error submitting answer:', error)
    selectedAnswer.value = null
  }
}

// Advance to next question and reset UI state
function goToNextQuestion() {
  selectedAnswer.value = null
  advanceToNextQuestion()
}
</script>

<style scoped>
.solo-play-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.solo-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: var(--bg-overlay-20);
  color: var(--text-primary);
}

/* Container */
.solo-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Browse Phase */
.browse-header {
  text-align: center;
  margin-bottom: 2rem;
}

.browse-header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: var(--text-tertiary);
  font-size: 1.1rem;
}

.player-name-section {
  max-width: 400px;
  margin: 0 auto 2rem;
}

.player-name-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.player-name-section input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-overlay-10);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.player-name-section input:focus {
  outline: none;
  border-color: var(--secondary-light);
}

/* States */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-tertiary);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: var(--info-bg-20);
  color: var(--info-light);
  border: 1px solid var(--info-bg-40);
  border-radius: 6px;
  cursor: pointer;
}

/* Quiz Grid */
.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.quiz-card {
  background: var(--bg-overlay-50);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.quiz-card:hover {
  border-color: var(--secondary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px var(--bg-overlay-30);
}

.quiz-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.quiz-icon {
  color: var(--secondary-light);
}

.quiz-card h3 {
  margin: 0;
  font-size: 1.1rem;
}

.quiz-description {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.quiz-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}

.quiz-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-start {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--secondary-bg-20);
  color: var(--secondary-light);
  border: 1px solid var(--secondary-light);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-start:hover {
  background: var(--secondary-bg-30);
}

/* Playing Phase */
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.quiz-info h2 {
  margin: 0;
  font-size: 1.25rem;
}

.progress-info {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--secondary-light);
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--bg-overlay-20);
  border-radius: 4px;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--secondary-light), var(--info-light));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.question-area {
  background: var(--bg-overlay-50);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  margin-top: 1.5rem;
}

.question-image-container {
  text-align: center;
  margin-bottom: 1.5rem;
}

.question-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

.question-text {
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
}

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--bg-overlay-10);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 1rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}

.choice-btn:hover:not(.disabled) {
  background: var(--bg-overlay-20);
  border-color: var(--secondary-light);
}

.choice-btn.selected {
  background: var(--secondary-bg-20);
  border-color: var(--secondary-light);
}

.choice-btn.correct {
  background: var(--success-bg-20, rgba(34, 197, 94, 0.2));
  border-color: var(--success-light, #22c55e);
}

.choice-btn.incorrect {
  background: var(--danger-bg-20);
  border-color: var(--danger-light);
}

.choice-btn.disabled {
  cursor: default;
  opacity: 0.9;
}

.choice-letter {
  font-weight: 700;
  color: var(--text-tertiary);
}

.choice-text {
  flex: 1;
  color: var(--text-primary);
}

.answer-feedback {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  border-radius: 10px;
}

.answer-feedback.correct {
  background: var(--success-bg-20, rgba(34, 197, 94, 0.2));
  border-color: var(--success-light, #22c55e);
}

.feedback-icon {
  font-size: 2rem;
}

.answer-feedback.correct .feedback-icon {
  color: var(--success-light, #22c55e);
}

.answer-feedback:not(.correct) .feedback-icon {
  color: var(--danger-light);
}

.feedback-text strong {
  font-size: 1.1rem;
}

.feedback-text p {
  margin: 0.25rem 0 0 0;
  color: var(--text-tertiary);
}

.btn-next {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--secondary-bg-20);
  color: var(--secondary-light);
  border: 1px solid var(--secondary-light);
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-next:hover {
  background: var(--secondary-bg-30);
}

/* Results Phase */
.results-content {
  max-width: 700px;
  margin: 0 auto;
}

.results-header {
  text-align: center;
  margin-bottom: 2rem;
}

.results-header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--secondary-light);
}

.results-header h2 {
  font-size: 1.25rem;
  margin: 0;
  color: var(--text-tertiary);
}

.score-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  background: var(--bg-overlay-50);
  border-radius: 16px;
  margin-bottom: 2rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
}

.score-circle.grade-a {
  background: var(--success-bg-20, rgba(34, 197, 94, 0.2));
  border: 3px solid var(--success-light, #22c55e);
  color: var(--success-light, #22c55e);
}

.score-circle.grade-b {
  background: var(--secondary-bg-20);
  border: 3px solid var(--secondary-light);
  color: var(--secondary-light);
}

.score-circle.grade-c {
  background: var(--warning-bg-20);
  border: 3px solid var(--warning-light);
  color: var(--warning-light);
}

.score-circle.grade-d {
  background: var(--danger-bg-20);
  border: 3px solid var(--danger-light);
  color: var(--danger-light);
}

.score-details {
  text-align: left;
}

.score-text {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.player-name {
  color: var(--text-tertiary);
  margin: 0;
}

.question-breakdown {
  background: var(--bg-overlay-50);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.question-breakdown h3 {
  margin: 0 0 1rem 0;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border-radius: 8px;
  border-left: 4px solid var(--border-color);
}

.breakdown-item.correct {
  border-left-color: var(--success-light, #22c55e);
}

.breakdown-item.incorrect {
  border-left-color: var(--danger-light);
}

.breakdown-item.skipped {
  border-left-color: var(--text-tertiary);
}

.item-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay-20);
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 600;
}

.item-content {
  flex: 1;
}

.item-question {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
}

.item-answer {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.correct-label {
  color: var(--success-light, #22c55e);
}

.incorrect-label {
  color: var(--danger-light);
}

.correct-was {
  color: var(--text-tertiary);
}

.skipped-label {
  font-style: italic;
}

.results-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--secondary-bg-20);
  color: var(--secondary-light);
  border: 1px solid var(--secondary-light);
}

.btn-primary:hover {
  background: var(--secondary-bg-30);
}

.btn-secondary {
  background: var(--bg-overlay-20);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-overlay-30);
}

/* Responsive */
@media (max-width: 768px) {
  .solo-navbar {
    padding: 0.75rem 1rem;
  }

  .solo-container {
    padding: 1rem;
  }

  .browse-header h1 {
    font-size: 1.75rem;
  }

  .quiz-grid {
    grid-template-columns: 1fr;
  }

  .game-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .question-area {
    padding: 1.25rem;
  }

  .question-text {
    font-size: 1.25rem;
  }

  .score-summary {
    flex-direction: column;
    gap: 1rem;
  }

  .score-details {
    text-align: center;
  }

  .results-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
