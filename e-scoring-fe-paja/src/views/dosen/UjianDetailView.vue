<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import client from '../../api/client'
import KelasPicker from '../../components/KelasPicker.vue'

const route = useRoute()
const ujianId = route.params.id

const loading = ref(true)
const ujian = ref(null)
const error = ref(null)
const notif = ref(null)

const showEdit = ref(false)
const editForm = ref({})
const savingEdit = ref(false)

const soalForm = ref({ pertanyaan: '', referensi_jawaban: '', kata_kunci: '' })
const savingSoal = ref(false)

const excelFile = ref(null)
const uploading = ref(false)
const activating = ref(false)

const statusBadge = {
  draft: 'text-bg-secondary',
  aktif: 'text-bg-success',
  selesai: 'status-selesai',
}

async function load() {
  loading.value = true
  try {
    const { data } = await client.get(`/ujian/${ujianId}/`)
    ujian.value = data
    editForm.value = {
      judul: data.judul,
      deskripsi: data.deskripsi,
      durasi_menit: data.durasi_menit,
      kelas_target: data.kelas_target,
      tanggal_ujian: data.tanggal_ujian || '',
    }
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat ujian.'
  } finally {
    loading.value = false
  }
}

async function simpanEdit() {
  savingEdit.value = true
  try {
    const payload = { ...editForm.value }
    if (!payload.tanggal_ujian) delete payload.tanggal_ujian
    await client.put(`/ujian/${ujianId}/`, payload)
    notif.value = 'Perubahan ujian tersimpan.'
    showEdit.value = false
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Gagal menyimpan.'
  } finally {
    savingEdit.value = false
  }
}

async function tambahSoal() {
  savingSoal.value = true
  try {
    await client.post(`/ujian/${ujianId}/soal/`, soalForm.value)
    notif.value = 'Soal ditambahkan.'
    soalForm.value = { pertanyaan: '', referensi_jawaban: '', kata_kunci: '' }
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Gagal menambah soal.'
  } finally {
    savingSoal.value = false
  }
}

async function hapusSoal(s) {
  if (!confirm(`Hapus soal nomor ${s.nomor_urut}?`)) return
  try {
    await client.delete(`/ujian/soal/${s.id}/`)
    notif.value = 'Soal dihapus. Nomor urut dirapikan otomatis.'
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal menghapus soal.'
  }
}

function pilihFile(e) {
  excelFile.value = e.target.files[0] || null
}

function templateBelumTersedia() {
  alert('Template belum tersedia — format soal masih didiskusikan dengan dosen pembimbing.')
}

