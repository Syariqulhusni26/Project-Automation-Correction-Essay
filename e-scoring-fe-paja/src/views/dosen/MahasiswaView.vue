<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import client, { fetchAll } from '../../api/client'
import { downloadFile } from '../../api/download'

const loading = ref(true)
const list = ref([])
const error = ref(null)
const notif = ref(null)

const filterKelas = ref('')
const search = ref('')
const showPw = ref({}) // id -> boolean, password disembunyikan secara default

// Paginasi sisi klien agar tabel tetap ringan untuk ratusan mahasiswa
const page = ref(1)
const perPage = 25

const showImport = ref(false)
const excelFile = ref(null)
const importing = ref(false)
const importResult = ref(null)
const downloading = ref(false)

// Tambah manual satu mahasiswa — password awal diset sama dengan NIM
const showTambah = ref(false)
const tambahForm = ref({ nama_lengkap: '', nim: '', kelas: '' })
const tambahError = ref(null)
const saving = ref(false)

const kelasList = computed(() =>
  [...new Set(list.value.map((m) => m.kelas).filter(Boolean))].sort()
)
const filtered = computed(() => {
  let rows = list.value
  if (filterKelas.value) rows = rows.filter((m) => m.kelas === filterKelas.value)
  const q = search.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (m) => m.nama_lengkap.toLowerCase().includes(q) || String(m.nim).includes(q)
    )
  }
  return rows
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * perPage, page.value * perPage)
)
watch([search, filterKelas], () => { page.value = 1 })
watch(totalPages, (n) => { if (page.value > n) page.value = n })

async function load() {
  loading.value = true
  try {
    list.value = await fetchAll('/auth/mahasiswa/')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat data mahasiswa.'
  } finally {
    loading.value = false
  }
}

// Template Excel dibuat di sisi browser (backend tidak menyediakan endpoint template)
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nama', 'NIM', 'Kelas'],
    ['Contoh: Muhammad Rizki', '2023573010001', 'TI-3A'],
  ])
  ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 10 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Mahasiswa')
  XLSX.writeFile(wb, 'template_import_mahasiswa.xlsx')
}

function bukaImport() {
  excelFile.value = null
  importResult.value = null
  showImport.value = true
}

function pilihFile(e) {
  excelFile.value = e.target.files[0] || null
}

