<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const tujuan = computed(() => {
  if (!auth.isLoggedIn) return { name: 'landing' }
  return auth.isDosen ? { name: 'dosen-dashboard' } : { name: 'ujian-tersedia' }
})
</script>

<template>
  <div class="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center px-3">
    <div class="nf-icon mb-4"><i class="bi bi-compass"></i></div>
    <h1 class="display-4 fw-bold mb-1">404</h1>
    <p class="h5 fw-semibold mb-2">Halaman tidak ditemukan</p>
    <p class="text-secondary mb-4">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
    <router-link :to="tujuan" class="btn btn-primary rounded-pill px-4">
      <i class="bi bi-house me-1"></i>Kembali ke Beranda
    </router-link>
  </div>
</template>

<style scoped>
.nf-icon {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.08);
  color: #7c3aed;
  font-size: 2.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
