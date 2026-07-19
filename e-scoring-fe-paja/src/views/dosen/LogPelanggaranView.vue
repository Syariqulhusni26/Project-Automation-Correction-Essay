<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchAll } from '../../api/client'

const loading = ref(true)
const error = ref(null)
const logs = ref([])
const ujianFilter = ref('')
const ujianList = ref([])
const search = ref('')

const filtered = computed(() => {
  let rows = logs.value
  if (ujianFilter.value) rows = rows.filter((l) => l.ujian === ujianFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (l) => l.mahasiswa.toLowerCase().includes(q) || String(l.nim).includes(q)
    )
  }
  return rows
})

onMounted(async () => {
  try {
    const list = await fetchAll('/ujian/')
    ujianList.value = list.map((u) => u.judul)

    // Gabungkan log pelanggaran dari semua ujian (endpoint backend per ujian)
    const hasil = await Promise.allSettled(
      list.map((u) =>
        fetchAll(`/laporan/log-pelanggaran/${u.id}/`).then((rows) => ({
          ujian: u.judul,
          rows,
        }))
      )
    )
    const semua = []
    for (const h of hasil) {
      if (h.status !== 'fulfilled') continue
      for (const row of h.value.rows) semua.push({ ...row, ujian: h.value.ujian })
    }
    semua.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    logs.value = semua
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat log pelanggaran.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h2 class="h4 fw-bold mb-0">Log Pelanggaran</h2>
        <p class="text-secondary small mb-0">Seluruh catatan kecurangan dari semua ujian sebagai bukti audit</p>
      </div>
      <div class="input-group input-group-sm toolbar-filter">
        <span class="input-group-text bg-body"><i class="bi bi-search"></i></span>
        <input v-model="search" type="text" class="form-control" placeholder="Cari nama / NIM…" />
        <select v-model="ujianFilter" class="form-select flex-grow-0 w-auto">
          <option value="">Semua ujian</option>
          <option v-for="j in ujianList" :key="j" :value="j">{{ j }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="filtered.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <div class="empty-icon mx-auto mb-3"><i class="bi bi-shield-check"></i></div>
        <p class="text-secondary mb-0">
          {{ logs.length === 0 ? 'Tidak ada pelanggaran tercatat.' : 'Tidak ada pelanggaran yang cocok dengan filter.' }}
        </p>
      </div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-header bg-body fw-semibold d-flex justify-content-between align-items-center">
        <span>Catatan Pelanggaran</span>
        <span class="badge text-bg-danger">{{ filtered.length }} kejadian</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Waktu</th>
              <th>Mahasiswa</th>
              <th class="d-none d-sm-table-cell">NIM</th>
              <th class="d-none d-md-table-cell">Ujian</th>
              <th>Jenis Pelanggaran</th>
              <th class="d-none d-lg-table-cell">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, i) in filtered" :key="i">
              <td class="small text-nowrap">{{ log.timestamp }}</td>
              <td class="fw-semibold">{{ log.mahasiswa }}</td>
              <td class="d-none d-sm-table-cell">{{ log.nim }}</td>
              <td class="d-none d-md-table-cell small">{{ log.ujian }}</td>
              <td><span class="badge text-bg-danger">{{ log.tipe_display }}</span></td>
              <td class="d-none d-lg-table-cell small text-secondary">{{ log.keterangan || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar-filter {
  max-width: 420px;
  flex-wrap: nowrap;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(4, 120, 87, 0.1);
  color: #047857;
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