async function importExcel() {
  if (!excelFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const fd = new FormData()
    fd.append('file_excel', excelFile.value)
    const { data } = await client.post('/auth/mahasiswa/import/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal mengimpor file.'
    showImport.value = false
  } finally {
    importing.value = false
  }
}

async function exportKartu() {
  downloading.value = true
  try {
    const q = filterKelas.value ? `?kelas=${encodeURIComponent(filterKelas.value)}` : ''
    await downloadFile(`/auth/mahasiswa/export-kartu/${q}`, 'kartu_ujian.pdf')
  } catch {
    error.value = 'Gagal mengunduh kartu ujian.'
  } finally {
    downloading.value = false
  }
}

function bukaTambah() {
  tambahForm.value = { nama_lengkap: '', nim: '', kelas: '' }
  tambahError.value = null
  showTambah.value = true
}

async function simpanTambah() {
  tambahError.value = null
  saving.value = true
  try {
    await client.post('/auth/mahasiswa/', {
      ...tambahForm.value,
      password: tambahForm.value.nim, // password awal = NIM, mahasiswa bisa menggantinya sendiri
    })
    notif.value = `Mahasiswa ${tambahForm.value.nama_lengkap} ditambahkan. Password awal = NIM.`
    showTambah.value = false
    await load()
  } catch (err) {
    const d = err.response?.data
    tambahError.value =
      d?.detail || d?.nim?.[0] || d?.nama_lengkap?.[0] || d?.kelas?.[0] || 'Gagal menambahkan mahasiswa.'
  } finally {
    saving.value = false
  }
}

async function unlock(m) {
  if (!confirm(`Buka kunci akun ${m.nama_lengkap}? Mahasiswa bisa login dan ikut ujian lagi.`)) return
  try {
    const { data } = await client.post(`/auth/mahasiswa/${m.id}/unlock/`)
    notif.value = data.detail
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal membuka kunci.'
  }
}

async function hapus(m) {
  if (!confirm(`HAPUS akun ${m.nama_lengkap} (${m.nim})? Semua data ujiannya ikut terhapus.`)) return
  try {
    const { data } = await client.delete(`/auth/mahasiswa/${m.id}/`)
    notif.value = data.detail
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal menghapus.'
  }
}

onMounted(load)
</script>

<template>
  <div class="container py-4">
    <!-- Header halaman -->
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h2 class="h4 fw-bold mb-0">Manajemen Mahasiswa</h2>
        <p class="text-secondary small mb-0">Import data, kelola akun, dan cetak kartu login mahasiswa</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-outline-primary" @click="downloadTemplate">
          <i class="bi bi-file-earmark-arrow-down me-1"></i>Download Template
        </button>
        <button class="btn btn-outline-primary" :disabled="downloading || list.length === 0" @click="exportKartu">
          <span v-if="downloading" class="spinner-border spinner-border-sm me-1"></span>
          <i class="bi bi-card-heading me-1"></i>Download Kartu Login
        </button>
        <button class="btn btn-outline-primary" @click="bukaTambah">
          <i class="bi bi-person-plus me-1"></i>Tambah Mahasiswa
        </button>
        <button class="btn btn-primary" @click="bukaImport">
          <i class="bi bi-file-earmark-excel me-1"></i>Import Excel
        </button>
      </div>
    </div>

    <div v-if="notif" class="alert alert-success alert-dismissible">
      {{ notif }}<button type="button" class="btn-close" @click="notif = null"></button>
    </div>
    <div v-if="error" class="alert alert-danger alert-dismissible">
      {{ error }}<button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Tabel full-width -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="fw-semibold">
          Daftar Mahasiswa
          <span class="badge text-bg-light border ms-1">{{ filtered.length }}</span>
        </span>
        <!-- Pencarian + filter kelas dalam satu input-group agar selalu satu baris -->
        <div class="input-group input-group-sm toolbar-filter">
          <span class="input-group-text bg-body"><i class="bi bi-search"></i></span>
          <input v-model="search" type="text" class="form-control" placeholder="Cari nama / NIM…" />
          <select v-model="filterKelas" class="form-select flex-grow-0 w-auto">
            <option value="">Semua kelas</option>
            <option v-for="k in kelasList" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

      <div v-else-if="list.length === 0" class="card-body text-center py-5">
        <div class="empty-icon mx-auto mb-3"><i class="bi bi-people"></i></div>
        <p class="text-secondary mb-1">Belum ada mahasiswa terdaftar.</p>
        <p class="small text-secondary mb-3">Unduh template, isi data mahasiswa, lalu import.</p>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-outline-primary btn-sm" @click="downloadTemplate">
            <i class="bi bi-file-earmark-arrow-down me-1"></i>Download Template
          </button>
          <button class="btn btn-primary btn-sm" @click="bukaImport">
            <i class="bi bi-file-earmark-excel me-1"></i>Import Excel
          </button>
        </div>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Nama</th>
              <th>NIM</th>
              <th>Kelas</th>
              <th class="d-none d-md-table-cell">Password</th>
              <th class="text-center">Status</th>
              <th class="text-end">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="6" class="text-center text-secondary py-4">Tidak ada mahasiswa yang cocok dengan filter.</td>
            </tr>
            <tr v-for="m in paged" :key="m.id" :class="{ 'table-danger': m.is_exam_locked }">
              <td class="fw-semibold">{{ m.nama_lengkap }}</td>
              <td>{{ m.nim }}</td>
              <td>{{ m.kelas }}</td>
              <td class="d-none d-md-table-cell">
                <template v-if="m.plain_password">
                  <code>{{ showPw[m.id] ? m.plain_password : '••••••' }}</code>
                  <button
                    class="btn btn-sm btn-link p-0 ms-1 text-secondary"
                    :title="showPw[m.id] ? 'Sembunyikan password' : 'Tampilkan password'"
                    @click="showPw[m.id] = !showPw[m.id]"
                  >
                    <i :class="showPw[m.id] ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </template>
                <span v-else>—</span>
              </td>
              <td class="text-center">
                <span v-if="m.is_exam_locked" class="badge text-bg-danger" :title="m.lock_reason">
                  <i class="bi bi-lock-fill me-1"></i>Terkunci
                </span>
                <span v-else class="badge text-bg-success">Aktif</span>
              </td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button v-if="m.is_exam_locked" class="btn btn-warning fw-semibold" title="Buka kunci akun" @click="unlock(m)">
                    <i class="bi bi-unlock-fill me-1"></i>Buka Kunci
                  </button>
                  <button class="btn btn-outline-danger" title="Hapus" @click="hapus(m)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginasi -->
      <div v-if="!loading && totalPages > 1" class="card-footer bg-body d-flex justify-content-between align-items-center">
        <span class="small text-secondary">
          Menampilkan {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, filtered.length) }} dari {{ filtered.length }}
        </span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" :disabled="page === 1" @click="page--">
            <i class="bi bi-chevron-left"></i>
          </button>
          <span class="btn btn-outline-secondary disabled">Hal {{ page }}/{{ totalPages }}</span>
          <button class="btn btn-outline-secondary" :disabled="page === totalPages" @click="page++">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal tambah mahasiswa manual -->
    <Teleport to="body">
      <div v-if="showTambah" class="modal fade show d-block" tabindex="-1" @click.self="showTambah = false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold"><i class="bi bi-person-plus me-2"></i>Tambah Mahasiswa</h5>
              <button type="button" class="btn-close" @click="showTambah = false"></button>
            </div>
            <form @submit.prevent="simpanTambah">
              <div class="modal-body">
                <div v-if="tambahError" class="alert alert-danger py-2 small">{{ tambahError }}</div>

                <label class="form-label small fw-semibold">Nama Lengkap <span class="text-danger">*</span></label>
                <input v-model.trim="tambahForm.nama_lengkap" type="text" class="form-control mb-3" required />

                <label class="form-label small fw-semibold">NIM <span class="text-danger">*</span></label>
                <input v-model.trim="tambahForm.nim" type="text" class="form-control mb-3" pattern="\d+" title="NIM hanya angka" required />

                <label class="form-label small fw-semibold">Kelas <span class="text-danger">*</span></label>
                <input v-model.trim="tambahForm.kelas" type="text" class="form-control" required />

                <div class="form-text mt-3">
                  <i class="bi bi-info-circle me-1"></i>Password awal otomatis sama dengan <strong>NIM</strong>.
                  Mahasiswa dapat menggantinya lewat tombol "Ganti Password" setelah login.
                </div>
              </div>
              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-outline-secondary" @click="showTambah = false">Batal</button>
                <button type="submit" class="btn btn-primary px-4" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div v-if="showTambah" class="modal-backdrop fade show"></div>
    </Teleport>

    <!-- Modal import -->
    <Teleport to="body">
      <div v-if="showImport" class="modal fade show d-block" tabindex="-1" @click.self="showImport = false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold">Import Mahasiswa</h5>
              <button type="button" class="btn-close" @click="showImport = false"></button>
            </div>
            <div class="modal-body">
              <p class="small text-secondary">
                Format kolom (baris pertama = header): <code>Nama | NIM | Kelas</code>.
                Password login dibuat otomatis oleh sistem — unduh <strong>Kartu Login</strong> setelah import untuk membagikannya.
              </p>
              <label class="form-label small fw-semibold">File Excel (.xlsx) <span class="text-danger">*</span></label>
              <input type="file" class="form-control" accept=".xlsx" @change="pilihFile" />

              <div v-if="importResult" class="alert alert-info small mt-3 mb-0">
                {{ importResult.detail }}
                <div v-if="importResult.nim_duplikat?.length">
                  NIM duplikat (dilewati): {{ importResult.nim_duplikat.join(', ') }}
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-outline-secondary" @click="showImport = false">
                {{ importResult ? 'Tutup' : 'Batal' }}
              </button>
              <button class="btn btn-primary px-4" :disabled="!excelFile || importing" @click="importExcel">
                <span v-if="importing" class="spinner-border spinner-border-sm me-1"></span>Import
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showImport" class="modal-backdrop fade show"></div>
    </Teleport>
  </div>
</template>

<style scoped>
.toolbar-filter {
  max-width: 340px;
  flex-wrap: nowrap;
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
