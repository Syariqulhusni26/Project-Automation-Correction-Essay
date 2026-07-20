<template>
  <!--
    DashboardView.vue (Mahasiswa)
    Daftar ujian yang tersedia untuk mahasiswa berdasarkan kelasnya.
  -->
  <div class="page-layout light-mode">
    <Navbar />

    <main class="page-main">
      <div class="page-content">
        <!-- Header -->
        <header class="page-header">
          <div>
            <h1 class="page-title">
              Selamat datang, {{ auth.user?.nama_lengkap || auth.user?.username }}
              <Hand class="wave-icon icon-bounce" size="24" />
            </h1>
            <p class="page-subtitle">
              {{ auth.user?.kelas }} · NIM: {{ auth.user?.nim }}
            </p>
          </div>
        </header>

        <!-- Loading -->
        <Loading v-if="loading" message="Memuat daftar ujian..." />

        <!-- Error -->
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button class="btn btn-secondary btn-sm" @click="fetchUjian">Coba Lagi</button>
        </div>

        <!-- Empty State -->
        <div v-else-if="ujianList.length === 0" class="empty-state glass-card">
          <Inbox class="empty-icon text-muted icon-bounce" size="48" />
          <h3>Tidak Ada Ujian Tersedia</h3>
          <p class="text-muted text-sm">
            Belum ada ujian aktif untuk kelas Anda saat ini.
            Silakan hubungi dosen atau refresh halaman ini.
          </p>
          <button class="btn btn-secondary btn-sm icon-spin" @click="fetchUjian">
            <RefreshCw size="14" /> Refresh
          </button>
        </div>

        <!-- Exam Cards Grid -->
        <div v-else class="ujian-grid">
          <div
            v-for="ujian in ujianList"
            :key="ujian.id"
            class="ujian-card glass-card"
          >
            <!-- Status Badge -->
            <div class="ujian-card-header">
              <StatusBadge
                :status="ujian.status_sesi === 'pelanggaran' ? 'danger' : (ujian.status_sesi === 'selesai' ? 'neutral' : (ujian.status_sesi === 'berlangsung' ? 'warning' : 'success'))"
                :label="ujian.status_sesi === 'pelanggaran' ? 'Pelanggaran' : (ujian.status_sesi === 'selesai' ? 'Selesai' : (ujian.status_sesi === 'berlangsung' ? 'Berlangsung' : 'Tersedia'))"
              />
              <span class="text-muted text-xs">{{ ujian.mata_pelajaran?.kode }}</span>
            </div>

            <!-- Judul -->
            <h2 class="ujian-title">{{ ujian.judul }}</h2>
            <p class="ujian-mapel">{{ ujian.mata_pelajaran?.nama }}</p>

            <!-- Meta Info -->
            <div class="ujian-meta">
              <div class="meta-item">
                <Timer class="meta-icon" size="15" />
                <span>{{ ujian.durasi_menit }} menit</span>
              </div>
              <div class="meta-item">
                <FileText class="meta-icon" size="15" />
                <span>{{ ujian.jumlah_soal }} soal</span>
              </div>
              <div class="meta-item" v-if="ujian.tanggal_ujian">
                <CalendarDays class="meta-icon" size="15" />
                <span>{{ formatDate(ujian.tanggal_ujian) }}</span>
              </div>
            </div>

            <!-- Deskripsi -->
            <p v-if="ujian.deskripsi" class="ujian-desc">{{ ujian.deskripsi }}</p>

            <!-- CTA Button -->
            <button
              v-if="ujian.status_sesi === 'pelanggaran'"
              class="btn w-full btn-danger"
              style="opacity: 0.8; cursor: not-allowed;"
              disabled
            >
              <XCircle size="15" style="margin-right:6px;" /> Dihentikan (Pelanggaran)
            </button>
            <button
              v-else-if="ujian.status_sesi !== 'selesai'"
              :id="`btn-mulai-ujian-${ujian.id}`"
              class="btn w-full icon-slide btn-primary"
              @click="mulaiUjian(ujian)"
            >
              <template v-if="ujian.status_sesi === 'berlangsung'">
                <PlayCircle size="15" style="margin-right:6px;" /> Lanjutkan Ujian
              </template>
              <template v-else>
                <Rocket size="15" style="margin-right:6px;" /> Mulai Ujian
              </template>
            </button>
            <router-link
              v-else
              :to="{ name: 'Exam', params: { ujianId: ujian.id } }"
              :id="`btn-riwayat-${ujian.id}`"
              class="btn w-full icon-slide btn-secondary"
            >
              <History size="15" style="margin-right:6px;" /> Lihat Riwayat
            </router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ujianApi } from '@/services/api'
import Navbar from '@/components/Navbar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { Hand, Inbox, RefreshCw, Timer, FileText, CalendarDays, History, PlayCircle, Rocket, XCircle } from 'lucide-vue-next'

const auth     = useAuthStore()
const router   = useRouter()
const ujianList = ref([])
const loading   = ref(false)
const error     = ref('')

async function fetchUjian() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await ujianApi.getUjianTersedia()
    ujianList.value = data
  } catch (err) {
    error.value = 'Gagal memuat daftar ujian. Periksa koneksi Anda.'
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function mulaiUjian(ujian) {
  // Simpan durasi ujian ke localStorage agar bisa dibaca di halaman hasil
  if (ujian.durasi_menit) {
    localStorage.setItem(`ujian_durasi_${ujian.id}`, ujian.durasi_menit)
  }
  router.push({ name: 'Exam', params: { ujianId: ujian.id } })
}

onMounted(fetchUjian)
</script>

<style scoped>
.page-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  padding: var(--space-8) var(--space-6);
}

.page-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }

.page-title {
  font-size: 1.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.wave-icon {
  color: var(--color-accent-400);
  display: inline-flex;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: var(--space-1);
}

.ujian-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
}

.ujian-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.ujian-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-glow);
}

.ujian-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ujian-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
}

.ujian-mapel {
  font-size: 0.85rem;
  color: var(--color-primary-400);
}

.ujian-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.meta-icon {
  color: var(--color-primary-400);
  flex-shrink: 0;
}

.ujian-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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

.error-state {
  text-align: center;
  color: var(--color-danger);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
</style>
