import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useRoomStore = defineStore('room', () => {
  // State
  const currentRoom = ref(null)
  const roomCode = ref(null)
  const participants = ref([])
  const currentQuestion = ref(null)
  const questionIndex = ref(0)
  const totalQuestions = ref(0)
  const revealedQuestions = ref([])
  const presentedQuestions = ref([])
  const sessionId = ref(null)

  // Computed
  const isRoomActive = computed(() => !!roomCode.value)
  const questionProgress = computed(() => {
    if (totalQuestions.value === 0) return 0
    return ((questionIndex.value + 1) / totalQuestions.value) * 100
  })

  // Actions
  const setRoom = (room, code) => {
    currentRoom.value = room
    roomCode.value = code
  }

  const updateParticipants = (newParticipants) => {
    participants.value = newParticipants
  }

  const setQuestion = (question, index, total) => {
    currentQuestion.value = question
    questionIndex.value = index
    totalQuestions.value = total
  }

  const revealQuestion = (questionId) => {
    if (!revealedQuestions.value.includes(questionId)) {
      revealedQuestions.value.push(questionId)
    }
  }

  const presentQuestion = (questionId) => {
    if (!presentedQuestions.value.includes(questionId)) {
      presentedQuestions.value.push(questionId)
    }
  }

  const clearRoom = () => {
    currentRoom.value = null
    roomCode.value = null
    participants.value = []
    currentQuestion.value = null
    questionIndex.value = 0
    totalQuestions.value = 0
    revealedQuestions.value = []
    presentedQuestions.value = []
    sessionId.value = null
  }

  return {
    currentRoom,
    roomCode,
    participants,
    currentQuestion,
    questionIndex,
    totalQuestions,
    revealedQuestions,
    presentedQuestions,
    sessionId,
    isRoomActive,
    questionProgress,
    setRoom,
    updateParticipants,
    setQuestion,
    revealQuestion,
    presentQuestion,
    clearRoom
  }
})
