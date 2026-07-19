import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8443/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Sisipkan JWT access token ke setiap request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh token otomatis saat access token kedaluwarsa (401)
let refreshing = null

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/token/refresh')

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        forceLogout()
        return Promise.reject(error)
      }
      try {
        refreshing = refreshing || client.post('/auth/token/refresh/', { refresh: refreshToken })
        const { data } = await refreshing
        refreshing = null
        localStorage.setItem('access_token', data.access)
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh)
        original.headers.Authorization = `Bearer ${data.access}`
        return client(original)
      } catch (refreshError) {
        refreshing = null
        forceLogout()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

// Ambil seluruh daftar meski backend paginasi DRF (ikuti `next` sampai habis)
export async function fetchAll(url, config = {}) {
  const rows = []
  let next = url
  let cfg = config
  while (next) {
    const { data } = await client.get(next, cfg)
    if (Array.isArray(data)) {
      rows.push(...data)
      break
    }
    rows.push(...(data.results ?? []))
    next = data.next
    cfg = {} // URL `next` sudah membawa query param-nya sendiri
  }
  return rows
}

function forceLogout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export default client
