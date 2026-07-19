import { defineStore } from 'pinia'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function terapkan(mode) {
  document.documentElement.setAttribute('data-bs-theme', mode)
}

const tersimpan = localStorage.getItem('aes_theme')
const awal = tersimpan || (systemPrefersDark() ? 'dark' : 'light')
terapkan(awal) // diterapkan segera saat modul dimuat, sebelum Vue mount — mencegah flash tema salah

export const useThemeStore = defineStore('theme', {
  state: () => ({ mode: awal }),
  actions: {
    toggle() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark'
      localStorage.setItem('aes_theme', this.mode)
      terapkan(this.mode)
    },
  },
})
