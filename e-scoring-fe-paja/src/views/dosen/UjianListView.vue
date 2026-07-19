<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import client, { fetchAll } from '../../api/client'
import KelasPicker from '../../components/KelasPicker.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const list = ref([])
const mataKuliah = ref([])
const error = ref(null)
const notif = ref(null)
const showForm = ref(false)
const saving = ref(false)

const search = ref(route.query.cari || '')
const statusFilter = ref('')
const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) rows = rows.filter((u) => u.status === statusFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (u) => u.judul.toLowerCase().includes(q) || u.mata_kuliah_nama.toLowerCase().includes(q)
    )
  }
  return rows
})

const form = ref({
  judul: '',
  deskripsi: '',
  mata_pelajaran: '',
  durasi_menit: 90,
  kelas_target: '',
  tanggal_ujian: '',
})

// Dosen memilih jam mulai & selesai; durasi (menit) dihitung otomatis dan itu
// yang dikirim ke server — backend hanya menyimpan durasi_menit, bukan jam.
const jamMulai = ref('08:00')
const jamSelesai = ref('09:30')
const jamValid = computed(() => jamSelesai.value > jamMulai.value)

watch([jamMulai, jamSelesai], () => {
  if (!jamValid.value) return
  const [h1, m1] = jamMulai.value.split(':').map(Number)
  const [h2, m2] = jamSelesai.value.split(':').map(Number)
  form.value.durasi_menit = (h2 * 60 + m2) - (h1 * 60 + m1)
}, { immediate: true })

const statusBadge = {
  draft: 'text-bg-secondary',
  aktif: 'text-bg-success',
  selesai: 'status-selesai',
}

async function load() {
  loading.value = true
  try {
    const [u, mk] = await Promise.all([
      fetchAll('/ujian/'),
      fetchAll('/ujian/mata-kuliah/'),
    ])
    list.value = u
    mataKuliah.value = mk
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat data.'
  } finally {
    loading.value = false
  }
}

async function buatUjian() {
  saving.value = true
  error.value = null
  try {
    const payload = { ...form.value }
    if (!payload.tanggal_ujian) delete payload.tanggal_ujian
    const { data } = await client.post('/ujian/', payload)
    form.value = { judul: '', deskripsi: '', mata_pelajaran: '', durasi_menit: 90, kelas_target: '', tanggal_ujian: '' }
    jamMulai.value = '08:00'
    jamSelesai.value = '09:30'
    // Langsung arahkan ke halaman kelola soal — ujian baru selalu kosong (status Draft)
    // dan belum bisa diaktifkan sebelum ada soal.
    router.push({ name: 'ujian-detail', params: { id: data.id } })
  } catch (err) {
    error.value = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Gagal membuat ujian.'
  } finally {
    saving.value = false
  }
}

