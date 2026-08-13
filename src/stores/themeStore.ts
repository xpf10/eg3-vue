import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDarkMode = ref<boolean>(true)

  // Initialize from LocalStorage or system preference
  try {
    const saved = localStorage.getItem('eg3_vue_theme')
    if (saved !== null) {
      isDarkMode.value = saved === 'dark'
    }
  } catch (e) {
    console.warn('LocalStorage not accessible for theme', e)
  }

  function applyTheme() {
    const root = document.documentElement
    if (isDarkMode.value) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
  }

  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
    applyTheme()
    try {
      localStorage.setItem('eg3_vue_theme', isDarkMode.value ? 'dark' : 'light')
    } catch {
      /* localStorage unavailable — theme still applies for this session */
    }
  }

  function setTheme(dark: boolean) {
    isDarkMode.value = dark
    applyTheme()
    try {
      localStorage.setItem('eg3_vue_theme', dark ? 'dark' : 'light')
    } catch {
      /* localStorage unavailable — theme still applies for this session */
    }
  }

  // Initial application
  applyTheme()

  return {
    isDarkMode,
    toggleTheme,
    setTheme
  }
})
