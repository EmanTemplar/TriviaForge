import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  // State
  const currentPlayer = ref(null)
  const answers = ref([])
  const correctCount = ref(0)
  const incorrectCount = ref(0)
  const answeredCount = ref(0)

  // Computed
  const accuracy = computed(() => {
    if (answeredCount.value === 0) return 0
    return ((correctCount.value / answeredCount.value) * 100).toFixed(1)
  })

  // Actions
  const setPlayer = (player) => {
    currentPlayer.value = player
  }

  const addAnswer = (questionId, answer, isCorrect) => {
    answers.value.push({
      questionId,
      answer,
      isCorrect,
      timestamp: Date.now()
    })

    if (isCorrect) {
      correctCount.value++
    } else {
      incorrectCount.value++
    }
    answeredCount.value++
  }

  const updateAnswer = (questionId, isCorrect) => {
    const existingAnswer = answers.value.find(a => a.questionId === questionId)
    if (existingAnswer) {
      if (existingAnswer.isCorrect !== isCorrect) {
        if (isCorrect) {
          correctCount.value++
          incorrectCount.value--
        } else {
          correctCount.value--
          incorrectCount.value++
        }
        existingAnswer.isCorrect = isCorrect
      }
    }
  }

  const clearPlayer = () => {
    currentPlayer.value = null
    answers.value = []
    correctCount.value = 0
    incorrectCount.value = 0
    answeredCount.value = 0
  }

  return {
    currentPlayer,
    answers,
    correctCount,
    incorrectCount,
    answeredCount,
    accuracy,
    setPlayer,
    addAnswer,
    updateAnswer,
    clearPlayer
  }
})
