<template>
  <!--
    Admin/AdminStudentView.vue
    Manajemen mahasiswa oleh Dosen.
  -->
  <div class="admin-layout">
    <Sidebar />
    <div class="admin-body">
      <Navbar />
      <main class="admin-main">
        <div class="admin-content animate-fade-in">

          <!-- Header -->
          <header class="section-header">
            <h1 class="page-title">Manajemen Mahasiswa</h1>
            <div class="header-actions">
              <!-- Export Kartu -->
              <button
                id="btn-export-kartu"
                class="btn btn-secondary icon-bounce"
                @click="exportKartu"
                :disabled="isDownloadingPdf"
              >
                <span v-if="isDownloadingPdf" class="spinner" style="width:1rem;height:1rem;border-width:2px;margin-right:0.5rem"></span>
                <CreditCard v-else size="16" />
                {{ isDownloadingPdf ? 'Memproses PDF...' : 'Export Kartu Login' }}
              </button>
              <!-- Import Excel -->
              <label id="btn-import-mahasiswa" class="btn btn-secondary icon-bounce" style="cursor:pointer;">
                <Upload size="16" /> Import Excel
                <input type="file" accept=".xlsx,.xls" hidden @change="onImportExcel" />
              </label>
              <!-- Tambah Manual -->
              <button
                id="btn-add-mahasiswa"
                class="btn btn-primary icon-pulse"
                @click="openCreateModal"
              >
                <UserPlus size="16" /> Tambah Mahasiswa
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
            <button
              class="btn btn-sm btn-secondary icon-bounce"
              :class="{ 'btn-danger': filterLocked }"
              @click="filterLocked = !filterLocked"
            >
              <Lock v-if="!filterLocked" size="14" /> <LockOpen v-else size="14" />
              {{ filterLocked ? 'Tampilkan Semua' : 'Tampilkan Terkunci' }}
            </button>
            <select v-model="limit" class="form-select" style="max-width: 150px; margin-left: auto;">
              <option :value="10">10 Baris</option>
              <option :value="20">20 Baris</option>
              <option :value="50">50 Baris</option>
              <option :value="10000">Semua</option>
            </select>
          </div>

          <Loading v-if="loading" message="Memuat mahasiswa..." />

          <div v-else class="table-wrapper glass-card" style="padding: 0;">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Lengkap</th>
                  <th>NIM (Username)</th>
                  <th>Kelas</th>
                  <th>Password Login</th>
                  <th>Status Akun</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="paginatedList.length === 0">
                  <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
                    Tidak ada data mahasiswa.
                  </td>
                </tr>
                <tr v-for="(mhs, idx) in paginatedList" :key="mhs.id">
                  <td>{{ (currentPage - 1) * limit + idx + 1 }}</td>
                  <td class="font-medium">{{ mhs.nama_lengkap }}</td>
                  <td class="text-muted text-sm">{{ mhs.nim }}</td>
                  <td>{{ mhs.kelas || '—' }}</td>
                  <td class="font-mono text-sm text-primary-400 font-bold">
                    <template v-if="mhs.plain_password">{{ mhs.plain_password }}</template>
                    <template v-else><Key size="13" style="vertical-align: text-bottom; margin-right: 3px;" />Terenkripsi</template>
                  </td>
                  <td>
                    <StatusBadge
                      v-if="mhs.is_exam_locked"
                      status="danger"
                      label="Terkunci"
                    />
                    <StatusBadge v-else status="success" label="Aktif" />
                  </td>
                  <td>
                    <div class="flex gap-2">
                      <!-- Edit -->
                      <button
                        :id="`btn-edit-${mhs.id}`"
                        class="btn btn-sm btn-secondary icon-bounce"
                        @click="openEditModal(mhs)"
                        title="Edit Mahasiswa"
                      >
                        <Pencil size="14" />
                      </button>
                      <!-- Unlock -->
                      <button
                        v-if="mhs.is_exam_locked"
                        :id="`btn-unlock-${mhs.id}`"
                        class="btn btn-sm btn-secondary icon-bounce"
                        @click="unlockMahasiswa(mhs.id)"
                        title="Buka Kunci Akun"
                      >
                        <LockOpen size="14" /> Unlock
                      </button>
                      <!-- Hapus -->
                      <button
                        :id="`btn-hapus-${mhs.id}`"
                        class="btn btn-sm btn-danger icon-bounce"
                        @click="hapusMahasiswa(mhs.id, mhs.nama_lengkap)"
                        title="Hapus Mahasiswa"
                      >
                        <Trash2 size="14" />
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

          <!-- Info terkunci -->
          <p v-if="lockedCount > 0" class="text-sm" style="color: var(--color-danger);">
            <AlertTriangle size="14" style="vertical-align: text-bottom; margin-right: 4px;" />
            {{ lockedCount }} mahasiswa dalam status terkunci akibat pelanggaran.
          </p>
        </div>
      </main>
    </div>

    <!-- ── Hidden Printable Template for PDF ── -->
    <div class="pdf-offscreen" aria-hidden="true">
      <div ref="pdfTemplate" class="pdf-template">
        <div v-for="(mhs, idx) in pdfDataList" :key="mhs.id" class="pdf-card">
          <KopInstitusi />
          <h2 class="pdf-title">KARTU LOGIN MAHASISWA</h2>
          
          <div class="pdf-info-section">
            <div class="pdf-info-row">
              <span class="pdf-info-label">Nama Mahasiswa</span>
              <span class="pdf-info-colon">:</span>
              <span class="pdf-info-value"><strong>{{ mhs.nama_lengkap }}</strong></span>
            </div>
            <div class="pdf-info-row">
              <span class="pdf-info-label">NIM / Username</span>
              <span class="pdf-info-colon">:</span>
              <span class="pdf-info-value"><strong>{{ mhs.nim }}</strong></span>
            </div>
            <div class="pdf-info-row">
              <span class="pdf-info-label">Kelas</span>
              <span class="pdf-info-colon">:</span>
              <span class="pdf-info-value">{{ mhs.kelas || '—' }}</span>
            </div>
            <div class="pdf-info-row" style="margin-top: 10px;">
              <span class="pdf-info-label">Password</span>
              <span class="pdf-info-colon">:</span>
              <span class="pdf-info-value"><strong style="font-family: monospace; font-size: 1.1em; background: #eee; padding: 2px 6px; border-radius: 4px;">{{ mhs.plain_password || '(Terenkripsi)' }}</strong></span>
            </div>
            <div class="pdf-info-row">
              <span class="pdf-info-label">Link Ujian</span>
              <span class="pdf-info-colon">:</span>
              <span class="pdf-info-value">{{ currentUrl }}</span>
            </div>
          </div>

          <div class="pdf-footer">
            <p>* Harap simpan kartu ini dengan baik dan rahasiakan password Anda.</p>
          </div>
          
          <div v-if="idx < pdfDataList.length - 1" class="pdf-cut-line">
            ✂----------------------------------------------------------------------------------------------------------------
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ── Modal Mahasiswa Form (Tambah / Edit) ── -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2 class="text-xl font-bold">{{ isEditMode ? 'Edit Mahasiswa' : 'Tambah Mahasiswa Baru' }}</h2>
            <button class="close-btn" @click="showModal = false">&times;</button>
          </div>

          <form @submit.prevent="saveStudent" class="student-modal-form">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input v-model="studentForm.nama_lengkap" class="form-input" placeholder="contoh: Budi Santoso" required />
            </div>

            <div class="form-group">
              <label class="form-label">NIM (Username Login)</label>
              <input v-model="studentForm.nim" class="form-input" placeholder="contoh: 20200123" required />
            </div>

            <div class="form-group">
              <label class="form-label">Kelas</label>
              <input v-model="studentForm.kelas" class="form-input" placeholder="contoh: TI-3A" />
            </div>

            <div class="form-group">
              <label class="form-label">
                Password {{ isEditMode ? '(Kosongkan jika tidak ingin diubah)' : '(Kosongkan untuk acak)' }}
              </label>
              <input v-model="studentForm.password" type="text" class="form-input" placeholder="contoh: PASS123" />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Data' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { authApi } from '@/services/api'
