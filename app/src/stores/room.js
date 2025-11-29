import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useRoomStore = defineStore('room', () => {
  // State - Room Info
  const currentRoom = ref(null)
  const roomCode = ref(null)
  const sessionId = ref(null)
  const quizTitle = ref('')
  const quizDescription = ref('')
  const totalParticipants = ref(0)

  // State - Game Flow
  const currentQuestion = ref(null)
  const currentQuestionIndex = ref(0)
  const totalQuestions = ref(0)
  const presentedQuestions = ref([]) // Array of question IDs that have been presented
  const revealedQuestions = ref([]) // Array of question IDs that have been revealed
  const gameStarted = ref(false)
  const gameCompleted = ref(false)

  // State - Participants
  const participants = ref([]) // Array of { id, username, score, answered, connected }
  const participantAnswers = ref({}) // { participantId: { questionId: { answerId, isCorrect, timestamp } } }

  // State - Statistics
  const roomStatistics = ref({
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    averageAccuracy: 0
  })

  // Computed
  const isRoomActive = computed(() => !!roomCode.value && !gameCompleted.value)
  const questionProgress = computed(() => {
    if (totalQuestions.value === 0) return 0
    return ((currentQuestionIndex.value + 1) / totalQuestions.value) * 100
  })
  const connectedParticipants = computed(() => {
    return participants.value.filter(p => p.connected).length
  })
  const answersOnCurrentQuestion = computed(() => {
    if (!currentQuestion.value) return 0
    return participants.value.filter(p => {
      const answers = participantAnswers.value[p.id] || {}
      return answers[currentQuestion.value.id] !== undefined
    }).length
  })

  // Actions - Room Management
  const setRoom = (room, code, sessionId_ = null) => {
    currentRoom.value = room
    roomCode.value = code
    if (sessionId_) sessionId.value = sessionId_
    if (room) {
      quizTitle.value = room.title || ''
      quizDescription.value = room.description || ''
    }
  }

  const setQuizMetadata = (title, description, total) => {
    quizTitle.value = title
    quizDescription.value = description
    totalQuestions.value = total
  }

  const startGame = () => {
    gameStarted.value = true
    gameCompleted.value = false
  }

  const completeGame = () => {
    gameCompleted.value = true
  }

  // Actions - Question Management
  const setQuestion = (question, index, total) => {
    currentQuestion.value = question
    currentQuestionIndex.value = index
    totalQuestions.value = total
  }

  const presentQuestion = (questionId) => {
    if (!presentedQuestions.value.includes(questionId)) {
      presentedQuestions.value.push(questionId)
    }
  }

  const revealQuestion = (questionId) => {
    if (!revealedQuestions.value.includes(questionId)) {
      revealedQuestions.value.push(questionId)
    }
  }

  const nextQuestion = () => {
    currentQuestionIndex.value++
  }

  // Actions - Participants
  const updateParticipants = (newParticipants) => {
    participants.value = newParticipants
    totalParticipants.value = newParticipants.length
  }

  const addParticipant = (participant) => {
    if (!participants.value.find(p => p.id === participant.id)) {
      participants.value.push(participant)
      totalParticipants.value++
    }
  }

  const removeParticipant = (participantId) => {
    const index = participants.value.findIndex(p => p.id === participantId)
    if (index !== -1) {
      participants.value.splice(index, 1)
      totalParticipants.value--
    }
  }

  const updateParticipantAnswer = (participantId, questionId, answerId, isCorrect) => {
    if (!participantAnswers.value[participantId]) {
      participantAnswers.value[participantId] = {}
    }
    participantAnswers.value[participantId][questionId] = {
      answerId,
      isCorrect,
      timestamp: Date.now()
    }

    // Update participant score
    const participant = participants.value.find(p => p.id === participantId)
    if (participant) {
      if (isCorrect) {
        participant.score = (participant.score || 0) + 1
      }
      participant.answered = (participant.answered || 0) + 1
    }
  }

  // Actions - Statistics
  const updateRoomStatistics = (stats) => {
    roomStatistics.value = {
      totalAnswered: stats.totalAnswered || 0,
      totalCorrect: stats.totalCorrect || 0,
      totalIncorrect: stats.totalIncorrect || 0,
      averageAccuracy: stats.averageAccuracy || 0
    }
  }

  // Actions - Cleanup
  const clearRoom = () => {
    currentRoom.value = null
    roomCode.value = null
    sessionId.value = null
    quizTitle.value = ''
    quizDescription.value = ''
    participants.value = []
    participantAnswers.value = {}
    currentQuestion.value = null
    currentQuestionIndex.value = 0
    totalQuestions.value = 0
    presentedQuestions.value = []
    revealedQuestions.value = []
    gameStarted.value = false
    gameCompleted.value = false
    totalParticipants.value = 0
    roomStatistics.value = {
      totalAnswered: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      averageAccuracy: 0
    }
  }

  return {
    // State
    currentRoom,
    roomCode,
    sessionId,
    quizTitle,
    quizDescription,
    totalParticipants,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    presentedQuestions,
    revealedQuestions,
    gameStarted,
    gameCompleted,
    participants,
    participantAnswers,
    roomStatistics,

    // Computed
    isRoomActive,
    questionProgress,
    connectedParticipants,
    answersOnCurrentQuestion,

    // Actions
    setRoom,
    setQuizMetadata,
    startGame,
    completeGame,
    setQuestion,
    presentQuestion,
    revealQuestion,
    nextQuestion,
    updateParticipants,
    addParticipant,
    removeParticipant,
    updateParticipantAnswer,
    updateRoomStatistics,
    clearRoom
  }
})
