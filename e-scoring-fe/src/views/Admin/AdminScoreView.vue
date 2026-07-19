<template>
  <!--
    Admin/AdminScoreView.vue
    Rekap nilai ujian seluruh mahasiswa.
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
              <router-link :to="{ name: 'AdminDashboard' }" class="back-link">← Kembali ke Dashboard</router-link>
              <h1 class="page-title">Rekap Nilai Ujian</h1>
              <p class="page-subtitle" v-if="ujianInfo">{{ ujianInfo.judul }} · {{ ujianInfo.kode }}</p>
            </div>
            <div class="flex gap-4" v-if="ujianId > 0">
              <!-- Pilih Ujian -->
              <select
                class="form-select"
                style="max-width: 220px;"
                :value="ujianId"
                @change="(e) => $router.push({ name: 'AdminScore', params: { ujianId: e.target.value } }).then(() => window.location.reload())"
              >
                <option disabled value="0">Pilih Ujian...</option>
                <option v-for="u in daftarUjian" :key="u.id" :value="u.id">
                  {{ u.judul }}
                </option>
              </select>

              <!-- Filter Kelas -->
              <select
                id="select-filter-kelas"
                v-model="filterKelas"
                class="form-select"
                style="max-width: 180px;"
              >
                <option value="">Semua Kelas</option>
                <option v-for="k in kelasList" :key="k" :value="k">{{ k }}</option>
              </select>
              <!-- Export Excel -->
              <button
                id="btn-export-excel"
                class="btn btn-secondary"
                @click="exportExcel"
              >
                📊 Export Excel
              </button>
            </div>
          </header>

          <!-- Pilih ujian dulu jika akses dari sidebar (ujianId = 0) -->
          <div v-if="ujianId === 0" class="empty-state glass-card">
            <span class="empty-icon">📊</span>
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

          <template v-else>
            <Loading v-if="loading" message="Memuat rekap nilai..." />

            <template v-else>
              <!-- Summary Stats -->
              <div class="stats-grid">
                <div class="stat-card glass-card" v-for="stat in stats" :key="stat.label">
                  <div class="stat-icon">{{ stat.icon }}</div>
                  <div class="stat-body">
                    <span class="stat-value">{{ stat.value }}</span>
                    <span class="stat-label">{{ stat.label }}</span>
                  </div>
                </div>
              </div>

              <!-- Tabel Nilai -->
              <div class="glass-card" style="padding: 0; overflow: hidden;">
                <div class="section-card-header">
                  <h2 class="section-title">Daftar Nilai ({{ filteredPeserta.length }} mahasiswa)</h2>
                </div>
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nama</th>
                        <th>NIM</th>
                        <th>Kelas</th>
                        <th>Total Nilai</th>
                        <th>Maks</th>
                        <th>%</th>
                        <th>Status</th>
                        <th>PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="filteredPeserta.length === 0">
                        <td colspan="9" class="text-center text-muted" style="padding: 2rem;">
                          Belum ada mahasiswa yang submit ujian ini.
                        </td>
                      </tr>
                      <tr v-for="(item, idx) in filteredPeserta" :key="item.sesi_id">
                        <td class="text-muted text-sm">{{ idx + 1 }}</td>
                        <td class="font-medium">{{ item.nama }}</td>
                        <td class="text-muted text-sm">{{ item.nim }}</td>
                        <td>{{ item.kelas }}</td>
                        <td class="font-bold" :class="getScoreClass(item)">
                          {{ item.total_nilai ?? '—' }}
                        </td>
                        <td class="text-muted text-sm">{{ item.nilai_maksimal }}</td>
                        <td>
                          {{ item.total_nilai != null
                            ? Math.round((item.total_nilai / item.nilai_maksimal) * 100)
                            : '—' }}%
                        </td>
                        <td>
                          <StatusBadge
                            :status="item.status === 'selesai' ? 'success' : 'warning'"
                            :label="item.status === 'selesai' ? 'Selesai' : (item.status === 'berlangsung' ? 'Berlangsung' : 'Belum')"
                          />
                        </td>
                        <td>
                          <button
                            :id="`btn-pdf-${item.sesi_id}`"
                            class="btn btn-sm btn-secondary"
                            @click="exportPDF(item.sesi_id, item.nama)"
                            title="Download PDF Transkrip"
                            :disabled="item.status !== 'selesai'"
                          >
                            📄
                            <span v-if="downloadingPdfId === item.sesi_id" class="spinner" style="width:0.8rem;height:0.8rem;border-width:2px;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);"></span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </template>

        </div>
      </main>
    </div>

    <!-- ── Hidden Printable Template for PDF ── -->
    <div class="pdf-offscreen" aria-hidden="true">
      <div ref="pdfTemplate" class="pdf-template">
        <KopInstitusi />
        <h2 class="pdf-title">TRANSKRIP NILAI UJIAN ESAI</h2>
        
        <table class="pdf-info-table" v-if="currentPdfData">
          <tr>
            <td width="120">Nama Mahasiswa</td>
            <td width="10">:</td>
            <td><strong>{{ currentPdfData.mahasiswa?.nama }}</strong></td>
          </tr>
          <tr>
            <td>NIM</td>
            <td>:</td>
            <td>{{ currentPdfData.mahasiswa?.nim }}</td>
          </tr>
          <tr>
            <td>Kelas</td>
            <td>:</td>
            <td>{{ currentPdfData.mahasiswa?.kelas || '—' }}</td>
          </tr>
          <tr>
            <td>Judul Ujian</td>
            <td>:</td>
            <td>{{ currentPdfData.hasil?.ujian_judul }}</td>
          </tr>
        </table>

        <div class="pdf-score-box">
          <div class="pdf-score-label">NILAI AKHIR</div>
          <div class="pdf-score-value">{{ currentPdfData?.hasil?.total_nilai ?? '—' }} / {{ currentPdfData?.hasil?.nilai_maksimal }}</div>
        </div>

        <h3 class="pdf-subtitle">Detail Jawaban dan Penilaian</h3>
        
        <div v-for="jawaban in currentPdfData?.hasil?.jawaban" :key="jawaban.nomor_soal" class="pdf-qa-item">
          <div class="pdf-qa-header">
            <strong>Soal {{ jawaban.nomor_soal }}</strong>
            <span style="float:right;">Nilai: <strong>{{ jawaban.nilai ?? '—' }}</strong> / 10</span>
          </div>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { laporanApi, ujianApi, submissionApi } from '@/services/api'
