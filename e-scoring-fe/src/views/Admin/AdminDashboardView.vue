<template>
  <!--
    Admin/AdminDashboardView.vue
    Dashboard ringkasan Dosen: statistik, daftar ujian, mata kuliah.
  -->
  <div class="admin-layout">
    <Sidebar />

    <div class="admin-body">
      <Navbar />

      <main class="admin-main">
        <div class="admin-content animate-fade-in">

          <!-- Page Title -->
          <header class="section-header">
            <h1 class="page-title">Dashboard Dosen</h1>
            <div class="header-actions">
              <button
                id="btn-manage-course"
                class="btn btn-secondary"
                @click="openCourseModal"
              >
                📚 Kelola Mata Kuliah
              </button>
              <button
                id="btn-create-ujian"
                class="btn btn-primary"
                @click="openCreateUjianModal"
              >
                + Buat Ujian Baru
              </button>
            </div>
          </header>

          <Loading v-if="loading" message="Memuat data..." />

          <template v-else>
            <!-- Stats Cards -->
            <div class="stats-grid">
              <div class="stat-card glass-card" v-for="stat in stats" :key="stat.label">
                <div class="stat-icon">{{ stat.icon }}</div>
                <div class="stat-body">
                  <span class="stat-value">{{ stat.value }}</span>
                  <span class="stat-label">{{ stat.label }}</span>
                </div>
              </div>
            </div>

            <!-- Ujian List -->
            <section class="section-card glass-card">
              <div class="section-card-header">
                <h2 class="section-title">Daftar Ujian</h2>
              </div>

              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Judul</th>
                      <th>Mata Kuliah</th>
                      <th>Kelas</th>
                      <th>Status</th>
                      <th>Soal</th>
                      <th>Tanggal</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="ujianList.length === 0">
                      <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
                        Belum ada ujian. Klik "Buat Ujian Baru" untuk memulai.
                      </td>
                    </tr>
                    <tr v-for="ujian in ujianList" :key="ujian.id">
                      <td class="font-medium">{{ ujian.judul }}</td>
                      <td class="text-muted text-sm">{{ ujian.mata_kuliah_nama || ujian.mata_pelajaran?.nama || '—' }}</td>
                      <td class="text-sm">{{ ujian.kelas_target }}</td>
                      <td>
                        <StatusBadge
                          :status="statusMap[ujian.status]?.badge"
                          :label="statusMap[ujian.status]?.label"
                        />
                      </td>
                      <td class="text-center">{{ ujian.jumlah_soal }}</td>
                      <td class="text-sm text-muted">{{ ujian.tanggal_ujian || '—' }}</td>
                      <td>
                        <div class="action-btns">
                          <!-- Aktivasi -->
                          <button
                            :id="`btn-aktivasi-${ujian.id}`"
                            class="btn btn-sm btn-secondary"
                            @click="aktivasiUjian(ujian.id)"
                            :title="ujian.status === 'aktif' ? 'Selesaikan' : 'Aktifkan'"
                          >
                            {{ ujian.status === 'aktif' ? '⏹' : '▶' }}
                          </button>
                          <!-- Soal -->
                          <router-link
                            :to="{ name: 'AdminQuestion', params: { ujianId: ujian.id } }"
                            class="btn btn-sm btn-secondary"
                            title="Kelola Soal"
                          >📝</router-link>
                          <!-- Nilai -->
                          <router-link
                            :to="{ name: 'AdminScore', params: { ujianId: ujian.id } }"
                            class="btn btn-sm btn-secondary"
                            title="Lihat Nilai"
                          >📊</router-link>
                          <!-- Log Pelanggaran -->
                          <router-link
                            :to="{ name: 'AdminLogs', params: { ujianId: ujian.id } }"
                            class="btn btn-sm btn-secondary"
                            title="Log Pelanggaran"
                          >🚨</router-link>
                          <!-- Monitor -->
                          <button
                            :id="`btn-monitor-${ujian.id}`"
                            class="btn btn-sm btn-secondary"
                            @click="openMonitor(ujian.id)"
                            title="Monitor Live"
                          >👁</button>
                          <!-- Edit -->
                          <button
                            :id="`btn-edit-ujian-${ujian.id}`"
                            class="btn btn-sm btn-secondary"
                            @click="openEditUjianModal(ujian)"
                            title="Edit Ujian"
                          >✏️</button>
                          <!-- Hapus -->
                          <button
                            :id="`btn-delete-ujian-${ujian.id}`"
                            class="btn btn-sm btn-danger"
                            @click="hapusUjian(ujian.id, ujian.judul)"
                            title="Hapus Ujian"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
        </div>
      </main>
    </div>
  </div>

  <!-- ── Modal Kelola Mata Kuliah ── -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showCourseModal" class="modal-overlay" @click.self="showCourseModal = false">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2 class="text-xl font-bold">Kelola Mata Kuliah</h2>
            <button class="close-btn" @click="showCourseModal = false">&times;</button>
          </div>

          <!-- Tambah Mata Kuliah Form -->
          <form @submit.prevent="saveCourse" class="course-form glass-card">
            <h3 class="text-sm font-bold text-primary-400">Tambah Baru</h3>
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Kode MK</label>
                <input v-model="courseForm.kode" class="form-input" placeholder="contoh: IF101" required />
              </div>
              <div class="form-group flex-2">
                <label class="form-label">Nama Mata Kuliah</label>
                <input v-model="courseForm.nama" class="form-input" placeholder="contoh: Dasar Pemrograman" required />
              </div>
              <button type="submit" class="btn btn-primary btn-add-submit" :disabled="savingCourse">
                {{ savingCourse ? '...' : '+' }}
              </button>
            </div>
          </form>

          <!-- List Mata Kuliah -->
          <div class="course-list-wrapper">
            <h3 class="text-sm font-bold text-muted mb-2">Daftar Mata Kuliah Anda</h3>
            <div v-if="loadingCourses" class="text-center text-sm text-muted py-4">Memuat Mata Kuliah...</div>
            <div v-else-if="mataPelajaranList.length === 0" class="text-center text-sm text-muted py-4">
              Belum ada Mata Kuliah. Silakan tambahkan di atas.
            </div>
            <ul v-else class="course-list">
              <li v-for="course in mataPelajaranList" :key="course.id" class="course-item">
                <div class="course-info">
                  <span class="course-code">{{ course.kode }}</span>
                  <span class="course-name">{{ course.nama }}</span>
                </div>
                <button
                  class="btn btn-sm btn-danger btn-delete-course"
                  @click="hapusCourse(course.id, course.nama)"
                  title="Hapus Mata Kuliah"
                >
                  🗑
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ── Modal Ujian Form (Buat / Edit) ── -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showUjianModal" class="modal-overlay" @click.self="showUjianModal = false">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2 class="text-xl font-bold">{{ isEditMode ? 'Edit Ujian' : 'Buat Ujian Baru' }}</h2>
            <button class="close-btn" @click="showUjianModal = false">&times;</button>
          </div>

          <form @submit.prevent="saveUjian" class="ujian-modal-form">
            <div class="form-group">
              <label class="form-label">Judul Ujian</label>
              <input v-model="ujianForm.judul" class="form-input" placeholder="contoh: Ujian Akhir Semester" required />
            </div>

            <div class="form-group">
              <label class="form-label">Deskripsi (Petunjuk Ujian)</label>
              <textarea v-model="ujianForm.deskripsi" class="form-textarea" placeholder="Tulis instruksi pengerjaan..." rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Mata Kuliah</label>
                <select v-model="ujianForm.mata_pelajaran" class="form-select" required>
                  <option value="" disabled selected>Pilih Mata Kuliah</option>
                  <option v-for="course in mataPelajaranList" :key="course.id" :value="course.id">
                    [{{ course.kode }}] {{ course.nama }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Durasi (Menit)</label>
                <input v-model.number="ujianForm.durasi_menit" type="number" min="5" class="form-input" required />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Kelas Target</label>
                <select v-model="ujianForm.kelas_target" class="form-select" required>
                  <option value="" disabled selected>Pilih Kelas</option>
                  <option v-for="kelas in targetClasses" :key="kelas" :value="kelas">
                    {{ kelas }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Tanggal Ujian</label>
              <input v-model="ujianForm.tanggal_ujian" type="date" class="form-input" required />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="showUjianModal = false">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="savingUjian">
                {{ savingUjian ? 'Menyimpan...' : 'Simpan Ujian' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { laporanApi, ujianApi } from '@/services/api'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'

// List kelas target TI-1A s/d TI-4E
const targetClasses = []
for (let i = 1; i <= 4; i++) {
  for (let j = 0; j < 5; j++) {
    targetClasses.push(`TI-${i}${String.fromCharCode(65 + j)}`)
  }
}

const loading        = ref(false)
const ujianList      = ref([])
const dashboardData  = ref(null)

// Ujian Modal State
const showUjianModal = ref(false)
const isEditMode      = ref(false)
const selectedUjianId= ref(null)
const savingUjian    = ref(false)
const ujianForm      = reactive({
  judul: '',
  deskripsi: '',
  mata_pelajaran: '',
  durasi_menit: 60,
  kelas_target: '',
  tanggal_ujian: '',
})

// Course Modal State
const showCourseModal = ref(false)
const loadingCourses  = ref(false)
const savingCourse    = ref(false)
const mataPelajaranList = ref([])
const courseForm      = reactive({
  kode: '',
  nama: '',
})

const statusMap = {
  draft:   { badge: 'neutral', label: 'Draft' },
  aktif:   { badge: 'success', label: 'Aktif' },
  selesai: { badge: 'info',    label: 'Selesai' },
}

const stats = computed(() => [
  { icon: '📋', label: 'Total Ujian',     value: ujianList.value.length },
  { icon: '🚀', label: 'Ujian Aktif',     value: ujianList.value.filter(u => u.status === 'aktif').length },
  { icon: '🏆', label: 'Sudah Selesai',   value: ujianList.value.filter(u => u.status === 'selesai').length },
  { icon: '🎓', label: 'Total Mahasiswa', value: dashboardData.value?.total_mahasiswa ?? '—' },
])

async function fetchData() {
  loading.value = true
  try {
    const [ujianRes, dashRes, courseRes] = await Promise.all([
      ujianApi.getUjianList(),
      ujianApi.getDashboard(),
      ujianApi.getMataPelajaranList(),
    ])
    ujianList.value     = ujianRes.data
    dashboardData.value = dashRes.data
    mataPelajaranList.value = courseRes.data
  } finally {
    loading.value = false
  }
}

// ─── Ujian Actions ───────────────────────────────────────────────────────────

function openCreateUjianModal() {
  isEditMode.value = false
  selectedUjianId.value = null
  Object.assign(ujianForm, {
    judul: '',
    deskripsi: '',
    mata_pelajaran: mataPelajaranList.value[0]?.id || '',
    durasi_menit: 60,
    kelas_target: '',
    tanggal_ujian: new Date().toISOString().substring(0, 10),
  })
  showUjianModal.value = true
}

function openEditUjianModal(ujian) {
  isEditMode.value = true
  selectedUjianId.value = ujian.id
  Object.assign(ujianForm, {
    judul: ujian.judul,
    deskripsi: ujian.deskripsi || '',
    mata_pelajaran: ujian.mata_pelajaran?.id || ujian.mata_pelajaran || '',
    durasi_menit: ujian.durasi_menit,
    kelas_target: ujian.kelas_target,
    tanggal_ujian: ujian.tanggal_ujian || '',
  })
  showUjianModal.value = true
}

async function saveUjian() {
  savingUjian.value = true
  try {
    const payload = { ...ujianForm }
    if (isEditMode.value) {
      await ujianApi.updateUjian(selectedUjianId.value, payload)
    } else {
      await ujianApi.createUjian(payload)
    }
    showUjianModal.value = false
    await fetchData()
  } catch (err) {
    alert('Gagal menyimpan ujian: ' + (err.response?.data?.detail || err.message || JSON.stringify(err.response?.data)))
  } finally {
    savingUjian.value = false
  }
}

async function hapusUjian(id, judul) {
  if (!confirm(`Apakah Anda yakin ingin menghapus ujian "${judul}"? Semua soal dan data ujian mahasiswa terkait akan ikut terhapus.`)) return
  try {
    await ujianApi.deleteUjian(id)
    await fetchData()
  } catch (err) {
    alert('Gagal menghapus ujian: ' + (err.response?.data?.detail || err.message))
  }
}

async function aktivasiUjian(id) {
  try {
    await ujianApi.aktivasiUjian(id)
    await fetchData()
  } catch (err) {
    alert('Gagal mengubah status aktivasi: ' + (err.response?.data?.detail || err.message))
  }
}

function openMonitor(id) {
  console.log('Monitor ujian:', id)
}

// ─── Course Actions ──────────────────────────────────────────────────────────

async function openCourseModal() {
  showCourseModal.value = true
  await fetchCourses()
}

async function fetchCourses() {
  loadingCourses.value = true
  try {
    const { data } = await ujianApi.getMataPelajaranList()
    mataPelajaranList.value = data
  } finally {
    loadingCourses.value = false
  }
}

async function saveCourse() {
  savingCourse.value = true
  try {
    await ujianApi.createMataPelajaran({
      kode: courseForm.kode,
      nama: courseForm.nama,
    })
    courseForm.kode = ''
    courseForm.nama = ''
    await fetchCourses()
  } catch (err) {
    alert('Gagal membuat mata kuliah: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data)))
  } finally {
    savingCourse.value = false
  }
}

async function hapusCourse(id, nama) {
  if (!confirm(`Hapus Mata Kuliah "${nama}"? Ujian terkait dengan mata kuliah ini dapat terpengaruh.`)) return
  try {
    await ujianApi.deleteMataPelajaran(id)
    await fetchCourses()
  } catch (err) {
    alert('Gagal menghapus: ' + (err.response?.data?.detail || err.message))
  }
}

onMounted(fetchData)
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.admin-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-main {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}

.admin-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
}

.page-title { font-size: 1.5rem; font-weight: 800; }

/* ── Stats Grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--color-surface-2), var(--color-surface-3));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  gap: var(--space-3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary-400), var(--color-accent-400));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-400);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-icon {
  font-size: 2.5rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
}

.stat-body {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-text-primary), var(--color-primary-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
}
.stat-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-card {
  padding: 0;
  overflow: hidden;
}

.section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.section-title { font-size: 1rem; font-weight: 700; }

.action-btns {
  display: flex;
  gap: var(--space-2);
}

/* Modals & Forms Styling */
.course-form {
  padding: var(--space-4);
  margin-bottom: var(--space-6);
}

.form-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
}

.btn-add-submit {
  height: 42px;
  width: 42px;
  padding: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.course-list-wrapper {
  max-height: 300px;
  overflow-y: auto;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.course-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
}

.course-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.course-code {
  font-weight: 700;
  color: var(--color-primary-400);
  background: rgba(99, 102, 241, 0.1);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}

.course-name {
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.btn-delete-course {
  padding: var(--space-1) var(--space-2);
}

/* Ujian Form Modal Styling */
.ujian-modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-3);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>

