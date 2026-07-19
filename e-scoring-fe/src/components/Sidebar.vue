<template>
  <!--
    Sidebar.vue
    Navigasi samping untuk halaman Admin Dosen.
    Fitur:
    - Navigasi rute aktif
    - Profil user + status session aktif
    - Toggle dark/light mode
    - Tombol logout (blacklist token ke backend)
  -->
  <aside class="sidebar" :class="['sidebar', { 'sidebar--collapsed': collapsed }]">
    <!-- Header Brand -->
    <div class="sidebar-header">
      <span class="brand-icon">⚡</span>
      <span class="brand-name" v-if="!collapsed">E-Scoring</span>
      <button
        id="btn-toggle-sidebar"
        class="toggle-btn"
        @click="collapsed = !collapsed"
        :title="collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'"
      >
        {{ collapsed ? '›' : '‹' }}
      </button>
    </div>

    <!-- Nav Items -->
    <nav class="sidebar-nav">
      <template v-for="item in navItems" :key="item.name">
        <!-- Normal Link -->
        <router-link
          v-if="!item.isDropdown"
          :to="item.to"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item) }"
          :title="collapsed ? item.label : ''"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label" v-if="!collapsed">{{ item.label }}</span>
        </router-link>

        <!-- Dropdown / Accordion for Exams (Nilai / Log Pelanggaran) -->
        <div v-else class="nav-dropdown-wrapper">
          <div
            class="nav-item dropdown-toggle"
            :class="{ 'nav-item--active': isActive(item) }"
            @click="toggleDropdown(item.name)"
            :title="collapsed ? item.label : ''"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label" v-if="!collapsed">{{ item.label }}</span>
            <span class="dropdown-chevron" v-if="!collapsed" :class="{ 'dropdown-open': openDropdowns[item.name] }">▼</span>
          </div>

          <!-- Dropdown List -->
          <div class="dropdown-menu" v-if="!collapsed && openDropdowns[item.name]">
            <Loading v-if="loadingExams" message="Memuat..." size="sm" />
            <div v-else-if="ujianList.length === 0" class="dropdown-empty">Belum ada ujian</div>
            <router-link
              v-else
              v-for="ujian in ujianList"
              :key="ujian.id"
              :to="{ name: item.name, params: { ujianId: ujian.id } }"
              class="dropdown-item"
              :class="{ 'dropdown-item--active': isSubActive(item.name, ujian.id) }"
            >
              {{ ujian.judul }}
            </router-link>
          </div>
        </div>
      </template>
    </nav>

    <!-- Divider -->
    <div class="sidebar-divider"></div>

    <!-- Auth & Session Info -->
    <div class="auth-section" v-if="!collapsed">
      <div class="session-badge">
        <span class="session-dot"></span>
        <span class="session-text">Session Aktif</span>
      </div>

      <!-- Token blacklist info -->
      <div class="token-info">
        <span class="token-label">🔐 Autentikasi</span>
        <span class="token-value">JWT Bearer</span>
      </div>
      <div class="token-info">
        <span class="token-label">👤 Role</span>
        <span class="token-value">{{ auth.user?.role === 'dosen' ? 'Dosen' : auth.user?.role }}</span>
      </div>
      <div class="token-info" v-if="auth.user?.nip">
        <span class="token-label">🆔 NIP</span>
        <span class="token-value">{{ auth.user?.nip }}</span>
      </div>
    </div>

    <!-- Collapsed state: hanya ikon -->
    <div class="auth-section auth-section--collapsed" v-else>
      <div class="session-dot-only" title="Session Aktif"></div>
    </div>

    <div class="sidebar-divider"></div>

    <!-- Footer: Profil + Theme Toggle + Logout -->
    <div class="sidebar-footer">
      <!-- Avatar & nama -->
      <div class="user-avatar-sm" :title="auth.user?.nama_lengkap">{{ userInitial }}</div>
      <div class="footer-info" v-if="!collapsed">
        <p class="footer-name">{{ auth.user?.nama_lengkap || auth.user?.username }}</p>
        <p class="footer-role">Dosen</p>
      </div>

      <!-- Tombol toggle dark/light -->
      <button
        id="btn-toggle-theme"
        class="icon-btn"
        :title="themeStore.isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'"
        @click="themeStore.toggleTheme()"
        v-if="!collapsed"
      >
        {{ themeStore.isDark ? '☀️' : '🌙' }}
      </button>

      <!-- Logout -->
      <button
        id="btn-logout"
        class="icon-btn icon-btn--danger"
        title="Logout"
        @click="handleLogout"
        :disabled="loggingOut"
      >
        <span v-if="loggingOut">⏳</span>
        <span v-else>🚪</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ujianApi } from '@/services/api'
