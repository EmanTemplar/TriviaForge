import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuestionStore = defineStore('question', () => {
  // State - Question Library (reusable across quizzes)
  const allQuestions = ref([]) // { id, text, type, created_at, updated_at }
  const questionAnswers = ref({}) // { questionId: [{ id, text, is_correct }] }

  // State - Current Question Context
  const currentQuestion = ref(null)
  const currentQuestionIndex = ref(0)

  // Computed
  const questionCount = computed(() => allQuestions.value.length)

  const getAnswersForQuestion = (questionId) => {
    return questionAnswers.value[questionId] || []
  }

  const getCorrectAnswer = (questionId) => {
    const answers = questionAnswers.value[questionId] || []
    return answers.find(a => a.is_correct)
  }

  // Actions - Question Management (Library)
  const setAllQuestions = (questions) => {
    allQuestions.value = questions
  }

  const addQuestion = (question) => {
    allQuestions.value.push(question)
  }

  const updateQuestion = (questionId, updatedData) => {
    const question = allQuestions.value.find(q => q.id === questionId)
    if (question) {
      Object.assign(question, updatedData)
    }
  }

  const deleteQuestion = (questionId) => {
    const index = allQuestions.value.findIndex(q => q.id === questionId)
    if (index !== -1) {
      allQuestions.value.splice(index, 1)
      delete questionAnswers.value[questionId]
    }
  }

  const getQuestion = (questionId) => {
    return allQuestions.value.find(q => q.id === questionId)
  }

  // Actions - Answer Management (tied to questions, not quizzes)
  const setAnswersForQuestion = (questionId, answers) => {
    questionAnswers.value[questionId] = answers
  }

  const addAnswerToQuestion = (questionId, answer) => {
    if (!questionAnswers.value[questionId]) {
      questionAnswers.value[questionId] = []
    }
    questionAnswers.value[questionId].push(answer)
  }

  const updateAnswer = (questionId, answerId, updatedData) => {
    const answers = questionAnswers.value[questionId]
    if (answers) {
      const answer = answers.find(a => a.id === answerId)
      if (answer) {
        Object.assign(answer, updatedData)
      }
    }
  }

  const deleteAnswer = (questionId, answerId) => {
    const answers = questionAnswers.value[questionId]
    if (answers) {
      const index = answers.findIndex(a => a.id === answerId)
      if (index !== -1) {
        answers.splice(index, 1)
      }
    }
  }

  const reorderAnswers = (questionId, fromIndex, toIndex) => {
    const answers = questionAnswers.value[questionId]
    if (answers) {
      const answer = answers.splice(fromIndex, 1)[0]
      answers.splice(toIndex, 0, answer)
    }
  }

  // Actions - Current Context
  const setCurrentQuestion = (question, index = 0) => {
    currentQuestion.value = question
    currentQuestionIndex.value = index
  }

  // Actions - Cleanup
  const clearQuestions = () => {
    allQuestions.value = []
    questionAnswers.value = {}
    currentQuestion.value = null
    currentQuestionIndex.value = 0
  }

  return {
    // State
    allQuestions,
    questionAnswers,
    currentQuestion,
    currentQuestionIndex,

    // Computed
    questionCount,
    getAnswersForQuestion,
    getCorrectAnswer,

    // Actions
    setAllQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestion,
    setAnswersForQuestion,
    addAnswerToQuestion,
    updateAnswer,
    deleteAnswer,
    reorderAnswers,
    setCurrentQuestion,
    clearQuestions
  }
})
