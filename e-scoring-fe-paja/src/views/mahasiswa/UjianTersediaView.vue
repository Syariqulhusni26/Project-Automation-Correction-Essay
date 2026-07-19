<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import client, { fetchAll } from '../../api/client'

const router = useRouter()
const loading = ref(true)
const error = ref(null)
const ujianList = ref([])

async function load() {
  try {
    ujianList.value = await fetchAll('/ujian/tersedia/')
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat daftar ujian.'
  } finally {
    loading.value = false
  }
}

function kerjakan(ujian) {
  router.push({ name: 'kerjakan-ujian', params: { id: ujian.id } })
}

async function lihatHasil(ujian) {
  // Sesi id didapat dari endpoint mulai (sesi sudah ada → mengembalikan sesi_id yang sama)
  try {
    const { data } = await client.post(`/submission/mulai/${ujian.id}/`)
    router.push({ name: 'hasil-ujian', params: { sesiId: data.sesi_id } })
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal membuka hasil.'
  }
}

onMounted(load)
</script>

<template>
  <div class="container py-4">
    <p class="text-secondary small mb-4">
      <i class="bi bi-info-circle me-1"></i>Ujian aktif untuk kelas Anda. Pastikan koneksi stabil sebelum memulai.
    </p>

    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="ujianList.length === 0" class="text-center py-5 text-secondary">
      <i class="bi bi-inbox fs-1 d-block mb-2"></i>
      Belum ada ujian aktif untuk kelas Anda.
    </div>

    <div v-else class="row g-3">
      <div v-for="u in ujianList" :key="u.id" class="col-md-6 col-lg-4">
        <div class="card card-hover h-100 shadow-sm border-0">
          <div class="card-body d-flex flex-column">
            <h2 class="h6 fw-bold mb-1">{{ u.judul }}</h2>
            <div class="text-secondary small mb-3">{{ u.mata_pelajaran }}</div>

            <ul class="list-unstyled small text-secondary mb-3">
              <li><i class="bi bi-clock me-2"></i>{{ u.durasi_menit }} menit</li>
              <li><i class="bi bi-list-ol me-2"></i>{{ u.jumlah_soal }} soal (nilai maks. {{ u.nilai_maksimal }})</li>
              <li v-if="u.tanggal_ujian"><i class="bi bi-calendar-event me-2"></i>{{ u.tanggal_ujian }}</li>
            </ul>

            <div class="mt-auto">
              <button
                v-if="!u.status_sesi"
                class="btn btn-primary w-100"
                @click="kerjakan(u)"
              >
                <i class="bi bi-pencil-square me-1"></i>Mulai Kerjakan
              </button>
              <button
                v-else-if="u.status_sesi === 'berlangsung'"
                class="btn btn-warning w-100"
                @click="kerjakan(u)"
              >
                <i class="bi bi-arrow-repeat me-1"></i>Lanjutkan Pengerjaan
              </button>
              <button
                v-else-if="u.status_sesi === 'selesai'"
                class="btn btn-outline-success w-100"
                @click="lihatHasil(u)"
              >
                <i class="bi bi-check-circle me-1"></i>Lihat Hasil
              </button>
              <button v-else class="btn btn-outline-danger w-100" disabled>
                <i class="bi bi-x-circle me-1"></i>Dihentikan (Pelanggaran)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
