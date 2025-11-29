import { ref, watch } from 'vue'

export function useLocalStorage(key, defaultValue = null) {
  // Initialize from localStorage or use default
  const storedValue = localStorage.getItem(key)
  const data = ref(storedValue ? JSON.parse(storedValue) : defaultValue)

  // Watch for changes and persist
  watch(
    data,
    (newValue) => {
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(newValue))
      }
    },
    { deep: true }
  )

  const setItem = (value) => {
    data.value = value
  }

  const removeItem = () => {
    data.value = null
    localStorage.removeItem(key)
  }

  return {
    data,
    setItem,
    removeItem
  }
}
