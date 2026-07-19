<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

// Username backend tidak boleh mengandung spasi (validator default Django) — cegah di sisi input juga
function blokirSpasi(e) {
  if (e.key === ' ') e.preventDefault()
}
function bersihkanSpasi() {
  username.value = username.value.replace(/\s/g, '')
}

async function handleLogin() {
  try {
    const user = await auth.login(username.value.trim(), password.value)
    router.push(user.role === 'dosen' ? { name: 'dosen-dashboard' } : { name: 'ujian-tersedia' })
  } catch {
    // pesan error sudah ditangani di store (auth.error)
  }
}
</script>

<template>
  <div class="login-page d-flex align-items-center justify-content-center min-vh-100">
    <div class="card login-card shadow-lg border-0">
      <div class="card-body p-4 p-md-5">
        <div class="text-center mb-4">
          <div class="icon-circle mx-auto mb-3">
            <i class="bi bi-mortarboard-fill fs-2"></i>
          </div>
          <h1 class="h4 fw-bold mb-1">SAGE</h1>
          <p class="text-secondary small mb-0">Smart Automated Grader for Essay</p>
          <p class="text-secondary small mb-0">
            Jurusan TIK Politeknik Negeri Lhokseumawe
          </p>
        </div>

        <div v-if="auth.error" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ auth.error }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label for="username" class="form-label small fw-semibold">Username / NIM</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input
                id="username"
                v-model="username"
                type="text"
                class="form-control"
                placeholder="Username atau NIM"
                pattern="\S+"
                title="Username tidak boleh mengandung spasi"
                required
                autofocus
                @keydown="blokirSpasi"
                @paste.prevent="(e) => { username = (username + e.clipboardData.getData('text')).replace(/\s/g, '') }"
                @blur="bersihkanSpasi"
              />
            </div>
            <div class="form-text">Username tanpa spasi. Mahasiswa login dengan NIM.</div>
          </div>

          <div class="mb-4">
            <label for="password" class="form-label small fw-semibold">Password</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                placeholder="Password Anda"
                required
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-login w-100 py-2 fw-semibold" :disabled="auth.loading">
            <span v-if="auth.loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ auth.loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  background: linear-gradient(135deg, #3b0764 0%, #5b21b6 55%, #7c3aed 100%);
}
.login-card {
  width: 100%;
  max-width: 440px;
  border-radius: 1rem;
}
.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.12);
  color: #6d28d9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-login {
  background: #7c3aed;
  color: #fff;
}
.btn-login:hover,
.btn-login:disabled {
  background: #6d28d9;
  color: #fff;
}
</style>
