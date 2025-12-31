/**
 * Theme Management Composable
 * Handles theme switching between Light, Dark, Grey, and System themes
 * Persists theme preference to localStorage and database (for registered users)
 */

import { ref, watch, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  GREY: 'grey',
  SYSTEM: 'system'
}

// Default themes per page type
export const PAGE_THEMES = {
  ADMIN: THEMES.DARK,      // AdminPage uses dark blue theme
  PRESENTER: THEMES.DARK,  // PresenterPage uses dark blue theme
  PLAYER: THEMES.GREY,     // PlayerPage uses grey theme
  DISPLAY: THEMES.GREY,    // DisplayPage uses grey theme
  LOGIN: THEMES.DARK       // LoginPage uses dark theme
}

// Global theme state (shared across all components)
const currentTheme = ref(THEMES.DARK)
const isThemeLoaded = ref(false)

export function useTheme(pageType = null) {
  const authStore = useAuthStore()

  /**
   * Apply theme to document root
   * @param {string} theme - Theme name (light/dark/grey/system)
   */
  const applyTheme = (theme) => {
    // Remove all theme data attributes
    document.documentElement.removeAttribute('data-theme')

    // Apply new theme
    if (theme && theme !== THEMES.DARK) {
      // Dark is default in CSS, so only set attribute for non-dark themes
      document.documentElement.setAttribute('data-theme', theme)
    }

    currentTheme.value = theme
  }

  /**
   * Get theme from localStorage
   * @returns {string|null} Theme name or null
   */
  const getStoredTheme = () => {
    try {
      return localStorage.getItem('trivia_theme')
    } catch (e) {
      console.warn('[THEME] localStorage not available:', e)
      return null
    }
  }

  /**
   * Save theme to localStorage
   * @param {string} theme - Theme name
   */
  const saveThemeToStorage = (theme) => {
    try {
      localStorage.setItem('trivia_theme', theme)
    } catch (e) {
      console.warn('[THEME] Failed to save theme to localStorage:', e)
    }
  }

  /**
   * Save theme to database (for registered users)
   * @param {string} theme - Theme name
   */
  const saveThemeToDatabase = async (theme) => {
    if (!authStore.isAuthenticated || authStore.accountType === 'guest') {
      // Only save to database for registered users
      return
    }

    try {
      const response = await fetch('/api/user/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({ theme })
      })

      if (!response.ok) {
        console.warn('[THEME] Failed to save theme to database:', response.statusText)
      }
    } catch (error) {
      console.warn('[THEME] Error saving theme to database:', error)
    }
  }

  /**
   * Load theme from database (for registered users)
   * @returns {Promise<string|null>} Theme name or null
   */
  const loadThemeFromDatabase = async () => {
    if (!authStore.isAuthenticated || authStore.accountType === 'guest') {
      return null
    }

    try {
      const response = await fetch('/api/user/theme', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.theme || null
      }
    } catch (error) {
      console.warn('[THEME] Error loading theme from database:', error)
    }

    return null
  }

  /**
   * Set theme and persist to storage/database
   * @param {string} theme - Theme name (light/dark/grey/system)
   */
  const setTheme = (theme) => {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn(`[THEME] Invalid theme: ${theme}, falling back to dark`)
      theme = THEMES.DARK
    }

    applyTheme(theme)
    saveThemeToStorage(theme)
    saveThemeToDatabase(theme) // Fire and forget
  }

  /**
   * Initialize theme on mount
   * Priority: Database (registered users) > localStorage > Page default > Dark
   */
  const initTheme = async () => {
    if (isThemeLoaded.value) {
      // Theme already loaded, just apply current theme
      applyTheme(currentTheme.value)
      return
    }

    let theme = null

    // 1. Try to load from database (registered users only)
    theme = await loadThemeFromDatabase()

    // 2. Fall back to localStorage
    if (!theme) {
      theme = getStoredTheme()
    }

    // 3. Fall back to page-specific default
    if (!theme && pageType && PAGE_THEMES[pageType]) {
      theme = PAGE_THEMES[pageType]
    }

    // 4. Final fallback to dark theme
    if (!theme) {
      theme = THEMES.DARK
    }

    applyTheme(theme)
    isThemeLoaded.value = true
  }

  /**
   * Toggle between light and dark themes
   * (Useful for simple toggle buttons)
   */
  const toggleTheme = () => {
    const newTheme = currentTheme.value === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT
    setTheme(newTheme)
  }

  /**
   * Get current theme value
   * @returns {string} Current theme name
   */
  const getTheme = () => {
    return currentTheme.value
  }

  /**
   * Check if a specific theme is active
   * @param {string} theme - Theme to check
   * @returns {boolean} True if theme is active
   */
  const isThemeActive = (theme) => {
    return currentTheme.value === theme
  }

  /**
   * Get resolved theme (resolves 'system' to actual theme)
   * @returns {string} Resolved theme name
   */
  const getResolvedTheme = () => {
    if (currentTheme.value !== THEMES.SYSTEM) {
      return currentTheme.value
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return THEMES.LIGHT
    }

    return THEMES.DARK
  }

  // Watch for system theme changes (when using 'system' theme)
  onMounted(() => {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e) => {
        if (currentTheme.value === THEMES.SYSTEM) {
          // Re-apply system theme to trigger CSS updates
          applyTheme(THEMES.SYSTEM)
        }
      }

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else if (mediaQuery.addListener) {
        // Older browsers
        mediaQuery.addListener(handleChange)
      }
    }

    // Initialize theme
    initTheme()
  })

  return {
    // State
    currentTheme,
    isThemeLoaded,

    // Methods
    setTheme,
    getTheme,
    toggleTheme,
    isThemeActive,
    getResolvedTheme,
    initTheme,

    // Constants
    THEMES,
    PAGE_THEMES
  }
}
