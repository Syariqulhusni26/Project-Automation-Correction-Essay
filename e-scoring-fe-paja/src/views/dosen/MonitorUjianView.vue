<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import client from '../../api/client'

const route = useRoute()
const ujianId = route.params.id

const loading = ref(true)
const error = ref(null)
const ujian = ref(null)
const peserta = ref([])
const lastUpdate = ref(null)
const search = ref('')
const statusFilter = ref('')
let timer = null

const filtered = computed(() => {
  let rows = peserta.value
  if (statusFilter.value) rows = rows.filter((p) => p.status === statusFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (p) => p.mahasiswa_nama.toLowerCase().includes(q) || String(p.mahasiswa_nim).includes(q)
    )
  }
  return rows
})

const statusBadge = {
  berlangsung: 'text-bg-primary',
  selesai: 'text-bg-success',
  pelanggaran: 'text-bg-danger',
}

async function load() {
  try {
    const { data } = await client.get(`/ujian/${ujianId}/monitor/`)
    ujian.value = data.ujian
    peserta.value = data.peserta
    lastUpdate.value = new Date().toLocaleTimeString('id-ID')
    error.value = null
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat data monitor.'
  } finally {
    loading.value = false
  }
}

// Polling hanya saat tab terlihat — tidak membebani server saat dosen pindah tab
function mulaiPolling() {
  clearInterval(timer)
  timer = setInterval(load, 10000)
}
function onVisibility() {
  if (document.hidden) {
    clearInterval(timer)
  } else {
    load()
    mulaiPolling()
  }
}

onMounted(() => {
  load()
  mulaiPolling()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="container py-4">
    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="error && !ujian" class="alert alert-danger">{{ error }}</div>

    <template v-else>
      <router-link :to="{ name: 'ujian-detail', params: { id: ujianId } }" class="btn-back mb-3">
        <i class="bi bi-arrow-left me-1"></i>Kembali ke detail ujian
      </router-link>
      <div class="d-flex flex-wrap justify-content-between align-items-center mt-1 mb-4 gap-2">
        <h1 class="h4 fw-bold mb-0">
          <i class="bi bi-display me-2"></i>Monitor: {{ ujian.judul }}
        </h1>
        <span class="small text-secondary d-flex align-items-center gap-2">
          <span><i class="bi bi-arrow-repeat me-1"></i>Auto-refresh 10 detik — terakhir {{ lastUpdate }}</span>
          <button class="btn btn-sm btn-outline-secondary" title="Refresh sekarang" @click="load">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </span>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-4">
          <button
            class="card card-hover border-0 shadow-sm text-center w-100 stat-btn"
            :class="{ 'stat-btn-active': statusFilter === 'berlangsung' }"
            @click="statusFilter = statusFilter === 'berlangsung' ? '' : 'berlangsung'"
          >
            <div class="card-body py-2">
              <div class="fs-4 fw-bold text-primary">{{ peserta.filter(p => p.status === 'berlangsung').length }}</div>
              <div class="small text-secondary">Sedang Mengerjakan</div>
            </div>
          </button>
        </div>
        <div class="col-4">
          <button
            class="card card-hover border-0 shadow-sm text-center w-100 stat-btn"
            :class="{ 'stat-btn-active': statusFilter === 'selesai' }"
            @click="statusFilter = statusFilter === 'selesai' ? '' : 'selesai'"
          >
            <div class="card-body py-2">
              <div class="fs-4 fw-bold text-success">{{ peserta.filter(p => p.status === 'selesai').length }}</div>
              <div class="small text-secondary">Selesai</div>
            </div>
          </button>
        </div>
        <div class="col-4">
          <button
            class="card card-hover border-0 shadow-sm text-center w-100 stat-btn"
            :class="{ 'stat-btn-active': statusFilter === 'pelanggaran' }"
            @click="statusFilter = statusFilter === 'pelanggaran' ? '' : 'pelanggaran'"
          >
            <div class="card-body py-2">
              <div class="fs-4 fw-bold text-danger">{{ peserta.filter(p => p.status === 'pelanggaran').length }}</div>
              <div class="small text-secondary">Pelanggaran</div>
            </div>
          </button>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="input-group input-group-sm" style="max-width: 240px">
            <span class="input-group-text bg-body"><i class="bi bi-search"></i></span>
            <input v-model="search" type="text" class="form-control" placeholder="Cari nama / NIM…" />
          </div>
          <span class="badge text-bg-light border">{{ filtered.length }} peserta</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Nama</th>
                <th>NIM</th>
                <th>Kelas</th>
                <th>Mulai</th>
                <th>Selesai</th>
                <th class="text-center">Nilai</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered.length === 0">
                <td colspan="7" class="text-center text-secondary py-4">
                  {{ peserta.length === 0 ? 'Belum ada peserta yang memulai ujian.' : 'Tidak ada peserta yang cocok dengan filter.' }}
                </td>
              </tr>
              <tr v-for="p in filtered" :key="p.id">
                <td class="fw-semibold">{{ p.mahasiswa_nama }}</td>
                <td>{{ p.mahasiswa_nim }}</td>
                <td>{{ p.mahasiswa_kelas }}</td>
                <td class="small">{{ p.waktu_mulai }}</td>
                <td class="small">{{ p.waktu_selesai || '—' }}</td>
                <td class="text-center">
                  <span v-if="p.total_nilai !== null" class="fw-bold">{{ p.total_nilai }}/{{ p.nilai_maksimal }}</span>
                  <span v-else class="text-secondary">—</span>
                </td>
                <td class="text-center">
                  <span class="badge" :class="statusBadge[p.status]">{{ p.status_display }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat-btn {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.stat-btn-active {
  border: 1px solid var(--aes-primary) !important;
  box-shadow: 0 0 0 0.15rem rgba(124, 58, 237, 0.2) !important;
}
</style>
