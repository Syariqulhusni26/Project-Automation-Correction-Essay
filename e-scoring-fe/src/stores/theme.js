/**
 * stores/theme.js
 * Pinia store untuk preferensi tema Admin (dark / light mode).
 * Default: dark mode. Persist ke localStorage.
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Default dark, kecuali user sudah set ke light
  const isDark = ref(localStorage.getItem('admin_theme') !== 'light')

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  // Simpan preferensi setiap kali berubah
  watch(isDark, (val) => {
    localStorage.setItem('admin_theme', val ? 'dark' : 'light')
  }, { immediate: false })

  return { isDark, toggleTheme }
})