async function hapus(u) {
  if (!confirm(`Hapus ujian "${u.judul}"? Semua soal dan hasil pengerjaan ikut terhapus.`)) return
  try {
    const { data } = await client.delete(`/ujian/${u.id}/`)
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
    <div class="d-flex justify-content-end mb-4">
      <button class="btn btn-primary" @click="showForm = !showForm">
        <i class="bi bi-plus-lg me-1"></i>Buat Ujian
      </button>
    </div>

    <div v-if="notif" class="alert alert-success alert-dismissible">
      {{ notif }}<button type="button" class="btn-close" @click="notif = null"></button>
    </div>
    <div v-if="error" class="alert alert-danger alert-dismissible">
      {{ error }}<button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <div v-if="showForm" class="card border-0 shadow-sm mb-4">
      <div class="card-header bg-body fw-semibold">Buat Ujian Baru</div>
      <div class="card-body">
        <div v-if="mataKuliah.length === 0" class="alert alert-warning mb-0">
          Anda belum punya mata kuliah.
          <router-link :to="{ name: 'mata-kuliah' }">Buat mata kuliah dulu</router-link>.
        </div>
        <form v-else @submit.prevent="buatUjian" class="row g-3">
          <div class="col-md-8">
            <label class="form-label small fw-semibold">Judul Ujian</label>
            <input v-model="form.judul" class="form-control" placeholder="cth: UTS Pemrograman Berorientasi Objek" required />
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Mata Kuliah</label>
            <select v-model="form.mata_pelajaran" class="form-select" required>
              <option value="" disabled>— pilih —</option>
              <option v-for="mk in mataKuliah" :key="mk.id" :value="mk.id">{{ mk.nama }}</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Deskripsi / Petunjuk (opsional)</label>
            <textarea v-model="form.deskripsi" class="form-control" rows="2" placeholder="Petunjuk pengerjaan untuk mahasiswa"></textarea>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold">Jam Mulai</label>
            <input v-model="jamMulai" type="time" class="form-control" required />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold">Jam Selesai</label>
            <input v-model="jamSelesai" type="time" class="form-control" :class="{ 'is-invalid': !jamValid }" required />
            <div v-if="!jamValid" class="invalid-feedback">Harus setelah jam mulai</div>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold">Durasi</label>
            <div class="form-control bg-body-secondary fw-semibold text-center">
              {{ jamValid ? `${form.durasi_menit} menit` : '—' }}
            </div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold">Tanggal Ujian (opsional)</label>
            <input v-model="form.tanggal_ujian" type="date" class="form-control" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label small fw-semibold">Kelas Target</label>
            <KelasPicker v-model="form.kelas_target" />
          </div>
          <div class="col-12">
            <div class="alert alert-light border small mb-3">
              <i class="bi bi-info-circle me-1"></i>
              Ujian akan tersimpan sebagai <strong>Draft</strong> dan belum terlihat oleh mahasiswa.
              Anda akan diarahkan ke halaman ujian untuk menambahkan soal — aktifkan setelah soal siap.
            </div>
            <button class="btn btn-primary" :disabled="saving || !form.kelas_target || !jamValid">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>Simpan &amp; Tambah Soal
            </button>
            <button type="button" class="btn btn-outline-secondary ms-2" @click="showForm = false">Batal</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <!-- Belum ada ujian sama sekali -->
    <div v-else-if="list.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <div class="empty-icon mx-auto mb-3"><i class="bi bi-journal-plus"></i></div>
        <p class="text-secondary mb-1">Belum ada ujian yang dibuat.</p>
        <p class="small text-secondary mb-3">
          {{ mataKuliah.length === 0
            ? 'Buat mata kuliah terlebih dahulu, lalu susun ujian esai pertama Anda.'
            : 'Klik tombol di bawah untuk menyusun ujian esai pertama Anda.' }}
        </p>
        <router-link v-if="mataKuliah.length === 0" :to="{ name: 'mata-kuliah' }" class="btn btn-primary btn-sm">
          <i class="bi bi-book me-1"></i>Buat Mata Kuliah
        </router-link>
        <button v-else class="btn btn-primary btn-sm" @click="showForm = true">
          <i class="bi bi-plus-lg me-1"></i>Buat Ujian
        </button>
      </div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-header bg-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="input-group input-group-sm" style="max-width: 260px">
          <span class="input-group-text bg-body"><i class="bi bi-search"></i></span>
          <input v-model="search" type="text" class="form-control" placeholder="Cari ujian…" />
        </div>
        <div class="d-flex align-items-center gap-2">
          <select v-model="statusFilter" class="form-select form-select-sm w-auto">
            <option value="">Semua status</option>
            <option value="draft">Draft</option>
            <option value="aktif">Aktif</option>
            <option value="selesai">Selesai</option>
          </select>
          <span class="badge text-bg-light border">{{ filtered.length }} ujian</span>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Judul</th>
              <th>Mata Kuliah</th>
              <th class="text-center">Soal</th>
              <th class="text-center">Durasi</th>
              <th>Kelas</th>
              <th class="text-center">Status</th>
              <th class="text-end">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="text-center text-secondary py-4">Tidak ada ujian yang cocok dengan filter.</td>
            </tr>
            <tr v-for="u in filtered" :key="u.id">
              <td class="fw-semibold">{{ u.judul }}</td>
              <td>{{ u.mata_kuliah_nama }}</td>
              <td class="text-center">{{ u.jumlah_soal }}</td>
              <td class="text-center">{{ u.durasi_menit }} mnt</td>
              <td>{{ u.kelas_target }}</td>
              <td class="text-center">
                <span class="badge" :class="statusBadge[u.status]">{{ u.status_display }}</span>
              </td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <router-link :to="{ name: 'ujian-detail', params: { id: u.id } }" class="btn btn-outline-primary" title="Kelola soal & aktivasi">
                    <i class="bi bi-gear"></i>
                  </router-link>
                  <router-link :to="{ name: 'ujian-monitor', params: { id: u.id } }" class="btn btn-outline-success" title="Monitor peserta">
                    <i class="bi bi-display"></i>
                  </router-link>
                  <router-link :to="{ name: 'ujian-laporan', params: { id: u.id } }" class="btn btn-outline-dark" title="Laporan nilai">
                    <i class="bi bi-bar-chart"></i>
                  </router-link>
                  <button class="btn btn-outline-danger" title="Hapus" @click="hapus(u)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
