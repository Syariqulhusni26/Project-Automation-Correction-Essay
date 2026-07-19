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
                class="btn btn-secondary"
                @click="exportKartu"
                :disabled="isDownloadingPdf"
              >
                📄 {{ isDownloadingPdf ? 'Memproses PDF...' : 'Export Kartu Login' }}
                <span v-if="isDownloadingPdf" class="spinner" style="width:1rem;height:1rem;border-width:2px;margin-left:0.5rem"></span>
              </button>
              <!-- Import Excel -->
              <label id="btn-import-mahasiswa" class="btn btn-secondary" style="cursor:pointer;">
                📥 Import Excel
                <input type="file" accept=".xlsx,.xls" hidden @change="onImportExcel" />
              </label>
              <!-- Tambah Manual -->
              <button
                id="btn-add-mahasiswa"
                class="btn btn-primary"
                @click="openCreateModal"
              >
                + Tambah Mahasiswa
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
              class="btn btn-sm btn-secondary"
              :class="{ 'btn-danger': filterLocked }"
              @click="filterLocked = !filterLocked"
            >
              🔒 {{ filterLocked ? 'Tampilkan Semua' : 'Tampilkan Terkunci' }}
            </button>
          </div>

          <Loading v-if="loading" message="Memuat mahasiswa..." />

          <div v-else class="table-wrapper glass-card" style="padding: 0;">
            <table>
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>NIM (Username)</th>
                  <th>Kelas</th>
                  <th>Password Login</th>
                  <th>Status Akun</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredList.length === 0">
                  <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
                    Tidak ada data mahasiswa.
                  </td>
                </tr>
                <tr v-for="mhs in filteredList" :key="mhs.id">
                  <td class="font-medium">{{ mhs.nama_lengkap }}</td>
                  <td class="text-muted text-sm">{{ mhs.nim }}</td>
                  <td>{{ mhs.kelas || '—' }}</td>
                  <td class="font-mono text-sm text-primary-400 font-bold">{{ mhs.plain_password || '🔑 Terenkripsi' }}</td>
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
                        class="btn btn-sm btn-secondary"
                        @click="openEditModal(mhs)"
                        title="Edit Mahasiswa"
                      >
                        ✏️
                      </button>
                      <!-- Unlock -->
                      <button
                        v-if="mhs.is_exam_locked"
                        :id="`btn-unlock-${mhs.id}`"
                        class="btn btn-sm btn-secondary"
                        @click="unlockMahasiswa(mhs.id)"
                        title="Buka Kunci Akun"
                      >
                        🔓 Unlock
                      </button>
                      <!-- Hapus -->
                      <button
                        :id="`btn-hapus-${mhs.id}`"
                        class="btn btn-sm btn-danger"
                        @click="hapusMahasiswa(mhs.id, mhs.nama_lengkap)"
                        title="Hapus Mahasiswa"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Info terkunci -->
          <p v-if="lockedCount > 0" class="text-sm" style="color: var(--color-danger);">
            ⚠️ {{ lockedCount }} mahasiswa dalam status terkunci akibat pelanggaran.
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
          
          <table class="pdf-info-table">
            <tr>
              <td width="140">Nama Mahasiswa</td>
              <td width="10">:</td>
              <td><strong>{{ mhs.nama_lengkap }}</strong></td>
            </tr>
            <tr>
              <td>NIM / Username</td>
              <td>:</td>
              <td><strong>{{ mhs.nim }}</strong></td>
            </tr>
            <tr>
              <td>Kelas</td>
              <td>:</td>
              <td>{{ mhs.kelas || '—' }}</td>
            </tr>
            <tr>
              <td>Password</td>
              <td>:</td>
              <td><strong style="font-family: monospace; font-size: 1.1em;">{{ mhs.plain_password || '(Terenkripsi)' }}</strong></td>
            </tr>
            <tr>
              <td>Link Ujian</td>
              <td>:</td>
              <td>{{ currentUrl }}</td>
            </tr>
          </table>

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
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { authApi } from '@/services/api'
import { useDownload } from '@/composables/useDownload'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import KopInstitusi from '@/components/KopInstitusi.vue'
import html2pdf from 'html2pdf.js'

const { downloadBlob } = useDownload()

const loading      = ref(false)
const saving       = ref(false)
const mahasiswaList= ref([])
const search       = ref('')
const filterKelas  = ref('')
const filterLocked = ref(false)

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

const lockedCount = computed(() => mahasiswaList.value.filter(m => m.is_exam_locked).length)

async function fetchData() {
  loading.value = true
  try {
    const { data } = await authApi.getMahasiswaList()
    mahasiswaList.value = data
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
  background: white;
  color: #000;
  padding: 10mm;
  font-family: 'Times New Roman', Times, serif;
  width: 210mm;
  box-sizing: border-box;
}

.pdf-card {
  page-break-inside: avoid;
  margin-bottom: 20px;
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
  margin-bottom: 10px;
  font-size: 12pt;
}

.pdf-info-table td {
  padding: 6px;
  vertical-align: top;
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
</style>
