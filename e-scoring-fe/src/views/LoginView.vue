<template>
  <!--
    LoginView.vue
    Halaman login untuk Dosen (username) dan Mahasiswa (NIM).
  -->
  <div class="login-page min-h-screen">
    <!-- Background Gradient -->
    <div class="login-bg" aria-hidden="true">
      <div class="bg-orb bg-orb--1"></div>
      <div class="bg-orb bg-orb--2"></div>
    </div>

    <!-- Card -->
    <main class="login-container">
      <div class="login-card glass-card animate-fade-in">

        <!-- Logo SAGE -->
        <div class="login-logo">
          <img src="/logo-pnl.png" alt="PNL Logo" class="logo-pnl-img" />
          <h1 class="logo-text">SAGE</h1>
        </div>
        <p class="login-subtitle">Smart Automation Grading for Essay</p>
        <p class="login-desc">Sistem Penilaian Esai Otomatis Berbasis AI — PNL</p>

        <!-- Form -->
        <form id="form-login" @submit.prevent="handleLogin" novalidate>
          <div class="form-group">
            <label for="input-username" class="form-label">Username / NIM</label>
            <input
              id="input-username"
              v-model="form.username"
              type="text"
              class="form-input"
              placeholder="Masukkan username atau NIM"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group" style="margin-top: 1rem;">
            <label for="input-password" class="form-label">Password</label>
            <div class="input-password-wrapper">
              <input
                id="input-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="toggle-password-btn icon-bounce"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              >
                <EyeOff v-if="showPassword" size="18" />
                <Eye v-else size="18" />
              </button>
            </div>
          </div>

          <!-- Error Alert -->
          <Transition name="fade">
            <div v-if="errorMsg" class="error-alert" role="alert">
              <AlertTriangle size="15" style="display:inline-block;vertical-align:text-bottom;margin-right:6px;" />
              {{ errorMsg }}
            </div>
          </Transition>

          <!-- Submit Button -->
          <button
            id="btn-login"
            type="submit"
            class="btn btn-primary w-full btn-lg"
            style="margin-top: 1.5rem;"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner" style="width:1.1rem;height:1.1rem;border-width:2px;"></span>
            <span>{{ loading ? 'Masuk...' : 'Masuk' }}</span>
          </button>
        </form>

        <p class="login-footer-text">
          Lupa password? Hubungi Dosen atau Administrator IT.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Zap, Eye, EyeOff, AlertTriangle } from 'lucide-vue-next'

const auth    = useAuthStore()
const router  = useRouter()

const form         = reactive({ username: '', password: '' })
const loading      = ref(false)
const errorMsg     = ref('')
const showPassword = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  if (!form.username || !form.password) {
    errorMsg.value = 'Username dan password harus diisi.'
    return
  }

  loading.value = true
  try {
    await auth.login(form.username, form.password)
    // Redirect berdasarkan role
    if (auth.isDosen) {
      router.push({ name: 'AdminDashboard' })
    } else {
      router.push({ name: 'Dashboard' })
    }
  } catch (err) {
    const status = err.response?.status
    if (status === 401 || status === 400) {
      errorMsg.value = 'Username atau password salah.'
    } else if (status === 403) {
      errorMsg.value = 'Akun Anda dikunci karena pelanggaran ujian. Hubungi dosen.'
    } else {
      errorMsg.value = 'Terjadi kesalahan. Periksa koneksi Anda.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Layout ── */
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Animated gradient orbs */
.login-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}

.bg-orb--1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--color-primary-600), transparent);
  top: -100px;
  left: -100px;
  animation: float1 8s ease-in-out infinite;
}

.bg-orb--2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--color-accent-600), transparent);
  bottom: -80px;
  right: -80px;
  animation: float2 10s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0); }
  50%       { transform: translate(30px, 30px); }
}

@keyframes float2 {
  0%, 100% { transform: translate(0, 0); }
  50%       { transform: translate(-20px, -20px); }
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  padding: var(--space-6);
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.logo-pnl-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.logo-text {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtitle {
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-300);
  margin-top: calc(-1 * var(--space-2));
}

.login-desc {
  text-align: center;
  font-size: 0.83rem;
  color: var(--color-text-muted);
  margin-top: calc(-1 * var(--space-2));
}

.input-password-wrapper {
  position: relative;
}

.input-password-wrapper .form-input {
  padding-right: 2.8rem;
}

.toggle-password-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
}

.error-alert {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-danger);
  font-size: 0.85rem;
  margin-top: var(--space-3);
}

.login-footer-text {
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
