<template>
  <!-- Router view utama — layout ditangani masing-masing halaman -->
  <RouterView />
</template>

<script setup>
import { RouterView, useRoute } from 'vue-router'
import { watch, onMounted }     from 'vue'
import { useThemeStore }        from '@/stores/theme'

const route      = useRoute()
const themeStore = useThemeStore()

// Admin pages: terapkan class admin-light / hapus saat dark
function applyAdminTheme() {
  const isAdminRoute = route.name?.toString().startsWith('Admin')
  if (isAdminRoute) {
    document.documentElement.classList.toggle('admin-light', !themeStore.isDark)
    document.documentElement.classList.remove('light-mode')
  } else {
    // Halaman mahasiswa: hapus admin theme
    document.documentElement.classList.remove('admin-light')
  }
}

// Watch tema berubah
watch(() => themeStore.isDark, () => applyAdminTheme())
// Watch route berubah
watch(() => route.name, () => applyAdminTheme())

onMounted(() => applyAdminTheme())
</script>
