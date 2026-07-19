import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// ─── Lazy-loaded Views ─────────────────────────────────────────────────────
const LoginView = () => import('@/views/LoginView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const ExamView = () => import('@/views/ExamView.vue')
const ResultView = () => import('@/views/ResultView.vue')

// Admin (Dosen)
const AdminDashboard = () => import('@/views/Admin/AdminDashboardView.vue')
const AdminQuestion = () => import('@/views/Admin/AdminQuestionView.vue')
const AdminStudent = () => import('@/views/Admin/AdminStudentView.vue')
const AdminScore = () => import('@/views/Admin/AdminScoreView.vue')
const AdminLogs = () => import('@/views/Admin/AdminLogsView.vue')

// ─── Route Definitions ─────────────────────────────────────────────────────
const routes = [
  // ── Public ─────────────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true, title: 'Login — SAGE' },
  },

  // ── Mahasiswa ──────────────────────────────────────────────────────────
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, role: 'mahasiswa', title: 'Dashboard — SAGE' },
  },
  {
    path: '/ujian/:ujianId',
    name: 'Exam',
    component: ExamView,
    meta: { requiresAuth: true, role: 'mahasiswa', title: 'Ujian — SAGE' },
  },
  {
    path: '/hasil/:sesiId',
    name: 'Result',
    component: ResultView,
    meta: { requiresAuth: true, role: 'mahasiswa', title: 'Hasil Ujian — SAGE' },
  },

  // ── Dosen (Admin) ──────────────────────────────────────────────────────
  {
    path: '/admin',
    redirect: { name: 'AdminDashboard' },
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, role: 'dosen', title: 'Dashboard Dosen — SAGE' },
  },
  {
    path: '/admin/ujian/:ujianId/soal',
    name: 'AdminQuestion',
    component: AdminQuestion,
    meta: { requiresAuth: true, role: 'dosen', title: 'Manajemen Soal — SAGE' },
  },
  {
    path: '/admin/mahasiswa',
    name: 'AdminStudent',
    component: AdminStudent,
    meta: { requiresAuth: true, role: 'dosen', title: 'Manajemen Mahasiswa — SAGE' },
  },
  {
    path: '/admin/nilai/:ujianId',
    name: 'AdminScore',
    component: AdminScore,
    meta: { requiresAuth: true, role: 'dosen', title: 'Rekap Nilai — SAGE' },
  },
  {
    path: '/admin/logs/:ujianId',
    name: 'AdminLogs',
    component: AdminLogs,
    meta: { requiresAuth: true, role: 'dosen', title: 'Log Pelanggaran — SAGE' },
  },

  // ── Catch-all ──────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

// ─── Router Instance ───────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ─── Navigation Guards ─────────────────────────────────────────────────────
router.beforeEach((to, _from, next) => {
  // Update judul tab browser
  document.title = to.meta.title || 'SAGE'

  const auth = useAuthStore()

  // Halaman butuh login
  if (to.meta.requiresAuth) {
    if (!auth.isLoggedIn) {
      return next({ name: 'Login' })
    }

    // Guard role: mahasiswa tidak bisa ke rute dosen, dan sebaliknya
    if (to.meta.role && auth.user?.role !== to.meta.role) {
      const redirect = auth.user?.role === 'dosen' ? 'AdminDashboard' : 'Dashboard'
      return next({ name: redirect })
    }
  }

  // Halaman hanya untuk tamu (belum login)
  if (to.meta.requiresGuest && auth.isLoggedIn) {
    const redirect = auth.user?.role === 'dosen' ? 'AdminDashboard' : 'Dashboard'
    return next({ name: redirect })
  }

  next()
})

export default router
