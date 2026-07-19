<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const sidebarOpen = ref(false)
const collapsed = ref(localStorage.getItem('aes_sidebar_collapsed') === '1')

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('aes_sidebar_collapsed', collapsed.value ? '1' : '0')
}

const pageTitle = computed(() => route.meta.title || 'Dashboard')
const today = new Date().toLocaleDateString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

const initials = computed(() => {
  const nama = auth.user?.nama_lengkap || auth.user?.username || '?'
  return nama
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0].toUpperCase())
    .join('')
})

const menuDosen = [
  { name: 'dosen-dashboard', label: 'Dashboard', icon: 'bi-grid' },
  { name: 'mata-kuliah', label: 'Mata Kuliah', icon: 'bi-book' },
  { name: 'ujian-list', label: 'Ujian', icon: 'bi-journal-text' },
  { name: 'nilai', label: 'Nilai', icon: 'bi-clipboard-data' },
  { name: 'mahasiswa', label: 'Mahasiswa', icon: 'bi-people' },
  { name: 'log-pelanggaran', label: 'Log Pelanggaran', icon: 'bi-shield-exclamation' },
]
const menuMahasiswa = [
  { name: 'ujian-tersedia', label: 'Ujian Tersedia', icon: 'bi-journal-text' },
]

function isActive(m) {
  return (
    route.name === m.name ||
    (m.name === 'ujian-list' && ['ujian-detail', 'ujian-monitor', 'ujian-laporan'].includes(String(route.name)))
  )
}

// Identitas resmi: NIP untuk dosen, NIM untuk mahasiswa (langsung dari data backend)
const identityLabel = computed(() => (auth.isDosen ? 'NIP' : 'NIM'))
const identityValue = computed(() => (auth.isDosen ? auth.user?.nip : auth.user?.nim) || '—')

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

// ── Ganti password ───────────────────────────────────────────────
const showPwModal = ref(false)
const pwOld = ref('')
const pwNew = ref('')
const pwConfirm = ref('')
const pwSaving = ref(false)
const pwError = ref(null)
const pwSuccess = ref(null)

function bukaGantiPassword() {
  pwOld.value = pwNew.value = pwConfirm.value = ''
  pwError.value = pwSuccess.value = null
  showPwModal.value = true
}

async function simpanPassword() {
  pwError.value = pwSuccess.value = null
  if (pwNew.value.length < 8) {
    pwError.value = 'Password baru minimal 8 karakter.'
    return
  }
  if (pwNew.value !== pwConfirm.value) {
    pwError.value = 'Konfirmasi password tidak sama.'
    return
  }
  pwSaving.value = true
  try {
    const data = await auth.changePassword(pwOld.value, pwNew.value)
    pwSuccess.value = data?.detail || 'Password berhasil diganti.'
    pwOld.value = pwNew.value = pwConfirm.value = ''
  } catch (err) {
    pwError.value =
      err.response?.data?.detail ||
      err.response?.data?.old_password?.[0] ||
      err.response?.data?.new_password?.[0] ||
      'Gagal mengganti password.'
  } finally {
    pwSaving.value = false
  }
}

function navigate(name) {
  sidebarOpen.value = false
  router.push({ name })
}

// Sinkronkan data profil dengan server saat aplikasi dibuka
onMounted(() => {
  if (auth.isLoggedIn) auth.fetchProfile()
})
</script>

