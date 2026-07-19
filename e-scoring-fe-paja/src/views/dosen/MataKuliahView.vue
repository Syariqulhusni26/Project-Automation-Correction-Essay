<script setup>
import { ref, computed, onMounted } from 'vue'
import client, { fetchAll } from '../../api/client'

const loading = ref(true)
const list = ref([])
const error = ref(null)
const notif = ref(null)
const search = ref('')

const showModal = ref(false)
const saving = ref(false)
const form = ref({ nama: '', kode: '' })

// Ringkasan per mata kuliah (jumlah ujian + kelas yang pernah dituju), diturunkan
// dari data Ujian yang sudah ada — MataPelajaran sendiri tidak punya field kelas.
const ringkasan = ref({})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return list.value
  return list.value.filter(
    (mk) => mk.nama.toLowerCase().includes(q) || mk.kode.toLowerCase().includes(q)
  )
})

async function load() {
  loading.value = true
  try {
    const [mkList, ujianList] = await Promise.all([
      fetchAll('/ujian/mata-kuliah/'),
      fetchAll('/ujian/'),
    ])
    list.value = mkList

    const map = {}
    for (const u of ujianList) {
      if (!map[u.mata_pelajaran]) map[u.mata_pelajaran] = { jumlahUjian: 0, kelasSet: new Set() }
      map[u.mata_pelajaran].jumlahUjian += 1
      for (const k of u.kelas_target.split(',').map((s) => s.trim()).filter(Boolean)) {
        map[u.mata_pelajaran].kelasSet.add(k)
      }
    }
    ringkasan.value = map
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat data.'
  } finally {
    loading.value = false
  }
}

function jumlahUjian(mkId) {
  return ringkasan.value[mkId]?.jumlahUjian || 0
}
function kelasList(mkId) {
  return [...(ringkasan.value[mkId]?.kelasSet || [])]
}

function bukaModal() {
  form.value = { nama: '', kode: '' }
  showModal.value = true
}

async function tambah() {
  saving.value = true
  error.value = null
  try {
    await client.post('/ujian/mata-kuliah/', form.value)
    notif.value = `Mata kuliah "${form.value.nama}" berhasil ditambahkan.`
    showModal.value = false
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Gagal menyimpan.'
    showModal.value = false
  } finally {
    saving.value = false
  }
}

async function hapus(mk) {
  if (!confirm(`Hapus mata kuliah "${mk.nama}"? Semua ujian di dalamnya ikut terhapus.`)) return
  try {
    await client.delete(`/ujian/mata-kuliah/${mk.id}/`)
    notif.value = `Mata kuliah "${mk.nama}" dihapus.`
    await load()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal menghapus.'
  }
}

onMounted(load)
</script>

<template>
  <div class="container py-4">
    <!-- Header halaman ala PLN: judul + subjudul kiri, aksi kanan -->
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h2 class="h4 fw-bold mb-0">Mata Kuliah</h2>
        <p class="text-secondary small mb-0">Kelola mata kuliah yang Anda ampu</p>
      </div>
      <button class="btn btn-primary" @click="bukaModal">
        <i class="bi bi-plus-lg me-1"></i>Tambah Mata Kuliah
      </button>
    </div>

    <!-- Bar pencarian -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body py-2">
        <div class="input-group input-group-sm border-0">
          <span class="input-group-text bg-transparent border-0"><i class="bi bi-search"></i></span>
          <input
            v-model="search"
            type="text"
            class="form-control border-0 shadow-none"
            placeholder="Cari mata kuliah…"
          />
        </div>
      </div>
    </div>

    <div v-if="notif" class="alert alert-success alert-dismissible">
      {{ notif }}<button type="button" class="btn-close" @click="notif = null"></button>
    </div>
    <div v-if="error" class="alert alert-danger alert-dismissible">
      {{ error }}<button type="button" class="btn-close" @click="error = null"></button>
    </div>

    <!-- Tabel -->
    <div class="card border-0 shadow-sm">
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

      <!-- Belum ada data sama sekali -->
      <div v-else-if="list.length === 0" class="card-body text-center py-5">
        <div class="empty-icon mx-auto mb-3"><i class="bi bi-book"></i></div>
        <p class="text-secondary mb-1">Anda belum memiliki mata kuliah.</p>
        <p class="small text-secondary mb-3">Tambahkan mata kuliah yang Anda ampu untuk mulai membuat ujian.</p>
        <button class="btn btn-primary btn-sm" @click="bukaModal">
          <i class="bi bi-plus-lg me-1"></i>Tambah Mata Kuliah
        </button>
      </div>

      <template v-else>
        <div class="card-header bg-body fw-semibold d-flex justify-content-between align-items-center">
          <span>Daftar Mata Kuliah</span>
          <span class="badge text-bg-light border">{{ filtered.length }} mata kuliah</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 120px">Kode</th>
                <th>Nama Mata Kuliah</th>
                <th>Kelas</th>
                <th class="text-center" style="width: 90px">Ujian</th>
                <th class="text-end" style="width: 110px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered.length === 0">
                <td colspan="5" class="text-center text-secondary py-4">
                  Tidak ada mata kuliah yang cocok dengan pencarian "{{ search }}".
                </td>
              </tr>
              <tr v-for="mk in filtered" :key="mk.id">
                <td><span class="badge text-bg-primary">{{ mk.kode }}</span></td>
                <td class="fw-semibold">{{ mk.nama }}</td>
                <td>
                  <span v-if="kelasList(mk.id).length === 0" class="text-secondary small">—</span>
                  <span v-for="k in kelasList(mk.id)" :key="k" class="badge text-bg-light border me-1">{{ k }}</span>
                </td>
                <td class="text-center">
                  <router-link
                    :to="{ name: 'ujian-list', query: { cari: mk.nama } }"
                    class="badge text-bg-light border text-decoration-none"
                  >
                    {{ jumlahUjian(mk.id) }}
                  </router-link>
                </td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <router-link
                      :to="{ name: 'ujian-list', query: { cari: mk.nama } }"
                      class="btn btn-outline-primary"
                      title="Lihat ujian mata kuliah ini"
                    >
                      <i class="bi bi-journal-text"></i>
                    </router-link>
                    <button class="btn btn-outline-danger" title="Hapus" @click="hapus(mk)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Modal tambah (ala form dialog PLN) -->
    <Teleport to="body">
      <div v-if="showModal" class="modal fade show d-block" tabindex="-1" @click.self="showModal = false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <form @submit.prevent="tambah">
              <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold">Tambah Mata Kuliah</h5>
                <button type="button" class="btn-close" @click="showModal = false"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Kode Mata Kuliah <span class="text-danger">*</span></label>
                  <input v-model="form.kode" type="text" class="form-control" placeholder="cth: IF301" required autofocus />
                </div>
                <div class="mb-1">
                  <label class="form-label small fw-semibold">Nama Mata Kuliah <span class="text-danger">*</span></label>
                  <input v-model="form.nama" type="text" class="form-control" placeholder="cth: Pemrograman Berorientasi Objek" required />
                </div>
              </div>
              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-outline-secondary" @click="showModal = false">Batal</button>
                <button type="submit" class="btn btn-primary px-4" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div v-if="showModal" class="modal-backdrop fade show"></div>
    </Teleport>
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
