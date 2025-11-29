import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // State
  const modals = ref({
    // Modal visibility states
    showProgressModal: false,
    showStandingsModal: false,
    showConfirmModal: false,
    showAnswerRevealModal: false,
    showErrorModal: false,
    showSuccessModal: false
  })

  const notifications = ref([])
  const currentTab = ref('quizzes') // For admin panel tabs
  const loading = ref(false)
  const error = ref(null)

  // Actions
  const toggleModal = (modalName) => {
    if (modalName in modals.value) {
      modals.value[modalName] = !modals.value[modalName]
    }
  }

  const openModal = (modalName) => {
    if (modalName in modals.value) {
      modals.value[modalName] = true
    }
  }

  const closeModal = (modalName) => {
    if (modalName in modals.value) {
      modals.value[modalName] = false
    }
  }

  const closeAllModals = () => {
    Object.keys(modals.value).forEach(key => {
      modals.value[key] = false
    })
  }

  const addNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    const notification = { id, message, type }
    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  const setTab = (tabName) => {
    currentTab.value = tabName
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
  }

  const setError = (errorMessage) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  return {
    modals,
    notifications,
    currentTab,
    loading,
    error,
    toggleModal,
    openModal,
    closeModal,
    closeAllModals,
    addNotification,
    removeNotification,
    setTab,
    setLoading,
    setError,
    clearError
  }
})