<template>
  <!-- Halaman tanpa layout (landing, login, pengerjaan ujian) -->
  <router-view v-if="!auth.isLoggedIn || route.meta.hideNav" />

  <div v-else class="app-layout">
    <!-- Topbar mobile -->
    <div class="mobile-topbar d-lg-none d-flex align-items-center justify-content-between px-3 py-2">
      <button class="btn btn-sm btn-outline-light" @click="sidebarOpen = !sidebarOpen">
        <i class="bi bi-list fs-5"></i>
      </button>
      <span class="fw-bold text-white small">SAGE</span>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-light" :title="theme.mode === 'dark' ? 'Mode terang' : 'Mode gelap'" @click="theme.toggle">
          <i class="bi" :class="theme.mode === 'dark' ? 'bi-sun' : 'bi-moon-stars'"></i>
        </button>
        <button class="btn btn-sm btn-outline-light" @click="handleLogout">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </div>

    <!-- Sidebar kiri (terang, ala PLN) -->
    <aside class="sidebar" :class="{ open: sidebarOpen, collapsed }">
      <div class="sidebar-brand">
        <div class="brand-icon"><i class="bi bi-mortarboard-fill"></i></div>
        <div v-if="!collapsed">
          <div class="brand-title">SAGE</div>
          <div class="brand-sub">Jurusan TIK — PNL</div>
        </div>
      </div>

      <!-- Kartu profil user -->
      <div class="px-3 pt-3">
        <div class="user-card" :title="collapsed ? auth.user?.nama_lengkap : ''">
          <div class="avatar">{{ initials }}</div>
          <div v-if="!collapsed" class="overflow-hidden">
            <div class="user-name text-truncate">{{ auth.user?.nama_lengkap || auth.user?.username }}</div>
            <div class="user-role">{{ auth.user?.role_display }}</div>
            <div v-if="identityValue !== '—'" class="user-nip">{{ identityLabel }} {{ identityValue }}</div>
          </div>
        </div>
      </div>

      <div class="sidebar-section">{{ collapsed ? '•••' : 'Navigasi' }}</div>
      <nav class="sidebar-nav flex-grow-1">
        <a
          v-for="m in auth.isDosen ? menuDosen : menuMahasiswa"
          :key="m.name"
          href="#"
          class="sidebar-link"
          :class="{ active: isActive(m) }"
          :title="collapsed ? m.label : ''"
          @click.prevent="navigate(m.name)"
        >
          <i class="bi" :class="m.icon"></i>
          <template v-if="!collapsed">
            <span class="flex-grow-1">{{ m.label }}</span>
            <span v-if="isActive(m)" class="active-dot"></span>
          </template>
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="btn-ganti-pw w-100 mb-2" :title="collapsed ? 'Ganti Password' : ''" @click="bukaGantiPassword">
          <i class="bi bi-key" :class="{ 'me-2': !collapsed }"></i><template v-if="!collapsed">Ganti Password</template>
        </button>
        <button class="btn-keluar w-100" :title="collapsed ? 'Keluar' : ''" @click="handleLogout">
          <i class="bi bi-box-arrow-right" :class="{ 'me-2': !collapsed }"></i><template v-if="!collapsed">Keluar</template>
        </button>
      </div>
    </aside>

    <!-- Modal ganti password -->
    <Teleport to="body">
      <div v-if="showPwModal" class="modal fade show d-block" tabindex="-1" @click.self="showPwModal = false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold"><i class="bi bi-key me-2"></i>Ganti Password</h5>
              <button type="button" class="btn-close" @click="showPwModal = false"></button>
            </div>
            <form @submit.prevent="simpanPassword">
              <div class="modal-body">
                <div v-if="pwError" class="alert alert-danger py-2 small">{{ pwError }}</div>
                <div v-if="pwSuccess" class="alert alert-success py-2 small">{{ pwSuccess }}</div>

                <label class="form-label small fw-semibold">Password Lama</label>
                <input v-model="pwOld" type="password" class="form-control mb-3" autocomplete="current-password" required />

                <label class="form-label small fw-semibold">Password Baru</label>
                <input v-model="pwNew" type="password" class="form-control mb-3" autocomplete="new-password" minlength="8" required />
                <label class="form-label small fw-semibold">Ulangi Password Baru</label>
                <input v-model="pwConfirm" type="password" class="form-control" autocomplete="new-password" required />
                <div class="form-text">Minimal 8 karakter.</div>
              </div>
              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-outline-secondary" @click="showPwModal = false">Tutup</button>
                <button type="submit" class="btn btn-primary px-4" :disabled="pwSaving">
                  <span v-if="pwSaving" class="spinner-border spinner-border-sm me-1"></span>Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div v-if="showPwModal" class="modal-backdrop fade show"></div>
    </Teleport>

    <!-- Backdrop mobile -->
    <div v-if="sidebarOpen" class="sidebar-backdrop d-lg-none" @click="sidebarOpen = false"></div>

    <!-- Konten -->
    <div class="app-content d-flex flex-column" :class="{ collapsed }">
      <!-- Header bar (desktop) -->
      <header class="topbar d-none d-lg-flex align-items-center justify-content-between px-4">
        <div class="d-flex align-items-center gap-3">
          <button class="btn-collapse" :title="collapsed ? 'Perlebar sidebar' : 'Perkecil sidebar'" @click="toggleCollapse">
            <i class="bi" :class="collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'"></i>
          </button>
          <h1 class="h5 fw-bold mb-0">{{ pageTitle }}</h1>
        </div>
        <div class="d-flex align-items-center gap-3">
          <span class="small text-secondary"><i class="bi bi-calendar3 me-1"></i>{{ today }}</span>
          <button class="btn-collapse" :title="theme.mode === 'dark' ? 'Mode terang' : 'Mode gelap'" @click="theme.toggle">
            <i class="bi" :class="theme.mode === 'dark' ? 'bi-sun' : 'bi-moon-stars'"></i>
          </button>
        </div>
      </header>

      <main class="flex-grow-1">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.mobile-topbar {
  background: var(--aes-sidebar-top);
  position: sticky;
  top: 0;
  z-index: 1030;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 232px;
  background: var(--aes-surface);
  border-right: 1px solid var(--aes-border);
  color: var(--aes-text);
  display: flex;
  flex-direction: column;
  z-index: 1040;
  transition: transform 0.25s ease, width 0.2s ease, background-color 0.15s ease, border-color 0.15s ease;
}
.sidebar.collapsed {
  width: 76px;
}
.sidebar.collapsed .sidebar-brand,
.sidebar.collapsed .user-card,
.sidebar.collapsed .sidebar-link {
  justify-content: center;
}
.sidebar.collapsed .user-card {
  padding: 8px;
}
.sidebar.collapsed .sidebar-section {
  text-align: center;
  padding-left: 0;
  padding-right: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 72px;
  padding: 0 18px;
  border-bottom: 1px solid var(--aes-border);
}
.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}
.brand-title {
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.2;
  color: var(--aes-text);
}
.brand-sub {
  font-size: 0.72rem;
  color: var(--aes-text-muted);
  margin-top: 2px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--aes-surface-2);
  border: 1px solid var(--aes-border);
  border-radius: 12px;
  padding: 10px 12px;
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.14);
  color: #6d28d9;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--aes-text);
}
.user-role {
  font-size: 0.72rem;
  color: var(--aes-text-muted);
}
.user-nip {
  font-size: 0.66rem;
  color: var(--aes-text-muted);
  margin-top: 1px;
}

