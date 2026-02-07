/**
 * TriviaForge - Solo Game Composable
 * Version: v5.4.0
 *
 * Encapsulates solo game state and API calls.
 * All REST-based (no Socket.IO).
 */

import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi.js'

export function useSoloGame() {
  const { get, post } = useApi()

  // Game phase: 'browse' | 'playing' | 'results'
  const gamePhase = ref('browse')

  // Quiz browser state
  const quizzes = ref([])
  const isLoadingQuizzes = ref(false)
  const quizzesError = ref(null)

  // Session state
  const sessionId = ref(null)
  const participantId = ref(null)
  const quizTitle = ref('')
  const totalQuestions = ref(0)
  const questionTimer = ref(30)
  const revealDelay = ref(5)

  // Question state
  const currentQuestionIndex = ref(0)
  const currentQuestion = ref(null)
  const isAnswerSubmitting = ref(false)
  const isAnswerRevealed = ref(false)
  const lastAnswerResult = ref(null) // { isCorrect, correctChoice, correctAnswerText }

  // Score tracking
  const score = ref(0)
  const answeredCount = ref(0)

  // Timer state (for client-side timer)
  const timerStartedAt = ref(null)

  // Results state
  const results = ref(null)
  const isLoadingResults = ref(false)

  // Player name (persisted to localStorage)
  const playerName = ref(localStorage.getItem('soloPlayerName') || '')

  // Computed properties
  const progressPercent = computed(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((answeredCount.value / totalQuestions.value) * 100)
  })

  const isQuizComplete = computed(() => {
    return answeredCount.value >= totalQuestions.value
  })

  /**
   * Load available solo quizzes
   */
  async function loadQuizzes() {
    isLoadingQuizzes.value = true
    quizzesError.value = null

    try {
      const response = await get('/api/solo/quizzes')
      // API returns { success, message, data: [...quizzes] }
      quizzes.value = response.data.data || []
    } catch (error) {
      quizzesError.value = error.response?.data?.error || 'Failed to load quizzes'
      console.error('Error loading solo quizzes:', error)
    } finally {
      isLoadingQuizzes.value = false
    }
  }

  /**
   * Start a new solo game with the selected quiz
   * @param {number} quizId - The quiz ID to play
   * @param {string} name - Player's display name
   */
  async function startQuiz(quizId, name) {
    if (!name.trim()) {
      throw new Error('Player name is required')
    }

    // Save player name
    playerName.value = name.trim()
    localStorage.setItem('soloPlayerName', playerName.value)

    try {
      const response = await post('/api/solo/sessions', {
        quizId,
        playerName: playerName.value
      })

      // API returns { success, message, data: {...session} }
      const data = response.data.data

      // Initialize session state
      sessionId.value = data.sessionId
      participantId.value = data.participantId
      quizTitle.value = data.quizTitle
      totalQuestions.value = data.totalQuestions
      questionTimer.value = data.questionTimer || 30
      revealDelay.value = data.revealDelay || 5

      // Initialize question state
      currentQuestionIndex.value = data.currentQuestionIndex || 0
      currentQuestion.value = data.currentQuestion
      isAnswerRevealed.value = false
      lastAnswerResult.value = null

      // Reset score
      score.value = 0
      answeredCount.value = 0

      // Start timer
      timerStartedAt.value = new Date().toISOString()

      // Switch to playing phase
      gamePhase.value = 'playing'

    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to start quiz')
    }
  }

  /**
   * Submit an answer for the current question
   * @param {number} answerIndex - The index of the selected answer
   */
  async function submitAnswer(answerIndex) {
    if (!sessionId.value || !currentQuestion.value) {
      throw new Error('No active session or question')
    }

    if (isAnswerRevealed.value) {
      throw new Error('Answer already revealed')
    }

    isAnswerSubmitting.value = true

    try {
      const response = await post(`/api/solo/sessions/${sessionId.value}/answer`, {
        questionId: currentQuestion.value.id,
        answerIndex,
        participantId: participantId.value
      })

      // API returns { success, message, data: {...answer result} }
      const data = response.data.data

      // Update answer result
      lastAnswerResult.value = {
        isCorrect: data.isCorrect,
        correctChoice: data.correctChoice,
        correctAnswerText: data.correctAnswerText,
        selectedIndex: answerIndex
      }

      // Update score
      if (data.isCorrect) {
        score.value++
      }
      answeredCount.value++

      // Reveal the answer
      isAnswerRevealed.value = true

      // Store next question info for later
      if (data.hasNextQuestion) {
        // Will be used when advanceToNextQuestion is called
        currentQuestion.value._nextQuestion = data.nextQuestion
        currentQuestion.value._nextQuestionIndex = data.nextQuestionIndex
      }

    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to submit answer')
    } finally {
      isAnswerSubmitting.value = false
    }
  }

  /**
   * Handle timer expiration (no answer submitted)
   */
  async function handleTimerExpired() {
    if (isAnswerRevealed.value) return

    // Submit with null/no answer (treated as wrong)
    await submitAnswer(-1) // -1 indicates no answer
  }

  /**
   * Advance to the next question
   */
  function advanceToNextQuestion() {
    if (!isAnswerRevealed.value) return

    const nextQuestion = currentQuestion.value?._nextQuestion
    const nextIndex = currentQuestion.value?._nextQuestionIndex

    if (nextQuestion) {
      // Move to next question
      currentQuestion.value = nextQuestion
      currentQuestionIndex.value = nextIndex
      isAnswerRevealed.value = false
      lastAnswerResult.value = null
      timerStartedAt.value = new Date().toISOString()
    } else {
      // No more questions - complete the quiz
      completeQuiz()
    }
  }

  /**
   * Complete the quiz and fetch results
   */
  async function completeQuiz() {
    if (!sessionId.value) return

    try {
      await post(`/api/solo/sessions/${sessionId.value}/complete`)

      // Fetch results
      await fetchResults()

      // Switch to results phase
      gamePhase.value = 'results'

    } catch (error) {
      console.error('Error completing quiz:', error)
      // Still switch to results even if completion fails
      gamePhase.value = 'results'
    }
  }

  /**
   * Fetch detailed results for the session
   */
  async function fetchResults() {
    if (!sessionId.value) return

    isLoadingResults.value = true

    try {
      const response = await get(`/api/solo/sessions/${sessionId.value}/results`)
      // API returns { success, message, data: {...results} }
      results.value = response.data.data
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      isLoadingResults.value = false
    }
  }

  /**
   * Reset to the quiz browser
   */
  function resetGame() {
    gamePhase.value = 'browse'
    sessionId.value = null
    participantId.value = null
    quizTitle.value = ''
    totalQuestions.value = 0
    currentQuestionIndex.value = 0
    currentQuestion.value = null
    isAnswerRevealed.value = false
    lastAnswerResult.value = null
    score.value = 0
    answeredCount.value = 0
    results.value = null
    timerStartedAt.value = null
  }

  /**
   * Play the same quiz again
   */
  async function playAgain() {
    const quizId = results.value?.quizId || quizzes.value.find(q => q.title === quizTitle.value)?.id
    if (!quizId) {
      resetGame()
      return
    }

    try {
      await startQuiz(quizId, playerName.value)
    } catch (error) {
      console.error('Error restarting quiz:', error)
      resetGame()
    }
  }

  return {
    // State
    gamePhase,
    quizzes,
    isLoadingQuizzes,
    quizzesError,
    sessionId,
    participantId,
    quizTitle,
    totalQuestions,
    questionTimer,
    revealDelay,
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

    // Computed
    progressPercent,
    isQuizComplete,

    // Methods
    loadQuizzes,
    startQuiz,
    submitAnswer,
    handleTimerExpired,
    advanceToNextQuestion,
    completeQuiz,
    fetchResults,
    resetGame,
    playAgain
  }
}
