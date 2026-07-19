import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import LandingView from '../views/LandingView.vue'
import LoginView from '../views/LoginView.vue'
import NotFoundView from '../views/NotFoundView.vue'

// Dosen
import DashboardView from '../views/dosen/DashboardView.vue'
import MataKuliahView from '../views/dosen/MataKuliahView.vue'
import UjianListView from '../views/dosen/UjianListView.vue'
import UjianDetailView from '../views/dosen/UjianDetailView.vue'
import MonitorUjianView from '../views/dosen/MonitorUjianView.vue'
import MahasiswaView from '../views/dosen/MahasiswaView.vue'
import LaporanView from '../views/dosen/LaporanView.vue'
import NilaiView from '../views/dosen/NilaiView.vue'
import LogPelanggaranView from '../views/dosen/LogPelanggaranView.vue'

// Mahasiswa
import UjianTersediaView from '../views/mahasiswa/UjianTersediaView.vue'
import KerjakanUjianView from '../views/mahasiswa/KerjakanUjianView.vue'
import HasilUjianView from '../views/mahasiswa/HasilUjianView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },

  // Area dosen
  { path: '/dosen', name: 'dosen-dashboard', component: DashboardView, meta: { requiresAuth: true, role: 'dosen', title: 'Dashboard' } },
  { path: '/dosen/mata-kuliah', name: 'mata-kuliah', component: MataKuliahView, meta: { requiresAuth: true, role: 'dosen', title: 'Mata Kuliah' } },
  { path: '/dosen/ujian', name: 'ujian-list', component: UjianListView, meta: { requiresAuth: true, role: 'dosen', title: 'Ujian' } },
  { path: '/dosen/ujian/:id', name: 'ujian-detail', component: UjianDetailView, meta: { requiresAuth: true, role: 'dosen', title: 'Detail Ujian' } },
  { path: '/dosen/ujian/:id/monitor', name: 'ujian-monitor', component: MonitorUjianView, meta: { requiresAuth: true, role: 'dosen', title: 'Monitor Ujian' } },
  { path: '/dosen/ujian/:id/laporan', name: 'ujian-laporan', component: LaporanView, meta: { requiresAuth: true, role: 'dosen', title: 'Laporan Ujian' } },
  { path: '/dosen/mahasiswa', name: 'mahasiswa', component: MahasiswaView, meta: { requiresAuth: true, role: 'dosen', title: 'Manajemen Mahasiswa' } },
  { path: '/dosen/nilai', name: 'nilai', component: NilaiView, meta: { requiresAuth: true, role: 'dosen', title: 'Nilai Ujian' } },
  { path: '/dosen/log-pelanggaran', name: 'log-pelanggaran', component: LogPelanggaranView, meta: { requiresAuth: true, role: 'dosen', title: 'Log Pelanggaran' } },

  // Area mahasiswa
  { path: '/ujian', name: 'ujian-tersedia', component: UjianTersediaView, meta: { requiresAuth: true, role: 'mahasiswa', title: 'Ujian Tersedia' } },
  { path: '/ujian/:id/kerjakan', name: 'kerjakan-ujian', component: KerjakanUjianView, meta: { requiresAuth: true, role: 'mahasiswa', hideNav: true } },
  { path: '/hasil/:sesiId', name: 'hasil-ujian', component: HasilUjianView, meta: { requiresAuth: true, role: 'mahasiswa', title: 'Hasil Ujian' } },

  { path: '/', name: 'landing', component: LandingView, meta: { hideNav: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { hideNav: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return auth.isDosen ? { name: 'dosen-dashboard' } : { name: 'ujian-tersedia' }
  }
  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return auth.isDosen ? { name: 'dosen-dashboard' } : { name: 'ujian-tersedia' }
  }
})

export default router