.sidebar-section {
  padding: 18px 20px 8px;
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--aes-text-muted);
}

.sidebar-nav {
  padding: 0 12px;
  overflow-y: auto;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--aes-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 2px;
  transition: background 0.15s, color 0.15s;
}
.sidebar-link i {
  font-size: 1.05rem;
}
.sidebar-link:hover {
  background: var(--aes-surface-2);
  color: var(--aes-text);
}
.sidebar-link.active {
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
  font-weight: 600;
}
.active-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7c3aed;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 14px;
  border-top: 1px solid var(--aes-border);
}
.btn-ganti-pw {
  background: var(--aes-surface-2);
  border: 1px solid var(--aes-border);
  color: var(--aes-text);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-ganti-pw:hover {
  background: var(--aes-border);
}

.btn-keluar {
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.25);
  color: #ef4444;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-keluar:hover {
  background: rgba(220, 38, 38, 0.18);
}

.app-content {
  margin-left: 232px;
  min-height: 100vh;
  transition: margin-left 0.2s ease;
}
.app-content.collapsed {
  margin-left: 76px;
}

.btn-collapse {
  background: var(--aes-surface-2);
  border: 1px solid var(--aes-border);
  color: var(--aes-primary-dark);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.btn-collapse:hover {
  background: rgba(124, 58, 237, 0.18);
}

.topbar {
  background: var(--aes-surface);
  border-bottom: 1px solid var(--aes-border);
  height: 72px;
  position: sticky;
  top: 0;
  z-index: 1020;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1035;
}

@media (max-width: 991.98px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .app-content {
    margin-left: 0;
  }
}
</style>