import { useDownload } from '@/composables/useDownload'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import KopInstitusi from '@/components/KopInstitusi.vue'
import html2pdf from 'html2pdf.js'
import { CreditCard, Upload, UserPlus, Lock, LockOpen, Key, Pencil, Trash2, AlertTriangle } from 'lucide-vue-next'

const { downloadBlob } = useDownload()

const loading      = ref(false)
const saving       = ref(false)
const mahasiswaList= ref([])
const search       = ref('')
const filterKelas  = ref('')
const filterLocked = ref(false)

const limit = ref(10)
const currentPage = ref(1)

const isDownloadingPdf = ref(false)
const pdfTemplate = ref(null)
const pdfDataList = ref([])
const currentUrl  = window.location.origin

// Student Modal State
const showModal         = ref(false)
const isEditMode        = ref(false)
const selectedStudentId = ref(null)
const studentForm       = reactive({
  nama_lengkap: '',
  nim: '',
  kelas: '',
  password: '',
})

const kelasList = computed(() =>
  [...new Set(mahasiswaList.value.map(m => m.kelas))].filter(Boolean).sort()
)

const filteredList = computed(() => {
  let list = mahasiswaList.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(m =>
      m.nama_lengkap.toLowerCase().includes(q) ||
      m.nim.toLowerCase().includes(q)
    )
  }
  if (filterKelas.value) {
    list = list.filter(m => m.kelas === filterKelas.value)
  }
  if (filterLocked.value) {
    list = list.filter(m => m.is_exam_locked)
  }
  return list
})

