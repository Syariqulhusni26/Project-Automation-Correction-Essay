<template>
  <!--
    Admin/AdminScoreView.vue
    Rekap nilai mahasiswa per ujian.
  -->
  <div class="admin-layout">
    <Sidebar />
    <div class="admin-body">
      <Navbar />
      <main class="admin-main">
        <div class="admin-content animate-fade-in">

          <!-- Header -->
          <header class="section-header">
            <div>
              <h1 class="page-title">Rekap Nilai Ujian</h1>
              <p v-if="ujian" class="page-subtitle">
                {{ ujian.judul }} · {{ ujian.mata_pelajaran?.nama }}
              </p>
            </div>
            <div class="header-actions">
              <!-- Export Excel -->
              <button
                id="btn-export-excel"
                class="btn btn-secondary"
                @click="exportExcel"
                :disabled="isDownloading"
              >
                📄 {{ isDownloading ? 'Memproses...' : 'Export Excel' }}
                <span v-if="isDownloading" class="spinner" style="width:1rem;height:1rem;border-width:2px;margin-left:0.5rem"></span>
              </button>
            </div>
          </header>

          <!-- Filter -->
          <div class="filter-bar glass-card">
            <input
              id="input-search-mahasiswa"
              v-model="search"
              type="text"
              class="form-input"
              placeholder="Cari nama atau NIM..."
              style="max-width: 300px;"
            />
            <select v-model="filterKelas" class="form-select" style="max-width: 200px;">
              <option value="">Semua Kelas</option>
              <option v-for="kelas in kelasList" :key="kelas" :value="kelas">{{ kelas }}</option>
            </select>
          </div>

          <Loading v-if="loading" message="Memuat rekap nilai..." />

          <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button class="btn btn-secondary btn-sm" @click="fetchData">Coba Lagi</button>
          </div>

          <div v-else class="table-wrapper glass-card" style="padding: 0;">
            <table>
              <thead>
                <tr>
                  <th>Nama Mahasiswa</th>
                  <th>NIM</th>
                  <th>Kelas</th>
                  <th>Status Ujian</th>
                  <th>Nilai Akhir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredList.length === 0">
                  <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
                    Tidak ada data nilai untuk ditampilkan.
                  </td>
                </tr>
                <tr v-for="item in filteredList" :key="item.sesi_id">
                  <td class="font-medium">{{ item.nama }}</td>
                  <td class="text-muted text-sm">{{ item.nim }}</td>
                  <td>{{ item.kelas || '—' }}</td>
                  <td>
                    <StatusBadge
                      :status="item.status === 'selesai' ? 'success' : (item.status === 'berlangsung' ? 'warning' : 'danger')"
                      :label="item.status === 'selesai' ? 'Selesai' : (item.status === 'berlangsung' ? 'Berlangsung' : 'Belum')"
                    />
                  </td>
                  <td class="font-bold text-lg">
                    {{ item.total_nilai ?? 'N/A' }}
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        v-if="item.sesi_id"
                        :id="`btn-export-pdf-${item.sesi_id}`"
                        class="btn btn-sm btn-secondary"
                        @click="exportPdf(item.sesi_id, item.nama)"
                        title="Export PDF Hasil Individu"
                      >
                        📄 PDF
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { laporanApi } from '@/services/api'
import { useDownload } from '@/composables/useDownload'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const route = useRoute()
const { downloadBlob } = useDownload()

const loading = ref(false)
const isDownloading = ref(false)
const error = ref('')
const ujian = ref(null)
const nilaiList = ref([])
const search = ref('')
const filterKelas = ref('')

const ujianId = computed(() => route.params.ujianId)

const kelasList = computed(() =>
  [...new Set(nilaiList.value.map(item => item.kelas))].filter(Boolean).sort()
)

const filteredList = computed(() => {
  let list = nilaiList.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(item =>
      item.nama.toLowerCase().includes(q) ||
      item.nim.toLowerCase().includes(q)
    )
  }
  if (filterKelas.value) {
    list = list.filter(item => item.kelas === filterKelas.value)
  }
  return list
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    if (!ujianId.value || ujianId.value === '0') return
    const { data } = await laporanApi.getNilaiUjian(ujianId.value)
    ujian.value = data.ujian
    nilaiList.value = data.peserta || []
  } catch (err) {
    error.value = 'Gagal memuat rekap nilai: ' + (err.response?.data?.detail || err.message)
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  isDownloading.value = true
  try {
    const response = await laporanApi.exportNilaiExcel(ujianId.value, filterKelas.value)
    const kelas = filterKelas.value || 'Semua-Kelas'
    downloadBlob(response.data, `Nilai-${ujian.value.kode_mapel}-${kelas}.xlsx`)
  } catch (err) {
    alert('Gagal mengunduh file Excel: ' + (err.response?.data?.detail || err.message))
  } finally {
    isDownloading.value = false
  }
}

async function exportPdf(sesiId, nama) {
  try {
    const response = await laporanApi.exportHasilPdf(sesiId)
    downloadBlob(response.data, `Hasil-Ujian-${nama}.pdf`)
  } catch (err) {
    alert('Gagal mengunduh file PDF: ' + (err.response?.data?.detail || err.message))
  }
}

onMounted(fetchData)

watch(ujianId, (newVal) => {
  if (newVal && newVal !== '0') {
    fetchData()
  }
})
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.admin-body   { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.admin-main   { flex: 1; padding: var(--space-6); overflow-y: auto; }
.admin-content{ max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-6); }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
.header-actions { display: flex; gap: var(--space-3); }
.page-title { font-size: 1.4rem; font-weight: 800; }
.page-subtitle { color: var(--color-text-muted); font-size: 0.9rem; margin-top: var(--space-1); }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
}

.error-state {
  text-align: center;
  color: var(--color-danger);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
</style>