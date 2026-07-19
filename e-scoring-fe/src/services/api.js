/**
 * services/api.js
 * Konfigurasi Axios + semua fungsi pemanggil API ke backend.
 * Base URL diambil dari environment variable VITE_API_BASE_URL.
 */
import axios from 'axios'

// ─── Axios Instance ───────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor: Inject JWT Token ────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('es_access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor: Handle 401 (Token Expired) ────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config

    // Coba refresh token sekali jika 401 dan bukan request refresh itu sendiri
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('es_refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/token/refresh/`,
            { refresh }
          )
          localStorage.setItem('es_access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (_) {
          // Refresh gagal → paksa logout
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  login:          payload  => api.post('/auth/login/', payload),
  logout:         payload  => api.post('/auth/logout/', payload),
  getProfile:     ()       => api.get('/auth/profile/'),

  // Manajemen Mahasiswa (Dosen Only)
  getMahasiswaList:      ()            => api.get('/auth/mahasiswa/'),
  importMahasiswa:       formData      => api.post('/auth/mahasiswa/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportKartuUjian:      ()            => api.get('/auth/mahasiswa/export-kartu/', { responseType: 'blob' }),
  createMahasiswa:       payload       => api.post('/auth/mahasiswa/', payload),
  updateMahasiswa:       (pk, payload) => api.post(`/auth/mahasiswa/${pk}/`, payload),
  unlockMahasiswa:       pk            => api.post(`/auth/mahasiswa/${pk}/unlock/`),
  hapusMahasiswa:        pk            => api.delete(`/auth/mahasiswa/${pk}/`),
}

// ─── Ujian API ───────────────────────────────────────────────────────────────
export const ujianApi = {
  // Dashboard ringkasan dosen
  getDashboard:          ()            => api.get('/ujian/dashboard/'),

  // Ujian tersedia (Mahasiswa Only)
  getUjianTersedia:      ()            => api.get('/ujian/tersedia/'),

  // CRUD Mata Kuliah
  getMataPelajaranList:  ()            => api.get('/ujian/mata-kuliah/'),
  createMataPelajaran:   payload       => api.post('/ujian/mata-kuliah/', payload),
  deleteMataPelajaran:   pk            => api.delete(`/ujian/mata-kuliah/${pk}/`),

  // CRUD Ujian
  getUjianList:          ()            => api.get('/ujian/'),
  createUjian:           payload       => api.post('/ujian/', payload),
  getUjianDetail:        pk            => api.get(`/ujian/${pk}/`),
  updateUjian:           (pk, payload) => api.put(`/ujian/${pk}/`, payload),
  deleteUjian:           pk            => api.delete(`/ujian/${pk}/`),
  aktivasiUjian:         pk            => api.post(`/ujian/${pk}/aktivasi/`),
  monitorUjian:          pk            => api.get(`/ujian/${pk}/monitor/`),

  // CRUD Soal
  getSoalList:           ujianPk       => api.get(`/ujian/${ujianPk}/soal/`),
  createSoal:            (ujianPk, p)  => api.post(`/ujian/${ujianPk}/soal/`, p),
  uploadSoalExcel:       (ujianPk, fd) => api.post(`/ujian/${ujianPk}/soal/upload/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateSoal:            (pk, payload) => api.put(`/ujian/soal/${pk}/`, payload),
  deleteSoal:            pk            => api.delete(`/ujian/soal/${pk}/`),
}

// ─── Submission API ──────────────────────────────────────────────────────────
export const submissionApi = {
  mulaiUjian:   ujianPk => api.post(`/submission/mulai/${ujianPk}/`),
  getSesiDetail:sesiPk  => api.get(`/submission/sesi/${sesiPk}/`),
  saveJawaban:  payload => api.post('/submission/save-jawaban/', payload),
  submitUjian:  sesiPk  => api.post(`/submission/submit/${sesiPk}/`),
  getHasil:     sesiPk  => api.get(`/submission/hasil/${sesiPk}/`),
}

// ─── Proctoring API ──────────────────────────────────────────────────────────
export const proctoringApi = {
  heartbeat:        payload => api.post('/proctoring/heartbeat/', payload),
  catatPelanggaran: payload => api.post('/proctoring/pelanggaran/', payload),
}

// ─── Laporan API ─────────────────────────────────────────────────────────────
export const laporanApi = {
  getNilaiUjian:   ujianPk         => api.get(`/laporan/nilai/${ujianPk}/`),
  getLogPelanggaran:ujianPk        => api.get(`/laporan/log-pelanggaran/${ujianPk}/`),
  exportExcel:     (ujianPk, kelas)=> api.get(`/laporan/export/excel/${ujianPk}/`, {
    params: kelas ? { kelas } : {},
    responseType: 'blob',
  }),
  exportPDF:       sesiPk          => api.get(`/laporan/export/pdf/${sesiPk}/`, { responseType: 'blob' }),
}

export default api
