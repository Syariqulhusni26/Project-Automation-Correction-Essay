<template>
  <!--
    Admin/AdminLogsView.vue
    Log pelanggaran ujian per ujian.
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
              <h1 class="page-title">Log Pelanggaran</h1>
            </div>
            <div class="flex gap-4" v-if="ujianId > 0">
              <!-- Pilih Ujian -->
              <select
                class="form-select"
                style="max-width: 220px;"
                :value="ujianId"
                @change="(e) => $router.push({ name: 'AdminLogs', params: { ujianId: e.target.value } })"
              >
                <option disabled value="0">Pilih Ujian...</option>
                <option v-for="u in daftarUjian" :key="u.id" :value="u.id">
                  {{ u.judul }}
                </option>
              </select>

              <!-- Filter Tipe -->
              <select
                id="select-filter-tipe"
                v-model="filterTipe"
                class="form-select"
                style="max-width: 240px;"
              >
                <option value="">Semua Tipe</option>
                <option v-for="(label, val) in VIOLATION_TYPES" :key="val" :value="val">
                  {{ label }}
                </option>
              </select>
            </div>
          </header>

          <!-- Pilih ujian dulu jika akses dari sidebar (ujianId = 0) -->
          <div v-if="ujianId === 0" class="empty-state glass-card">
            <span class="empty-icon">🚨</span>
            <h3>Pilih Ujian untuk Melihat Log Pelanggaran</h3>
            <p class="text-muted text-sm" style="margin-bottom: 1rem;">
              Silakan pilih salah satu ujian dari daftar di bawah ini.
            </p>
            <Loading v-if="loadingDaftarUjian" message="Memuat daftar ujian..." />
            <div v-else style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 500px; width: 100%;">
              <router-link
                v-for="u in daftarUjian"
                :key="u.id"
                :to="{ name: 'AdminLogs', params: { ujianId: u.id } }"
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
            <Loading v-if="loading" message="Memuat log pelanggaran..." />

            <template v-else>
              <!-- Summary -->
              <div class="stats-grid">
                <div class="stat-card glass-card" v-for="stat in summaryStats" :key="stat.label">
                  <div class="stat-icon">{{ stat.icon }}</div>
                  <div class="stat-body">
                    <span class="stat-value">{{ stat.value }}</span>
                    <span class="stat-label">{{ stat.label }}</span>
                  </div>
                </div>
              </div>

              <!-- Log Table -->
              <div class="glass-card" style="padding: 0; overflow: hidden;">
                <div class="section-card-header">
                  <h2 class="section-title">
                    Daftar Pelanggaran ({{ filteredLogs.length }})
                  </h2>
                </div>
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Mahasiswa</th>
                        <th>NIM</th>
                        <th>Jenis Pelanggaran</th>
                        <th>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="filteredLogs.length === 0">
                        <td colspan="5" class="text-center text-muted" style="padding: 2rem;">
                          ✅ Tidak ada pelanggaran tercatat untuk ujian ini.
                        </td>
                      </tr>
                      <tr v-for="(log, idx) in filteredLogs" :key="idx">
                        <td class="text-sm text-muted">
                          {{ new Date(log.timestamp).toLocaleString('id-ID') }}
                        </td>
                        <td class="font-medium">{{ log.mahasiswa }}</td>
                        <td class="text-muted text-sm">{{ log.nim }}</td>
                        <td>
                          <StatusBadge
                            status="danger"
                            :label="log.tipe_display || VIOLATION_TYPES[log.tipe] || log.tipe"
                          />
                        </td>
                        <td class="text-sm text-muted">{{ log.keterangan || '—' }}</td>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { laporanApi, ujianApi } from '@/services/api'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'

// Mapping tipe pelanggaran
const VIOLATION_TYPES = {
  tab_baru:          'Membuka Tab/Jendela Baru',
  window_blur:       'Berpindah Aplikasi/Jendela',
  fullscreen_exit:   'Keluar dari Mode Layar Penuh',
  heartbeat_timeout: 'Koneksi Terputus (Heartbeat Timeout)',
}

const route   = useRoute()
const ujianId = computed(() => Number(route.params.ujianId))

const loading            = ref(false)
const loadingDaftarUjian = ref(false)
const daftarUjian        = ref([])

const logs       = ref([])
const filterTipe = ref('')

const filteredLogs = computed(() =>
  filterTipe.value
    ? logs.value.filter(l => l.tipe === filterTipe.value)
    : logs.value
)

const summaryStats = computed(() => {
  const total  = logs.value.length
  const uniq   = new Set(logs.value.map(l => l.nim)).size
  const byType = Object.entries(VIOLATION_TYPES).map(([val]) => ({
    type:  val,
    count: logs.value.filter(l => l.tipe === val).length,
  }))
  const worst = [...byType].sort((a, b) => b.count - a.count)[0]

  return [
    { icon: '🚨', label: 'Total Pelanggaran',    value: total },
    { icon: '👤', label: 'Mahasiswa Melanggar',  value: uniq  },
    { icon: '📊', label: 'Pelanggaran Terbanyak', value: worst?.count ? `${worst.count}x` : '—' },
  ]
})

async function fetchData() {
  // Selalu muat daftar ujian agar dropdown bisa tampil
  try {
    if (daftarUjian.value.length === 0) {
      const { data } = await ujianApi.getUjianList()
      daftarUjian.value = data || []
    }
  } catch (err) {
    console.error('Gagal memuat daftar ujian:', err)
  }

  if (!ujianId.value || ujianId.value === 0) {
    return
  }
  
  loading.value = true
  try {
    const { data } = await laporanApi.getLogPelanggaran(ujianId.value)
    logs.value = Array.isArray(data) ? data : []
  } finally {
    loading.value = false
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
.page-title { font-size: 1.4rem; font-weight: 800; margin-top: var(--space-1); }
.back-link  { font-size: 0.85rem; color: var(--color-primary-400); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-4);
}

.stat-card { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); }
.stat-icon { font-size: 1.8rem; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: var(--color-danger); line-height: 1; }
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
</style>
