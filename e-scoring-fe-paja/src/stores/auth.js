import { defineStore } from 'pinia'
import client from '../api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    loading: false,
    error: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isDosen: (state) => state.user?.role === 'dosen',
    isMahasiswa: (state) => state.user?.role === 'mahasiswa',
  },

  actions: {
    async login(username, password) {
      this.loading = true
      this.error = null
      try {
        const { data } = await client.post('/auth/login/', { username, password })
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        localStorage.setItem('user', JSON.stringify(data.user))
        this.user = data.user
        return data.user
      } catch (err) {
        this.error = err.response?.data?.detail || 'Tidak dapat terhubung ke server.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchProfile() {
      try {
        const { data } = await client.get('/auth/profile/')
        this.user = data
        localStorage.setItem('user', JSON.stringify(data))
      } catch {
        // token tidak valid → interceptor yang menangani logout
      }
    },

    // Butuh endpoint backend: POST /auth/change-password/ { old_password, new_password }
    async changePassword(oldPassword, newPassword) {
      const { data } = await client.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      return data
    },

    async logout() {
      const refresh = localStorage.getItem('refresh_token')
      try {
        if (refresh) await client.post('/auth/logout/', { refresh })
      } catch {
        // token mungkin sudah tidak valid — tetap lanjut bersihkan sesi lokal
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      this.user = null
    },
  },
})
