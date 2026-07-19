<script setup>
import { ref, computed, onMounted } from 'vue'
import client, { fetchAll } from '../../api/client'
import { useThemeStore } from '../../stores/theme'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const theme = useThemeStore()

const loading = ref(true)
const error = ref(null)
const data = ref(null)
const totalMahasiswa = ref(0)

// Insight penilaian esai — dihitung dari endpoint laporan nilai per ujian
const grading = ref({ totalEsai: 0, rataNilai: null })

const statusBadge = {
  draft: 'text-bg-secondary',
  aktif: 'text-bg-success',
  selesai: 'status-selesai',
}

// Palet status: amber (draft), hijau (aktif), biru (selesai)
const chartData = computed(() => ({
  labels: [
    `Draft (${data.value.ujian_draft})`,
    `Aktif (${data.value.ujian_aktif})`,
    `Selesai (${data.value.ujian_selesai})`,
  ],
  datasets: [
    {
      data: [data.value.ujian_draft, data.value.ujian_aktif, data.value.ujian_selesai],
      backgroundColor: ['#b45309', '#047857', '#1889da'],
      borderColor: theme.mode === 'dark' ? '#1e1a2b' : '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
        font: { size: 12 },
        color: theme.mode === 'dark' ? '#d8d2e8' : '#374151',
      },
    },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed} ujian` } },
  },
}))

const tiles = computed(() => [
  { label: 'Total Ujian', value: data.value.total_ujian, icon: 'bi-journal-text' },
  { label: 'Mahasiswa', value: totalMahasiswa.value, icon: 'bi-people' },
  { label: 'Esai Dinilai AI', value: grading.value.totalEsai, icon: 'bi-robot' },
  {
    label: 'Rata-rata Nilai',
    value: grading.value.rataNilai !== null ? `${grading.value.rataNilai}%` : '—',
    icon: 'bi-graph-up',
  },
])

async function hitungInsightPenilaian(ujianList) {
  // Ujian draft belum punya submission — tidak perlu ikut ditanya ke server
  const relevan = ujianList.filter((u) => u.status !== 'draft')
  const hasil = await Promise.allSettled(
    relevan.map((u) => client.get(`/laporan/nilai/${u.id}/`))
  )
  let totalEsai = 0
  let sumPersen = 0
  let nSesiDinilai = 0

  for (const r of hasil) {
    if (r.status !== 'fulfilled') continue
    for (const p of r.value.data.peserta) {
      totalEsai += Object.values(p.nilai_per_soal).filter((n) => n !== null).length
      if (p.total_nilai !== null && p.nilai_maksimal) {
        sumPersen += (p.total_nilai / p.nilai_maksimal) * 100
        nSesiDinilai += 1
      }
    }
  }
  grading.value = {
    totalEsai,
    rataNilai: nSesiDinilai > 0 ? Math.round(sumPersen / nSesiDinilai) : null,
  }
}

onMounted(async () => {
  try {
    const [dash, mhs, ujianList] = await Promise.all([
      client.get('/ujian/dashboard/'),
      client.get('/auth/mahasiswa/'),
      fetchAll('/ujian/'),
    ])
    data.value = dash.data
    // Jika backend paginasi, `count` sudah berisi total — tak perlu unduh semua halaman
    totalMahasiswa.value = mhs.data.count ?? (mhs.data.results ?? mhs.data).length
    await hitungInsightPenilaian(ujianList)
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat dashboard.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4">
    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else>
      <!-- Kartu statistik -->
      <div class="row g-3 mb-3">
        <div v-for="t in tiles" :key="t.label" class="col-6 col-xl-3">
          <div class="card stat-card h-100">
            <div class="card-body d-flex align-items-center justify-content-between py-3">
              <div>
                <div class="fs-3 fw-bold lh-1 mb-1">{{ t.value }}</div>
                <div class="text-secondary small text-nowrap">{{ t.label }}</div>
              </div>
              <div class="stat-icon"><i class="bi" :class="t.icon"></i></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grafik status + ujian terbaru -->
      <div class="row g-3">
        <div class="col-lg-4">
          <div class="card stat-card h-100">
            <div class="card-header bg-body fw-semibold">Status Ujian</div>
            <div class="card-body d-flex align-items-center justify-content-center">
              <div v-if="data.total_ujian === 0" class="text-center py-3">
                <div class="empty-icon mx-auto mb-3"><i class="bi bi-pie-chart"></i></div>
                <p class="text-secondary small mb-3">Grafik akan muncul setelah<br />ujian pertama dibuat.</p>
                <router-link :to="{ name: 'ujian-list' }" class="btn btn-sm btn-primary">
                  <i class="bi bi-plus-lg me-1"></i>Buat Ujian
                </router-link>
              </div>
              <div v-else class="chart-wrap"><Doughnut :data="chartData" :options="chartOptions" /></div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card stat-card h-100">
            <div class="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span class="fw-semibold">Ujian Terbaru</span>
              <router-link :to="{ name: 'ujian-list' }" class="btn btn-sm btn-outline-primary">Lihat Semua</router-link>
            </div>
            <div v-if="data.ujian_terbaru.length === 0" class="card-body text-center py-5">
              <div class="empty-icon mx-auto mb-3"><i class="bi bi-journal-plus"></i></div>
              <p class="text-secondary mb-3">Belum ada ujian yang dibuat.</p>
              <router-link :to="{ name: 'ujian-list' }" class="btn btn-primary">
                <i class="bi bi-plus-lg me-1"></i>Buat Ujian
              </router-link>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Judul</th>
                    <th class="d-none d-md-table-cell">Mata Kuliah</th>
                    <th class="text-center">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in data.ujian_terbaru" :key="u.id">
                    <td class="fw-semibold">{{ u.judul }}</td>
                    <td class="d-none d-md-table-cell">{{ u.mata_kuliah_nama }}</td>
                    <td class="text-center"><span class="badge" :class="statusBadge[u.status]">{{ u.status_display }}</span></td>
                    <td class="text-end">
                      <router-link :to="{ name: 'ujian-detail', params: { id: u.id } }" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-arrow-right"></i>
                      </router-link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: none;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(124, 58, 237, 0.08);
  color: #6d28d9;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chart-wrap {
  position: relative;
  width: 100%;
  max-width: 280px;
  height: 250px;
}

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
