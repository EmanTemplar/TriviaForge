import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuizStore = defineStore('quiz', () => {
  // State - Quiz Catalog
  const allQuizzes = ref([]) // { id, title, description, created_at, updated_at, is_active }
  const quizQuestions = ref({}) // { quizId: [questionIds] } - the many-to-many relationship

  // State - Selected Context
  const selectedQuizId = ref(null)
  const editingQuizId = ref(null)

  // Computed
  const selectedQuiz = computed(() => {
    return allQuizzes.value.find(q => q.id === selectedQuizId.value)
  })

  const selectedQuizQuestions = computed(() => {
    if (!selectedQuizId.value) return []
    return quizQuestions.value[selectedQuizId.value] || []
  })

  const quizCount = computed(() => allQuizzes.value.length)

  const activeQuizzes = computed(() => {
    return allQuizzes.value.filter(q => q.is_active !== false)
  })

  const getQuizQuestionsIds = (quizId) => {
    return quizQuestions.value[quizId] || []
  }

  const getQuizQuestionCount = (quizId) => {
    return (quizQuestions.value[quizId] || []).length
  }

  // Actions - Quiz Catalog Management
  const setAllQuizzes = (quizzes) => {
    allQuizzes.value = quizzes
  }

  const addQuiz = (quiz) => {
    allQuizzes.value.push(quiz)
    quizQuestions.value[quiz.id] = []
  }

  const updateQuiz = (quizId, updatedData) => {
    const quiz = allQuizzes.value.find(q => q.id === quizId)
    if (quiz) {
      Object.assign(quiz, updatedData)
    }
  }

  const deleteQuiz = (quizId) => {
    const index = allQuizzes.value.findIndex(q => q.id === quizId)
    if (index !== -1) {
      allQuizzes.value.splice(index, 1)
      delete quizQuestions.value[quizId]

      if (selectedQuizId.value === quizId) {
        selectedQuizId.value = null
      }
      if (editingQuizId.value === quizId) {
        editingQuizId.value = null
      }
    }
  }

  const getQuiz = (quizId) => {
    return allQuizzes.value.find(q => q.id === quizId)
  }

  // Actions - Quiz Selection
  const selectQuiz = (quizId) => {
    selectedQuizId.value = quizId
  }

  const setEditingQuiz = (quizId) => {
    editingQuizId.value = quizId
  }

  // Actions - Quiz-Question Relationship Management (many-to-many)
  const setQuizQuestions = (quizId, questionIds) => {
    quizQuestions.value[quizId] = questionIds
  }

  const addQuestionToQuiz = (quizId, questionId) => {
    if (!quizQuestions.value[quizId]) {
      quizQuestions.value[quizId] = []
    }
    if (!quizQuestions.value[quizId].includes(questionId)) {
      quizQuestions.value[quizId].push(questionId)
    }
  }

  const removeQuestionFromQuiz = (quizId, questionId) => {
    const questions = quizQuestions.value[quizId]
    if (questions) {
      const index = questions.indexOf(questionId)
      if (index !== -1) {
        questions.splice(index, 1)
      }
    }
  }

  const reorderQuizQuestions = (quizId, fromIndex, toIndex) => {
    const questions = quizQuestions.value[quizId]
    if (questions) {
      const questionId = questions.splice(fromIndex, 1)[0]
      questions.splice(toIndex, 0, questionId)
    }
  }

  const moveQuestionInQuiz = (quizId, questionId, direction) => {
    const questions = quizQuestions.value[quizId]
    if (!questions) return

    const currentIndex = questions.indexOf(questionId)
    if (currentIndex === -1) return

    if (direction === 'up' && currentIndex > 0) {
      reorderQuizQuestions(quizId, currentIndex, currentIndex - 1)
    } else if (direction === 'down' && currentIndex < questions.length - 1) {
      reorderQuizQuestions(quizId, currentIndex, currentIndex + 1)
    }
  }

  // Actions - Cleanup
  const clearSelectedQuiz = () => {
    selectedQuizId.value = null
    editingQuizId.value = null
  }

  const clearAllQuizzes = () => {
    allQuizzes.value = []
    quizQuestions.value = {}
    clearSelectedQuiz()
  }

  return {
    // State
    allQuizzes,
    quizQuestions,
    selectedQuizId,
    editingQuizId,

    // Computed
    selectedQuiz,
    selectedQuizQuestions,
    quizCount,
    activeQuizzes,
    getQuizQuestionsIds,
    getQuizQuestionCount,

    // Actions
    setAllQuizzes,
    addQuiz,
    updateQuiz,
    deleteQuiz,
    getQuiz,
    selectQuiz,
    setEditingQuiz,
    setQuizQuestions,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
    reorderQuizQuestions,
    moveQuestionInQuiz,
    clearSelectedQuiz,
    clearAllQuizzes
  }
})
