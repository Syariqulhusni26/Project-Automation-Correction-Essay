<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import client, { fetchAll } from '../../api/client'
import { downloadFile } from '../../api/download'
import { useThemeStore } from '../../stores/theme'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const theme = useThemeStore()

const route = useRoute()
const ujianId = route.params.id

const tab = ref('nilai')
const loading = ref(true)
const error = ref(null)

const laporan = ref(null)
const mataKuliahNama = ref('')
const kelasFilter = ref('')
const searchPeserta = ref('')
const sortBy = ref('nama') // nama | nilai-desc | nilai-asc
const detailPeserta = ref(null) // peserta yang dibuka di modal detail per soal
const detailHasil = ref(null)   // hasil lengkap (soal + jawaban + alasan AI), dimuat saat modal dibuka
const loadingDetail = ref(false)
const pelanggaran = ref([])
const loadingLog = ref(false)
const downloading = ref(false)

const pesertaFiltered = computed(() => {
  if (!laporan.value) return []
  let rows = laporan.value.peserta
  const q = searchPeserta.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter((p) => p.nama.toLowerCase().includes(q) || String(p.nim).includes(q))
  }
  rows = [...rows]
  // "—" (belum dinilai / pelanggaran) dianggap tidak punya nilai → selalu di urutan paling bawah
  const skor = (p) => {
    if (p.total_nilai === null || p.total_nilai === undefined || p.total_nilai === '') return null
    const v = Number(p.total_nilai)
    return Number.isFinite(v) ? v : null
  }
  if (sortBy.value === 'nilai-desc') {
    rows.sort((a, b) => (skor(b) ?? -Infinity) - (skor(a) ?? -Infinity))
  } else if (sortBy.value === 'nilai-asc') {
    rows.sort((a, b) => (skor(a) ?? Infinity) - (skor(b) ?? Infinity))
  } else {
    rows.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }
  return rows
})

const nilaiBadge = (n) =>
  n === 10 ? 'text-bg-success' : n === 5 ? 'text-bg-warning' : 'text-bg-danger'

const statusBadge = {
  berlangsung: 'text-bg-primary',
  selesai: 'text-bg-success',
  pelanggaran: 'text-bg-danger',
}

// Distribusi nilai (persentase dari nilai maksimal) — dihitung dari data laporan
const distribusi = computed(() => {
  const bins = [0, 0, 0, 0, 0] // 0–20, 21–40, 41–60, 61–80, 81–100 (%)
  if (!laporan.value) return bins
  for (const p of laporan.value.peserta) {
    if (p.total_nilai === null || !p.nilai_maksimal) continue
    const persen = (p.total_nilai / p.nilai_maksimal) * 100
    bins[Math.min(4, Math.floor(persen / 20.00001))] += 1
  }
  return bins
})
const adaNilai = computed(() => distribusi.value.some((v) => v > 0))

