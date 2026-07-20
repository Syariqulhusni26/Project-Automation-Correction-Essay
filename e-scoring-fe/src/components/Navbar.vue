<template>
  <!--
    Navbar.vue
    Navigasi atas untuk halaman mahasiswa (Dashboard).
    Menampilkan logo, nama user, dan tombol logout.
  -->
  <nav class="navbar">
    <div class="navbar-inner">
      <div class="navbar-left">
        <!-- Hamburger Menu (Mobile Only) -->
        <button class="mobile-menu-btn" @click="toggleMobileSidebar" v-if="auth.isDosen">
          <Menu size="24" />
        </button>

        <!-- Logo & Brand -->
        <router-link :to="brandLink" class="navbar-brand">
          <img src="/logo-pnl.png" alt="PNL" class="brand-logo-nav" />
          <span class="brand-name">SAGE</span>
        </router-link>
      </div>

      <!-- Right Side -->
      <div class="navbar-right" :class="{ 'dosen-mobile-hide': auth.isDosen }">
        <div class="user-chip">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-info">
            <span class="user-name">{{ auth.user?.nama_lengkap || auth.user?.username }}</span>
            <span class="user-role">{{ roleLabel }}</span>
          </div>
        </div>

        <button
          id="btn-logout"
          class="btn btn-secondary btn-sm icon-slide"
          @click="handleLogout"
          :disabled="loggingOut"
        >
          <span v-if="loggingOut" class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
          <template v-else><LogOut size="15" style="margin-right: 4px;" />Keluar</template>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { LogOut, Menu } from 'lucide-vue-next'

const auth = useAuthStore()
const loggingOut = ref(false)

const brandLink = computed(() =>
  auth.isDosen ? '/admin/dashboard' : '/'
)

const roleLabel = computed(() =>
  auth.isDosen ? 'Dosen' : `Mahasiswa — ${auth.user?.kelas || ''}`
)

const userInitial = computed(() => {
  const name = auth.user?.nama_lengkap || auth.user?.username || '?'
  return name.charAt(0).toUpperCase()
})

async function handleLogout() {
  loggingOut.value = true
  await auth.logout()
  loggingOut.value = false
}

function toggleMobileSidebar() {
  document.body.classList.toggle('mobile-sidebar-open')
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
}

.navbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
}

.brand-icon {
  color: var(--color-accent-400);
  flex-shrink: 0;
}

.brand-name {
  font-size: 1.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: 4px;
}

.brand-logo-nav {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-accent-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.user-role {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

/* ===================================================
   Responsive Mobile Media Queries
   =================================================== */
@media (max-width: 768px) {
  .user-chip {
    display: none !important;
  }
  .navbar-right.dosen-mobile-hide {
    display: none !important;
  }
  .mobile-menu-btn {
    display: inline-flex;
  }
}
</style>
