<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import heroImg from '../assets/poltek.jpg'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

function masuk() {
  if (!auth.isLoggedIn) return router.push({ name: 'login' })
  router.push(auth.isDosen ? { name: 'dosen-dashboard' } : { name: 'ujian-tersedia' })
}
</script>

<template>
  <div class="landing d-flex flex-column min-vh-100">
    <!-- Navbar -->
    <nav class="landing-nav d-flex align-items-center justify-content-between px-4 py-3">
      <div class="d-flex align-items-center gap-2">
        <div class="nav-icon"><i class="bi bi-mortarboard-fill"></i></div>
        <span class="fw-bold">SAGE</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-theme-toggle btn-sm" :title="theme.mode === 'dark' ? 'Mode terang' : 'Mode gelap'" @click="theme.toggle">
          <i class="bi" :class="theme.mode === 'dark' ? 'bi-sun' : 'bi-moon-stars'"></i>
        </button>
        <button class="btn btn-primary fw-semibold px-4 rounded-pill" @click="masuk">
          {{ auth.isLoggedIn ? 'Buka Dashboard' : 'Masuk' }}
        </button>
      </div>
    </nav>

    <!-- Hero: rata kiri, dengan padding nyaman di layar kecil -->
    <header class="container flex-grow-1 d-flex align-items-center py-5 px-4 px-lg-3">
      <div class="row align-items-center g-5 w-100 mx-0">
        <div class="col-lg-6">
          <span class="hero-badge mb-3 d-inline-block">
            <i class="bi bi-mortarboard me-1"></i>Jurusan TIK Politeknik Negeri Lhokseumawe
          </span>
          <h1 class="display-4 fw-bold lh-1 mb-1">SAGE</h1>
          <h1 class="display-6 fw-bold hero-accent mb-3">Smart Automated Grader for Essay</h1>
          <p class="text-secondary hero-sub mb-4">
            Sistem Computer-Based Test untuk ujian esai yang memanfaatkan teknologi
            Large Language Model untuk menilai jawaban secara otomatis
            cepat, konsisten, dan transparan.
          </p>
          <button class="btn btn-primary btn-lg fw-semibold px-4 rounded-pill" @click="masuk">
            Mulai Sekarang <i class="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
        <div class="col-lg-6 text-center">
          <img :src="heroImg" alt="Politeknik Negeri Lhokseumawe" class="hero-img img-fluid rounded-4 shadow" />
        </div>
      </div>
    </header>
  </div>
</template>

<style scoped>
.landing {
  background: var(--aes-bg);
}

.landing-nav {
  background: var(--aes-surface);
  border-bottom: 1px solid var(--aes-border);
  box-shadow: 0 4px 18px rgba(124, 58, 237, 0.14);
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  position: sticky;
  top: 0;
  z-index: 1030;
  font-size: 1.15rem;
}
.nav-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-theme-toggle {
  background: var(--aes-surface-2);
  border: 1px solid var(--aes-border);
  color: var(--aes-primary-dark);
  border-radius: 8px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-badge {
  background: rgba(124, 58, 237, 0.08);
  color: #6d28d9;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
}
.hero-accent {
  color: #7c3aed;
}
.hero-sub {
  max-width: 480px;
}

.hero-img {
  max-height: 420px;
}
</style>
