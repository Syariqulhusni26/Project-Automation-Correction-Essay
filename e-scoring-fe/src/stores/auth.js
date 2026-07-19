/**
 * stores/auth.js
 * Pinia store untuk autentikasi JWT.
 * Mengelola: login, logout, persistensi token, dan data profil user.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // ─── State ───────────────────────────────────────────────────────────
  const user         = ref(JSON.parse(localStorage.getItem('es_user') || 'null'))
  const accessToken  = ref(localStorage.getItem('es_access')  || null)
  const refreshToken = ref(localStorage.getItem('es_refresh') || null)

  // ─── Getters ─────────────────────────────────────────────────────────
  const isLoggedIn = computed(() => !!accessToken.value)
  const isDosen    = computed(() => user.value?.role === 'dosen')
  const isMahasiswa= computed(() => user.value?.role === 'mahasiswa')

  // ─── Actions ──────────────────────────────────────────────────────────

  /**
   * Login: kirim kredensial, simpan token, dan ambil profil.
   * @param {string} username
   * @param {string} password
   */
  async function login(username, password) {
    const { data } = await authApi.login({ username, password })

    accessToken.value  = data.access
    refreshToken.value = data.refresh

    localStorage.setItem('es_access',  data.access)
    localStorage.setItem('es_refresh', data.refresh)

    await fetchProfile()
  }

  /**
   * Ambil data profil dari endpoint /auth/profile/
   */
  async function fetchProfile() {
    const { data } = await authApi.getProfile()
    user.value = data
    localStorage.setItem('es_user', JSON.stringify(data))
  }

  /**
   * Logout: blacklist refresh token, bersihkan state.
   */
  async function logout() {
    try {
      if (refreshToken.value) {
        await authApi.logout({ refresh: refreshToken.value })
      }
    } catch (_) {
      // Tetap lanjut logout meski API gagal
    } finally {
      _clearSession()
      router.push({ name: 'Login' })
    }
  }

  function _clearSession() {
    user.value = null
    accessToken.value  = null
    refreshToken.value = null
    localStorage.removeItem('es_user')
    localStorage.removeItem('es_access')
    localStorage.removeItem('es_refresh')
  }

  return {
    user, accessToken, refreshToken,
    isLoggedIn, isDosen, isMahasiswa,
    login, logout, fetchProfile,
  }
})