import { useDownload }  from '@/composables/useDownload'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import KopInstitusi from '@/components/KopInstitusi.vue'
import html2pdf from 'html2pdf.js'

const route  = useRoute()
const ujianId = Number(route.params.ujianId)
const { downloadBlob } = useDownload()

const loading      = ref(false)
const loadingDaftarUjian = ref(false)
const daftarUjian  = ref([])   // Untuk ujianId === 0

const pesertaList  = ref([])   // Dari response.peserta
const kelasList    = ref([])   // Dari response.kelas_list
const ujianInfo    = ref(null) // Dari response.ujian
const filterKelas  = ref('')

const pdfTemplate = ref(null)
const currentPdfData = ref(null)
const downloadingPdfId = ref(null)

// Filter peserta berdasarkan kelas yang dipilih
const filteredPeserta = computed(() =>
  filterKelas.value
    ? pesertaList.value.filter(p => p.kelas === filterKelas.value)
    : pesertaList.value
)

// Stats ringkasan
const stats = computed(() => {
  const selesai = filteredPeserta.value.filter(p => p.total_nilai != null)
  const avg = selesai.length
    ? Math.round(selesai.reduce((s, p) => s + p.total_nilai, 0) / selesai.length)
    : 0
  const max = selesai.length ? Math.max(...selesai.map(p => p.total_nilai)) : 0
  const min = selesai.length ? Math.min(...selesai.map(p => p.total_nilai)) : 0

  return [
    { icon: '👥', label: 'Total Peserta',   value: filteredPeserta.value.length },
    { icon: '📊', label: 'Rata-rata Nilai', value: avg },
    { icon: '🏆', label: 'Nilai Tertinggi', value: max },
    { icon: '📉', label: 'Nilai Terendah',  value: min },
  ]
})

