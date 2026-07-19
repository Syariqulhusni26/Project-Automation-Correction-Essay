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
              <h1 class="page-title">Rekap Nilai</h1>
              <p v-if="ujian" class="page-subtitle">
                {{ ujian.judul }} · {{ ujian.mata_pelajaran?.nama }}
              </p>
            </div>
            <div class="flex gap-4 items-center">
              <!-- Pilih Ujian -->
              <select
                v-if="ujianId > 0"
                class="form-select"
                style="max-width: 220px;"
                :value="ujianId"
                @change="(e) => $router.push({ name: 'AdminScore', params: { ujianId: e.target.value } })"
              >
                <option disabled value="0">Pilih Ujian...</option>
                <option v-for="u in daftarUjian" :key="u.id" :value="u.id">
                  {{ u.judul }}
                </option>
              </select>
              <!-- Export Excel -->
              <button
                id="btn-export-excel"
                class="btn btn-secondary icon-bounce"
                @click="exportExcel"
                :disabled="isDownloading"
              >
                <span v-if="isDownloading" class="spinner" style="width:1rem;height:1rem;border-width:2px;margin-right:0.5rem"></span>
                <FileSpreadsheet v-else size="16" />
                {{ isDownloading ? 'Memproses...' : 'Export Excel' }}
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
            <select v-model="limit" class="form-select" style="max-width: 150px; margin-left: auto;">
              <option :value="10">10 Baris</option>
              <option :value="20">20 Baris</option>
              <option :value="50">50 Baris</option>
              <option :value="10000">Semua</option>
            </select>
          </div>

          <!-- Empty State -->
          <div v-if="ujianId === 0" class="empty-state glass-card">
            <BarChart2 class="empty-icon text-muted icon-bounce" size="48" style="color: var(--color-primary-400);" />
            <h3>Pilih Ujian untuk Melihat Nilai</h3>
            <p class="text-muted text-sm" style="margin-bottom: 1rem;">
              Silakan pilih salah satu ujian dari daftar di bawah ini.
            </p>
            <Loading v-if="loadingDaftarUjian" message="Memuat daftar ujian..." />
            <div v-else style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 500px; width: 100%;">
              <router-link
                v-for="u in daftarUjian"
                :key="u.id"
                :to="{ name: 'AdminScore', params: { ujianId: u.id } }"
                class="btn btn-secondary text-left"
                style="justify-content: space-between; padding: 0.8rem 1rem;"
              >
                <span class="font-bold">{{ u.judul }}</span>
                <span class="text-muted text-xs">{{ u.kelas_target }}</span>
              </router-link>
              <div v-if="daftarUjian.length === 0" class="text-center text-muted">
                Belum ada ujian yang dibuat.
              </div>
            </div>
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
                  <th>No</th>
                  <th>Nama Mahasiswa</th>
                  <th>NIM</th>
                  <th>Kelas</th>
                  <th>Status Ujian</th>
                  <th>Nilai Akhir</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedList.length === 0">
                  <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
                    Tidak ada data nilai untuk ditampilkan.
                  </td>
                </tr>
                <tr v-for="(item, idx) in paginatedList" :key="item.sesi_id">
                  <td>{{ (currentPage - 1) * limit + idx + 1 }}</td>
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
                        class="btn btn-sm btn-secondary icon-bounce"
                        @click="exportPdf(item.sesi_id, item.nama)"
                        title="Export PDF Hasil Individu"
                      >
                        <FileDown size="14" /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- Pagination Controls -->
            <div class="pagination" v-if="filteredList.length > limit">
              <button class="btn btn-sm btn-secondary" :disabled="currentPage === 1" @click="currentPage--">Sebelumnya</button>
              <span class="page-info">Halaman {{ currentPage }} dari {{ totalPages }}</span>
              <button class="btn btn-sm btn-secondary" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- ── Hidden Printable Template for PDF ── -->
    <div class="pdf-offscreen" aria-hidden="true">
      <div ref="pdfTemplate" class="pdf-template">
        <KopInstitusi />
        <h2 class="pdf-title">TRANSKRIP NILAI UJIAN ESAI</h2>
        
        <div class="pdf-info-section" v-if="pdfData">
          <div class="pdf-info-row">
            <span class="pdf-info-label">Nama Mahasiswa</span>
            <span class="pdf-info-colon">:</span>
            <span class="pdf-info-value"><strong>{{ pdfData.nama }}</strong></span>
          </div>
          <div class="pdf-info-row">
            <span class="pdf-info-label">NIM</span>
            <span class="pdf-info-colon">:</span>
            <span class="pdf-info-value">{{ pdfData.nim }}</span>
          </div>
          <div class="pdf-info-row">
            <span class="pdf-info-label">Kelas</span>
            <span class="pdf-info-colon">:</span>
            <span class="pdf-info-value">{{ pdfData.kelas || '—' }}</span>
          </div>
          <div class="pdf-info-row">
            <span class="pdf-info-label">Judul Ujian</span>
            <span class="pdf-info-colon">:</span>
            <span class="pdf-info-value">{{ ujian?.judul }}</span>
          </div>
          <div class="pdf-info-row">
            <span class="pdf-info-label">Waktu Selesai</span>
            <span class="pdf-info-colon">:</span>
            <span class="pdf-info-value">{{ formatDate(pdfData.waktu_selesai) }}</span>
          </div>
          <div class="pdf-info-row">
            <span class="pdf-info-label">NILAI AKHIR</span>
            <span class="pdf-info-colon">:</span>
            <span class="pdf-info-value"><strong style="font-size: 14pt;">{{ pdfData.hasil?.total_nilai ?? '—' }} / {{ pdfData.hasil?.nilai_maksimal }}</strong></span>
          </div>
        </div>

        <h3 class="pdf-subtitle">Detail Jawaban dan Penilaian</h3>
        
        <div v-for="jawaban in pdfData?.hasil?.jawaban" :key="jawaban.nomor_soal" class="pdf-qa-item">
          <h4 class="pdf-qa-title">Soal {{ jawaban.nomor_soal }} <span style="font-weight: normal; font-size: 11pt;">(Nilai: <strong>{{ jawaban.nilai ?? '—' }}</strong> / 10)</span></h4>
          <div class="pdf-qa-body">
            <p><strong>Pertanyaan:</strong><br/>{{ jawaban.pertanyaan }}</p>
            <p><strong>Jawaban Mahasiswa:</strong><br/>{{ jawaban.teks_jawaban || '(tidak dijawab)' }}</p>
            <p v-if="jawaban.alasan_nilai"><strong>Alasan Penilaian (AI):</strong><br/>{{ jawaban.alasan_nilai }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { laporanApi, ujianApi, submissionApi } from '@/services/api'
import { useDownload } from '@/composables/useDownload'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import KopInstitusi from '@/components/KopInstitusi.vue'
import html2pdf from 'html2pdf.js'
import { FileSpreadsheet, BarChart2, FileDown } from 'lucide-vue-next'
const route = useRoute()
const { downloadBlob } = useDownload()

const loading = ref(false)
const loadingDaftarUjian = ref(false)
const daftarUjian = ref([])
const isDownloading = ref(false)
const error = ref('')
const ujian = ref(null)
const nilaiList = ref([])
const search = ref('')
const filterKelas = ref('')

const limit = ref(10)
const currentPage = ref(1)

const pdfTemplate = ref(null)
const pdfData = ref(null)

const ujianId = computed(() => Number(route.params.ujianId))

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

const totalPages = computed(() => Math.ceil(filteredList.value.length / limit.value) || 1)

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * limit.value
  const end = start + limit.value
  return filteredList.value.slice(start, end)
})