async function uploadExcel() {
  if (!excelFile.value) return
  if (ujian.value.soal.length > 0 &&
      !confirm('Upload Excel akan MENGGANTI semua soal yang sudah ada. Lanjutkan?')) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file_excel', excelFile.value)
    const { data } = await client.post(`/ujian/${ujianId}/soal/upload/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    notif.value = data.detail
    excelFile.value = null
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal mengunggah file.'
  } finally {
    uploading.value = false
  }
}

async function aktivasi() {
  const aksi = ujian.value.status === 'draft' ? 'MENGAKTIFKAN' : 'MENUTUP'
  if (!confirm(`Yakin ${aksi} ujian ini?`)) return
  activating.value = true
  try {
    const { data } = await client.post(`/ujian/${ujianId}/aktivasi/`)
    notif.value = data.detail
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal mengubah status.'
  } finally {
    activating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container py-4">
    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="!ujian" class="alert alert-danger">{{ error }}</div>

    <template v-else>
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <router-link :to="{ name: 'ujian-list' }" class="btn-back mb-3">
            <i class="bi bi-arrow-left me-1"></i>Kembali ke daftar ujian
          </router-link>
          <h1 class="h4 fw-bold mb-1 mt-1">{{ ujian.judul }}</h1>
          <div class="text-secondary small">
            {{ ujian.mata_kuliah_nama }}
            <span class="badge ms-2" :class="statusBadge[ujian.status]">{{ ujian.status_display }}</span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" @click="showEdit = !showEdit">
            <i class="bi bi-pencil me-1"></i>Edit
          </button>
          <router-link :to="{ name: 'ujian-monitor', params: { id: ujianId } }" class="btn btn-outline-success btn-sm">
            <i class="bi bi-display me-1"></i>Monitor
          </router-link>
          <router-link :to="{ name: 'ujian-laporan', params: { id: ujianId } }" class="btn btn-outline-dark btn-sm">
            <i class="bi bi-bar-chart me-1"></i>Laporan
          </router-link>
          <button
            v-if="ujian.status !== 'selesai'"
            class="btn btn-sm"
            :class="ujian.status === 'draft' ? 'btn-success' : 'btn-warning'"
            :disabled="activating || (ujian.status === 'draft' && ujian.jumlah_soal === 0)"
            @click="aktivasi"
          >
            <span v-if="activating" class="spinner-border spinner-border-sm me-1"></span>
            <template v-if="ujian.status === 'draft'"><i class="bi bi-play-fill me-1"></i>Aktifkan Ujian</template>
            <template v-else><i class="bi bi-stop-fill me-1"></i>Tutup Ujian</template>
          </button>
        </div>
      </div>

      <div v-if="notif" class="alert alert-success alert-dismissible">
        {{ notif }}<button type="button" class="btn-close" @click="notif = null"></button>
      </div>
      <div v-if="error" class="alert alert-danger alert-dismissible">
        {{ error }}<button type="button" class="btn-close" @click="error = null"></button>
      </div>
      <div v-if="ujian.status === 'draft' && ujian.jumlah_soal === 0" class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-1"></i>Ujian belum bisa diaktifkan karena belum memiliki soal.
      </div>

      <!-- Info ringkas -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm"><div class="card-body py-2">
            <div class="small text-secondary">Durasi</div>
            <div class="fw-bold">{{ ujian.durasi_menit }} menit</div>
          </div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm"><div class="card-body py-2">
            <div class="small text-secondary">Jumlah Soal</div>
            <div class="fw-bold">{{ ujian.jumlah_soal }} (maks. nilai {{ ujian.nilai_maksimal }})</div>
          </div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm"><div class="card-body py-2">
            <div class="small text-secondary">Kelas Target</div>
            <div class="fw-bold">{{ ujian.kelas_target }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm"><div class="card-body py-2">
            <div class="small text-secondary">Tanggal</div>
            <div class="fw-bold">{{ ujian.tanggal_ujian || '—' }}</div>
          </div></div>
        </div>
      </div>

      <!-- Form edit -->
      <div v-if="showEdit" class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-body fw-semibold">Edit Ujian</div>
        <div class="card-body">
          <form @submit.prevent="simpanEdit" class="row g-3">
            <div class="col-md-8">
              <label class="form-label small fw-semibold">Judul</label>
              <input v-model="editForm.judul" class="form-control" required />
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Durasi (menit)</label>
              <input v-model.number="editForm.durasi_menit" type="number" min="5" class="form-control" required />
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">Deskripsi</label>
              <textarea v-model="editForm.deskripsi" class="form-control" rows="2"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Kelas Target</label>
              <KelasPicker v-model="editForm.kelas_target" />
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Tanggal Ujian</label>
              <input v-model="editForm.tanggal_ujian" type="date" class="form-control" />
            </div>
            <div class="col-12">
              <button class="btn btn-primary" :disabled="savingEdit">
                <span v-if="savingEdit" class="spinner-border spinner-border-sm me-1"></span>Simpan Perubahan
              </button>
              <button type="button" class="btn btn-outline-secondary ms-2" @click="showEdit = false">Batal</button>
            </div>
          </form>
        </div>
      </div>

      <div class="row g-4">
        <!-- Daftar soal -->
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-body fw-semibold">
              <i class="bi bi-list-ol me-1"></i>Daftar Soal ({{ ujian.soal.length }})
            </div>
            <div class="card-body p-0">
              <div v-if="ujian.soal.length === 0" class="text-center text-secondary py-4">
                Belum ada soal. Tambahkan manual atau upload Excel.
              </div>
              <div v-else class="accordion accordion-flush" id="soalAccordion">
                <div v-for="s in ujian.soal" :key="s.id" class="accordion-item">
                  <h2 class="accordion-header d-flex align-items-center">
                    <button
                      class="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="`#soal-${s.id}`"
                    >
                      <span class="badge text-bg-primary me-2">{{ s.nomor_urut }}</span>
                      <span class="text-truncate">{{ s.pertanyaan }}</span>
                    </button>
                    <button class="btn btn-sm btn-outline-danger mx-2 flex-shrink-0" @click="hapusSoal(s)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </h2>
                  <div :id="`soal-${s.id}`" class="accordion-collapse collapse" data-bs-parent="#soalAccordion">
                    <div class="accordion-body small">
                      <p class="mb-2"><strong>Pertanyaan:</strong> {{ s.pertanyaan }}</p>
                      <p class="mb-2"><strong>Referensi Jawaban:</strong> {{ s.referensi_jawaban || '—' }}</p>
                      <p class="mb-0"><strong>Kata Kunci:</strong> {{ s.kata_kunci || '—' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tambah soal + upload -->
        <div class="col-lg-5">
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-body fw-semibold"><i class="bi bi-plus-circle me-1"></i>Tambah Soal Manual</div>
            <div class="card-body">
              <form @submit.prevent="tambahSoal">
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Pertanyaan <span class="text-danger">*</span></label>
                  <textarea v-model="soalForm.pertanyaan" class="form-control" rows="3" required></textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Referensi Jawaban (acuan AI) <span class="text-danger">*</span></label>
                  <textarea v-model="soalForm.referensi_jawaban" class="form-control" rows="3" required></textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Kata Kunci <span class="text-danger">*</span></label>
                  <input v-model="soalForm.kata_kunci" class="form-control" placeholder="pisahkan dengan koma" required />
                  <div class="form-text">Referensi jawaban dan kata kunci dipakai LLM sebagai acuan penilaian.</div>
                </div>
                <button class="btn btn-primary w-100" :disabled="savingSoal">
                  <span v-if="savingSoal" class="spinner-border spinner-border-sm me-1"></span>Tambah Soal
                </button>
              </form>
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-header bg-body d-flex justify-content-between align-items-center">
              <span class="fw-semibold"><i class="bi bi-file-earmark-excel me-1"></i>Upload Soal via Excel</span>
              <button type="button" class="btn btn-sm btn-link text-decoration-none p-0" @click="templateBelumTersedia">
                <i class="bi bi-download me-1"></i>Template
              </button>
            </div>
            <div class="card-body">
              <p class="small text-secondary mb-2">
                Kolom: <code>No | Pertanyaan | Referensi Jawaban | Kata Kunci</code>. Soal lama akan diganti.
              </p>
              <input type="file" class="form-control mb-2" accept=".xlsx" @change="pilihFile" />
              <button class="btn btn-outline-primary w-100" :disabled="!excelFile || uploading" @click="uploadExcel">
                <span v-if="uploading" class="spinner-border spinner-border-sm me-1"></span>Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