function getScoreClass(item) {
  if (item.total_nilai == null) return 'text-muted'
  const pct = (item.total_nilai / item.nilai_maksimal) * 100
  if (pct >= 75) return 'text-success'
  if (pct >= 50) return 'text-warning'
  return 'text-danger'
}

async function fetchData() {
  // Selalu muat daftar ujian agar dropdown bisa tampil
  try {
    const { data } = await ujianApi.getUjianDashboard()
    daftarUjian.value = data || []
  } catch (err) {
    console.error('Gagal memuat daftar ujian:', err)
  }

  if (ujianId === 0) {
    return
  }
  
  loading.value = true
  try {
    const { data } = await laporanApi.getNilaiUjian(ujianId)
    // Backend mengembalikan: { ujian, kelas_list, kelas_filter, peserta }
    ujianInfo.value  = data.ujian
    kelasList.value  = data.kelas_list || []
    pesertaList.value = data.peserta || []
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  const { data } = await laporanApi.exportExcel(ujianId, filterKelas.value)
  downloadBlob(data, `rekap-nilai-ujian-${ujianId}.xlsx`)
}

async function exportPDF(sesiId, nama) {
  downloadingPdfId.value = sesiId
  try {
    // Ambil detail hasil ujian dari backend
    const { data } = await submissionApi.getHasil(sesiId)
    // Cari data mahasiswa
    const mhs = pesertaList.value.find(p => p.sesi_id === sesiId)
    
    currentPdfData.value = {
      hasil: data,
      mahasiswa: mhs
    }
    
    // Tunggu DOM update
    await nextTick()
    
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Transkrip-${nama.replace(/\s+/g, '-')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    await html2pdf().set(opt).from(pdfTemplate.value).save()
  } catch (err) {
    console.error('Gagal export PDF:', err)
    alert('Terjadi kesalahan saat memuat atau membuat PDF transkrip.')
  } finally {
    downloadingPdfId.value = null
  }
}

onMounted(fetchData)
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.admin-body   { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.admin-main   { flex: 1; padding: var(--space-6); overflow-y: auto; }
.admin-content{ max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-6); }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
.page-title { font-size: 1.4rem; font-weight: 800; margin-top: var(--space-1); }
.page-subtitle { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 2px; }
.back-link  { font-size: 0.85rem; color: var(--color-primary-400); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-4);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}

.stat-icon { font-size: 1.8rem; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: var(--color-primary-400); line-height: 1; }
.stat-label { font-size: 0.78rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

.section-card-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.section-title { font-size: 1rem; font-weight: 700; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-12);
}
.empty-icon { font-size: 3rem; }

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
  background: white;
  color: #000;
  padding: 10mm;
  font-family: 'Times New Roman', Times, serif;
  width: 210mm;
  min-height: 297mm;
  box-sizing: border-box;
}

.pdf-title {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin-bottom: 20px;
  text-decoration: underline;
}

.pdf-info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 11pt;
}

.pdf-info-table td {
  padding: 4px;
  vertical-align: top;
}

.pdf-score-box {
  border: 2px solid #000;
  padding: 15px;
  text-align: center;
  margin-bottom: 30px;
  background-color: #f9f9f9;
}

.pdf-score-label {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 5px;
}

.pdf-score-value {
  font-size: 24pt;
  font-weight: bold;
}

.pdf-subtitle {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 15px;
  border-bottom: 1px solid #000;
  padding-bottom: 5px;
}

.pdf-qa-item {
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.pdf-qa-header {
  background: #f0f0f0;
  padding: 8px;
  border: 1px solid #000;
  border-bottom: none;
  font-size: 11pt;
}

.pdf-qa-body {
  border: 1px solid #000;
  padding: 10px;
  font-size: 10pt;
  line-height: 1.5;
}

.pdf-qa-body p {
  margin: 0 0 10px 0;
}

.pdf-qa-body p:last-child {
  margin-bottom: 0;
}
</style>