watch([search, filterKelas, limit], () => {
  currentPage.value = 1
})

async function fetchData() {
  try {
    if (daftarUjian.value.length === 0) {
      loadingDaftarUjian.value = true
      const { data } = await ujianApi.getUjianList()
      daftarUjian.value = data || []
      loadingDaftarUjian.value = false
    }
  } catch (err) {
    console.error('Gagal memuat daftar ujian:', err)
    loadingDaftarUjian.value = false
  }

  if (!ujianId.value || ujianId.value === 0) {
    return
  }
  
  loading.value = true
  error.value = ''
  try {
    const { data } = await laporanApi.getNilaiUjian(ujianId.value)
    ujian.value = data.ujian
    nilaiList.value = data.peserta || []
    currentPage.value = 1
  } catch (err) {
    error.value = 'Gagal memuat rekap nilai: ' + (err.response?.data?.detail || err.message)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Invalid Date') return '—'
  const date = new Date(dateStr)
  if (isNaN(date)) return '—'
  return date.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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
  isDownloading.value = true
  try {
    // Ambil detail sesi/hasil dari backend agar pdf bisa di render di frontend
    const { data: detailHasil } = await submissionApi.getHasil(sesiId)
    // Ambil detail tambahan (waktu selesai) dari metadata student list
    const mhs = nilaiList.value.find(m => m.sesi_id === sesiId)
    
    pdfData.value = {
      nama: mhs?.nama || nama,
      nim: mhs?.nim || '—',
      kelas: mhs?.kelas || filterKelas.value,
      waktu_selesai: mhs?.waktu_selesai || null,
      hasil: detailHasil
    }

    await nextTick()

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Transkrip-Nilai-${nama}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    await html2pdf().set(opt).from(pdfTemplate.value).save()
  } catch (err) {
    alert('Gagal mengunduh file PDF: ' + (err.response?.data?.detail || err.message))
  } finally {
    isDownloading.value = false
    pdfData.value = null
  }
}

onMounted(fetchData)

watch(ujianId, (newVal) => {
  fetchData()
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-12);
}
.empty-icon { font-size: 3rem; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
}
.page-info {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* ── Printable Template (Off-screen) ── */
.pdf-offscreen {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 800px;
  background: white;
  z-index: -100;
}

.pdf-template {
  background: white !important;
  color: #000 !important;
  padding: 10mm;
  font-family: 'Times New Roman', Times, serif;
  width: 210mm; /* A4 width approx */
  min-height: 297mm;
  box-sizing: border-box;
}

.pdf-template * {
  color: #000 !important;
}

.pdf-title {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin-bottom: 25px;
  text-decoration: underline;
}

.pdf-info-section {
  margin-bottom: 30px;
  font-size: 12pt;
  line-height: 1.6;
}

.pdf-info-row {
  display: flex;
  margin-bottom: 4px;
}

.pdf-info-label {
  width: 140px;
  flex-shrink: 0;
}

.pdf-info-colon {
  width: 15px;
  flex-shrink: 0;
}

.pdf-info-value {
  flex-grow: 1;
}

.pdf-subtitle {
  font-size: 13pt;
  font-weight: bold;
  margin-bottom: 15px;
  border-bottom: 1px solid #000;
  padding-bottom: 5px;
}

.pdf-qa-item {
  margin-bottom: 25px;
  page-break-inside: avoid;
}

.pdf-qa-title {
  font-size: 12pt;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.pdf-qa-body {
  font-size: 11pt;
  line-height: 1.5;
  padding-left: 10px;
  border-left: 2px solid #ccc;
}

.pdf-qa-body p {
  margin: 0 0 10px 0;
}

.pdf-qa-body p:last-child {
  margin-bottom: 0;
}
</style>