import Loading from '@/components/Loading.vue'

const auth       = useAuthStore()
const themeStore = useThemeStore()
const route      = useRoute()
const collapsed  = ref(false)
const loggingOut = ref(false)
const loadingExams = ref(false)
const ujianList  = ref([])

const openDropdowns = reactive({
  AdminScore: false,
  AdminLogs: false
})

const navItems = [
  { name: 'AdminDashboard', label: 'Dashboard',       icon: '🏠', to: { name: 'AdminDashboard' } },
  { name: 'AdminStudent',   label: 'Manajemen User',  icon: '👥', to: { name: 'AdminStudent'   } },
  { name: 'AdminScore',     label: 'Nilai',           icon: '📊', isDropdown: true },
  { name: 'AdminLogs',      label: 'Log Pelanggaran', icon: '🚨', isDropdown: true },
]

const isActive = item => {
  if (item.isDropdown) return route.name === item.name
  return route.name === item.name || route.name?.startsWith(item.name)
}

const isSubActive = (routeName, ujianId) => {
  return route.name === routeName && Number(route.params.ujianId) === Number(ujianId)
}

function toggleDropdown(name) {
  if (collapsed.value) {
    collapsed.value = false // Auto open sidebar if collapsed
  }
  openDropdowns[name] = !openDropdowns[name]
}

const userInitial = computed(() => {
  const name = auth.user?.nama_lengkap || auth.user?.username || '?'
  return name.charAt(0).toUpperCase()
})

async function fetchExams() {
  loadingExams.value = true
  try {
    const res = await ujianApi.getUjianList()
    ujianList.value = res.data
  } catch (err) {
    console.error('Gagal memuat ujian', err)
  } finally {
    loadingExams.value = false
  }
}

onMounted(() => {
  // Buka dropdown jika rute saat ini ada di dalamnya
  if (route.name === 'AdminScore') openDropdowns.AdminScore = true
  if (route.name === 'AdminLogs') openDropdowns.AdminLogs = true

  // Fetch list ujian untuk dropdown
  if (auth.user?.role === 'dosen') {
    fetchExams()
  }
})

async function handleLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  flex-shrink: 0;
}

.sidebar--collapsed { width: 68px; }

/* ── Header ── */
.sidebar-header {
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  height: 64px;
}

.brand-icon { font-size: 1.4rem; }

.brand-name {
  font-size: 1.1rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.toggle-btn {
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 1rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.toggle-btn:hover {
  background: var(--color-primary-600);
  color: white;
  border-color: var(--color-primary-600);
}

/* ── Nav ── */
.sidebar-nav {
  flex: 1;
  padding: var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
}
.nav-item:hover {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}
.nav-item--active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  border-left: 4px solid var(--color-primary-500);
}

.dropdown-toggle {
  cursor: pointer;
  user-select: none;
}

.dropdown-chevron {
  margin-left: auto;
  font-size: 0.7rem;
  transition: transform 0.3s ease;
  color: var(--color-text-secondary);
}

.dropdown-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  display: flex;
  flex-direction: column;
  padding-left: 2.5rem;
  background: var(--color-surface-2);
  border-left: 2px solid var(--color-border);
  margin-left: 1rem;
  margin-bottom: 0.5rem;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.dropdown-item:hover {
  background: var(--color-surface-3);
  color: var(--color-primary-500);
}

.dropdown-item--active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  font-weight: 600;
}

.dropdown-empty {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
}
.nav-icon  { font-size: 1.1rem; flex-shrink: 0; }
.nav-label { overflow: hidden; }

/* ── Divider ── */
.sidebar-divider {
  border-top: 1px solid var(--color-border);
  margin: 0;
}

/* ── Auth / Session Section ── */
.auth-section {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth-section--collapsed {
  align-items: center;
  padding: var(--space-3) 0;
}

.session-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.session-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

.session-dot-only {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
  animation: pulse 2s infinite;
  margin: var(--space-2) auto;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

.session-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-success);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.token-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.token-label {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.token-value {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface-3);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  white-space: nowrap;
}

/* ── Footer ── */
.sidebar-footer {
  padding: var(--space-3) var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.user-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.footer-info {
  flex: 1;
  overflow: hidden;
}

.footer-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-role {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

/* ── Icon Buttons (theme + logout) ── */
.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-3);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.icon-btn:hover {
  background: var(--color-surface-2);
  transform: scale(1.08);
}
.icon-btn--danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}
.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
