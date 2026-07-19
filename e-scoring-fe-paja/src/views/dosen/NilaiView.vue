<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchAll } from '../../api/client'

const loading = ref(true)
const error = ref(null)
const list = ref([])
const search = ref('')

const statusBadge = {
  draft: 'text-bg-secondary',
  aktif: 'text-bg-success',
  selesai: 'status-selesai',
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return list.value
  return list.value.filter(
    (u) =>
      u.judul.toLowerCase().includes(q) ||
      u.mata_kuliah_kode.toLowerCase().includes(q) ||
      u.mata_kuliah_nama.toLowerCase().includes(q)
  )
})

// Paginasi sisi klien
const page = ref(1)
const perPage = 25
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * perPage, page.value * perPage)
)
watch(search, () => { page.value = 1 })
watch(totalPages, (n) => { if (page.value > n) page.value = n })

onMounted(async () => {
  try {
    list.value = await fetchAll('/ujian/')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat daftar ujian.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4">
    <div class="mb-3">
      <h2 class="h4 fw-bold mb-0">Nilai Ujian</h2>
      <p class="text-secondary small mb-0">Pilih ujian untuk melihat rekap nilai, distribusi, dan export laporan</p>
    </div>

    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="list.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <div class="empty-icon mx-auto mb-3"><i class="bi bi-clipboard-data"></i></div>
        <p class="text-secondary mb-3">Belum ada ujian. Nilai akan muncul setelah ujian dibuat dan dikerjakan mahasiswa.</p>
        <router-link :to="{ name: 'ujian-list' }" class="btn btn-primary">
          <i class="bi bi-plus-lg me-1"></i>Buat Ujian
        </router-link>
      </div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="input-group input-group-sm" style="max-width: 260px">
          <span class="input-group-text bg-body"><i class="bi bi-search"></i></span>
          <input v-model="search" type="text" class="form-control" placeholder="Cari judul / mata kuliah…" />
        </div>
        <span class="badge text-bg-light border">{{ filtered.length }} ujian</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Judul Ujian</th>
              <th class="d-none d-md-table-cell">Mata Kuliah</th>
              <th class="d-none d-lg-table-cell">Kelas</th>
              <th class="text-center">Status</th>
              <th class="text-center d-none d-sm-table-cell">Nilai Maks</th>
              <th class="text-end">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="6" class="text-center text-secondary py-4">Tidak ada ujian yang cocok dengan pencarian.</td>
            </tr>
            <tr v-for="u in paged" :key="u.id">
              <td class="fw-semibold">{{ u.judul }}</td>
              <td class="d-none d-md-table-cell">{{ u.mata_kuliah_nama }}</td>
              <td class="d-none d-lg-table-cell">{{ u.kelas_target }}</td>
              <td class="text-center"><span class="badge" :class="statusBadge[u.status]">{{ u.status_display }}</span></td>
              <td class="text-center d-none d-sm-table-cell">{{ u.nilai_maksimal }}</td>
              <td class="text-end">
                <router-link :to="{ name: 'ujian-laporan', params: { id: u.id } }" class="btn btn-sm btn-primary">
                  <i class="bi bi-clipboard-data me-1"></i>Lihat Nilai
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginasi -->
      <div v-if="totalPages > 1" class="card-footer bg-body d-flex justify-content-between align-items-center">
        <span class="small text-secondary">
          Menampilkan {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, filtered.length) }} dari {{ filtered.length }}
        </span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" :disabled="page === 1" @click="page--">
            <i class="bi bi-chevron-left"></i>
          </button>
          <span class="btn btn-outline-secondary disabled">Hal {{ page }}/{{ totalPages }}</span>
          <button class="btn btn-outline-secondary" :disabled="page === totalPages" @click="page++">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.08);
  color: #7c3aed;
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