const totalPages = computed(() => Math.ceil(filteredList.value.length / limit.value) || 1)

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * limit.value
  const end = start + limit.value
  return filteredList.value.slice(start, end)
})

watch([search, filterKelas, filterLocked, limit], () => {
  currentPage.value = 1
})

const lockedCount = computed(() => mahasiswaList.value.filter(m => m.is_exam_locked).length)

async function fetchData() {
  loading.value = true
  try {
    const { data } = await authApi.getMahasiswaList()
    mahasiswaList.value = data
    currentPage.value = 1
  } catch (err) {
    alert('Gagal mengambil data mahasiswa: ' + (err.response?.data?.detail || err.message))
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  isEditMode.value = false
  selectedStudentId.value = null
  Object.assign(studentForm, {
    nama_lengkap: '',
    nim: '',
    kelas: '',
    password: '',
  })
  showModal.value = true
}

function openEditModal(mhs) {
  isEditMode.value = true
  selectedStudentId.value = mhs.id
  Object.assign(studentForm, {
    nama_lengkap: mhs.nama_lengkap,
    nim: mhs.nim,
    kelas: mhs.kelas || '',
    password: '', // Kosongkan agar tidak mengubah password secara tidak sengaja
  })
  showModal.value = true
}

async function saveStudent() {
  saving.value = true
  try {
    const payload = { ...studentForm }
    if (isEditMode.value) {
      await authApi.updateMahasiswa(selectedStudentId.value, payload)
    } else {
      await authApi.createMahasiswa(payload)
    }
    showModal.value = false
    await fetchData()
  } catch (err) {
    alert('Gagal menyimpan data: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data)))
  } finally {
    saving.value = false
  }
}

async function unlockMahasiswa(pk) {
  if (!confirm('Buka kunci akun mahasiswa ini?')) return
  try {
    await authApi.unlockMahasiswa(pk)
    await fetchData()
  } catch (err) {
    alert('Gagal membuka kunci akun: ' + (err.response?.data?.detail || err.message))
  }
}

async function hapusMahasiswa(pk, nama) {
  if (!confirm(`Hapus mahasiswa "${nama}" dari sistem? Aksi ini tidak dapat dibatalkan.`)) return
  try {
    await authApi.hapusMahasiswa(pk)
    await fetchData()
  } catch (err) {
    alert('Gagal menghapus mahasiswa: ' + (err.response?.data?.detail || err.message))
  }
}

async function onImportExcel(event) {
  const file = event.target.files[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file_excel', file)
  try {
    await authApi.importMahasiswa(fd)
    await fetchData()
  } catch (err) {
    alert('Gagal import file: ' + (err.response?.data?.detail || err.message))
  } finally {
    event.target.value = ''
  }
}

async function exportKartu() {
  if (filteredList.value.length === 0) {
    alert('Tidak ada mahasiswa untuk diekspor.')
    return
  }
  
  isDownloadingPdf.value = true
  
  try {
    // Gunakan daftar yang terfilter
    pdfDataList.value = filteredList.value
    
    // Tunggu Vue render template tersembunyi
    await nextTick()
    
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Kartu-Login-${filterKelas.value || 'Semua-Kelas'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    await html2pdf().set(opt).from(pdfTemplate.value).save()
  } catch (err) {
    console.error('Gagal export PDF:', err)
    alert('Terjadi kesalahan saat membuat PDF kartu login.')
  } finally {
    isDownloadingPdf.value = false
    pdfDataList.value = []
  }
}

onMounted(fetchData)
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.admin-body   { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.admin-main   { flex: 1; padding: var(--space-6); overflow-y: auto; }
.admin-content{ max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-6); }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.header-actions { display: flex; gap: var(--space-3); }
.page-title { font-size: 1.4rem; font-weight: 800; }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
}

.student-modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

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
  width: 210mm;
  box-sizing: border-box;
}

.pdf-template * {
  color: #000 !important;
}

.pdf-card {
  page-break-inside: avoid;
  margin-bottom: 20px;
}

.pdf-title {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin-bottom: 30px;
  text-decoration: underline;
}

.pdf-info-section {
  font-size: 12pt;
  line-height: 1.6;
  margin-bottom: 20px;
}

.pdf-info-row {
  display: flex;
  margin-bottom: 6px;
}

.pdf-info-label {
  width: 150px;
  flex-shrink: 0;
}

.pdf-info-colon {
  width: 15px;
  flex-shrink: 0;
}

.pdf-info-value {
  flex-grow: 1;
}

.pdf-footer {
  font-size: 10pt;
  font-style: italic;
  margin-bottom: 20px;
}

.pdf-cut-line {
  text-align: center;
  color: #666;
  font-size: 12pt;
  letter-spacing: 2px;
  overflow: hidden;
  white-space: nowrap;
  margin: 30px 0;
}

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
</style>