const barData = computed(() => ({
  labels: ['0–20%', '21–40%', '41–60%', '61–80%', '81–100%'],
  datasets: [
    {
      data: distribusi.value,
      backgroundColor: '#7c3aed',
      borderRadius: 4,
      maxBarThickness: 42,
    },
  ],
}))
const barOptions = computed(() => {
  const textColor = theme.mode === 'dark' ? '#d8d2e8' : '#374151'
  const gridColor = theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // Legend dimatikan: satu seri saja, judul kartu sudah menamainya
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} mahasiswa` } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, color: textColor }, grid: { color: gridColor } },
      x: { ticks: { color: textColor }, grid: { display: false } },
    },
  }
})

async function loadNilai() {
  loading.value = true
  try {
    const q = kelasFilter.value ? `?kelas=${encodeURIComponent(kelasFilter.value)}` : ''
    const { data } = await client.get(`/laporan/nilai/${ujianId}/${q}`)
    laporan.value = data
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat laporan.'
  } finally {
    loading.value = false
  }
}

async function loadMataKuliahNama() {
  try {
    const { data } = await client.get(`/ujian/${ujianId}/`)
    mataKuliahNama.value = data.mata_kuliah_nama
  } catch {
    // biarkan kosong — bukan bagian penting halaman
  }
}

async function loadPelanggaran() {
  loadingLog.value = true
  try {
    pelanggaran.value = await fetchAll(`/laporan/log-pelanggaran/${ujianId}/`)
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat log pelanggaran.'
  } finally {
    loadingLog.value = false
  }
}

async function exportExcel() {
  downloading.value = true
  try {
    const q = kelasFilter.value ? `?kelas=${encodeURIComponent(kelasFilter.value)}` : ''
    await downloadFile(`/laporan/export/excel/${ujianId}/${q}`, 'laporan_nilai.xlsx')
  } catch {
    error.value = 'Gagal mengunduh Excel.'
  } finally {
    downloading.value = false
  }
}

async function bukaDetail(p) {
  detailPeserta.value = p
  detailHasil.value = null
  loadingDetail.value = true
  try {
    const { data } = await client.get(`/submission/hasil/${p.sesi_id}/`)
    detailHasil.value = data
  } catch {
    // endpoint hasil tidak bisa diakses — modal tetap tampil dengan ringkasan nilai per soal
  } finally {
    loadingDetail.value = false
  }
}

async function exportPdf(p) {
  try {
    await downloadFile(`/laporan/export/pdf/${p.sesi_id}/`, `hasil_${p.nim}.pdf`)
  } catch {
    error.value = `Gagal mengunduh PDF untuk ${p.nama}.`
  }
}

watch(kelasFilter, loadNilai)
watch(tab, (t) => {
  if (t === 'pelanggaran' && pelanggaran.value.length === 0) loadPelanggaran()
})

onMounted(() => {
  loadNilai()
  loadMataKuliahNama()
})
</script>

<template>
  <div class="container py-4">
    <router-link :to="{ name: 'ujian-detail', params: { id: ujianId } }" class="btn-back mb-3">
      <i class="bi bi-arrow-left me-1"></i>Kembali ke detail ujian
    </router-link>
    <h1 class="h4 fw-bold mb-1 mt-1">
      <i class="bi bi-bar-chart me-2"></i>Laporan{{ laporan ? `: ${laporan.ujian.judul}` : '' }}
    </h1>
    <div v-if="laporan" class="text-secondary small mb-3">{{ mataKuliahNama }}</div>

    <div v-if="error" class="alert alert-danger alert-dismissible">
      {{ error }}<button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'nilai' }" @click="tab = 'nilai'">
          <i class="bi bi-table me-1"></i>Nilai
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'pelanggaran' }" @click="tab = 'pelanggaran'">
          <i class="bi bi-shield-exclamation me-1"></i>Log Pelanggaran
        </button>
      </li>
    </ul>

    <!-- TAB NILAI -->
    <div v-show="tab === 'nilai'">
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

      <template v-else-if="laporan">
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <div class="input-group input-group-sm toolbar-filter">
            <span class="input-group-text bg-body"><i class="bi bi-search"></i></span>
            <input v-model="searchPeserta" type="text" class="form-control" placeholder="Cari nama / NIM…" />
            <select v-model="kelasFilter" class="form-select flex-grow-0 w-auto">
              <option value="">Semua kelas</option>
              <option v-for="k in laporan.kelas_list" :key="k" :value="k">{{ k }}</option>
            </select>
            <select v-model="sortBy" class="form-select flex-grow-0 w-auto">
              <option value="nama">Urut: Nama A–Z</option>
              <option value="nilai-desc">Urut: Nilai Tertinggi</option>
              <option value="nilai-asc">Urut: Nilai Terendah</option>
            </select>
          </div>
          <button class="btn btn-success btn-sm" :disabled="downloading" @click="exportExcel">
            <span v-if="downloading" class="spinner-border spinner-border-sm me-1"></span>
            <i class="bi bi-file-earmark-excel me-1"></i>Export Excel
          </button>
        </div>

        <div v-if="adaNilai" class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-body fw-semibold">
            <i class="bi bi-bar-chart me-1"></i>Distribusi Nilai{{ kelasFilter ? ` — Kelas ${kelasFilter}` : ' — Semua Kelas' }}
          </div>
          <div class="card-body">
            <div style="position: relative; height: 240px">
              <Bar :data="barData" :options="barOptions" />
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Nama</th>
                  <th>NIM</th>
                  <th>Kelas</th>
                  <th class="text-center">Total</th>
                  <th class="text-center">Status</th>
                  <th class="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pesertaFiltered.length === 0">
                  <td colspan="6" class="text-center text-secondary py-4">
                    {{ laporan.peserta.length === 0 ? 'Belum ada peserta.' : 'Tidak ada peserta yang cocok dengan pencarian.' }}
                  </td>
                </tr>
                <!-- Klik baris untuk melihat rincian nilai per soal -->
                <tr v-for="p in pesertaFiltered" :key="p.sesi_id" class="row-klik" @click="bukaDetail(p)">
                  <td class="fw-semibold">{{ p.nama }}</td>
                  <td>{{ p.nim }}</td>
                  <td>{{ p.kelas }}</td>
                  <td class="text-center fw-bold">
                    {{ p.total_nilai !== null ? `${p.total_nilai}/${p.nilai_maksimal}` : '—' }}
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="statusBadge[p.status]">{{ p.status }}</span>
                  </td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" title="Lihat rekap jawaban" @click.stop="bukaDetail(p)">
                        <i class="bi bi-list-ol"></i>
                      </button>
                      <button class="btn btn-outline-danger" title="Download transkrip PDF" @click.stop="exportPdf(p)">
                        <i class="bi bi-file-earmark-pdf"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- TAB PELANGGARAN -->
    <div v-show="tab === 'pelanggaran'">
      <div v-if="loadingLog" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr><th>Waktu</th><th>Mahasiswa</th><th>NIM</th><th>Jenis Pelanggaran</th><th>Keterangan</th></tr>
            </thead>
            <tbody>
              <tr v-if="pelanggaran.length === 0">
                <td colspan="5" class="text-center text-secondary py-4">Tidak ada pelanggaran tercatat. 👍</td>
              </tr>
              <tr v-for="(log, i) in pelanggaran" :key="i">
                <td class="small">{{ log.timestamp }}</td>
                <td class="fw-semibold">{{ log.mahasiswa }}</td>
                <td>{{ log.nim }}</td>
                <td><span class="badge text-bg-danger">{{ log.tipe_display }}</span></td>
                <td class="small text-secondary">{{ log.keterangan || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- Modal detail nilai per soal -->
    <Teleport to="body">
      <div v-if="detailPeserta" class="modal fade show d-block" tabindex="-1" @click.self="detailPeserta = null">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pb-0">
              <div>
                <h5 class="modal-title fw-bold">{{ detailPeserta.nama }}</h5>
                <div class="small text-secondary">
                  {{ detailPeserta.nim }} — {{ detailPeserta.kelas }}
                  <span class="fw-bold ms-2">
                    Total: {{ detailPeserta.total_nilai !== null ? `${detailPeserta.total_nilai}/${detailPeserta.nilai_maksimal}` : '—' }}
                  </span>
                </div>
              </div>
              <button type="button" class="btn-close" @click="detailPeserta = null"></button>
            </div>
            <div class="modal-body">
              <div v-if="loadingDetail" class="text-center py-4"><div class="spinner-border text-primary"></div></div>

              <!-- Rekap lengkap: soal + jawaban + alasan penilaian AI -->
              <template v-else-if="detailHasil">
                <div v-for="j in detailHasil.jawaban" :key="j.nomor_soal" class="card mb-3">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <span class="badge text-bg-primary">Soal {{ j.nomor_soal }}</span>
                      <span v-if="j.nilai !== null" class="badge fs-6" :class="nilaiBadge(j.nilai)">{{ j.nilai }} / 10</span>
                      <span v-else class="badge text-bg-secondary">belum dinilai</span>
                    </div>
                    <p class="fw-semibold small mb-2" style="white-space: pre-wrap">{{ j.pertanyaan }}</p>
                    <div class="bg-body-secondary rounded p-2 small mb-2" style="white-space: pre-wrap">{{ j.teks_jawaban || '(Tidak dijawab)' }}</div>
                    <div v-if="j.alasan_nilai" class="small text-secondary">
                      <i class="bi bi-robot me-1"></i><strong>Alasan AI:</strong> {{ j.alasan_nilai }}
                    </div>
                  </div>
                </div>
              </template>

              <!-- Fallback: hanya ringkasan nilai per soal -->
              <ul v-else class="list-group list-group-flush">
                <li
                  v-for="(nilai, key) in detailPeserta.nilai_per_soal"
                  :key="key"
                  class="list-group-item d-flex justify-content-between align-items-center px-0"
                >
                  <span>Soal {{ key.replace('soal_', '') }}</span>
                  <span v-if="nilai !== null" class="badge fs-6" :class="nilaiBadge(nilai)">{{ nilai }} / 10</span>
                  <span v-else class="text-secondary">belum dinilai</span>
                </li>
              </ul>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-outline-secondary" @click="detailPeserta = null">Tutup</button>
              <button class="btn btn-outline-danger" @click="exportPdf(detailPeserta)">
                <i class="bi bi-file-earmark-pdf me-1"></i>Cetak PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="detailPeserta" class="modal-backdrop fade show"></div>
    </Teleport>
  </div>
</template>

<style scoped>
.row-klik {
  cursor: pointer;
}

.toolbar-filter {
  max-width: 560px;
  flex-wrap: nowrap;
}
</style>
