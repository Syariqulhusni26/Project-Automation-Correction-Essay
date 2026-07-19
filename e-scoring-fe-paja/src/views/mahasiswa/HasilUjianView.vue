<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import client from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { cetakTranskrip } from '../../utils/cetakTranskrip'

const route = useRoute()
const auth = useAuthStore()
const sesiId = route.params.sesiId

const loading = ref(true)
const error = ref(null)
const hasil = ref(null)
let pollTimer = null

const persen = computed(() => {
  if (!hasil.value || hasil.value.total_nilai === null) return 0
  return Math.round((hasil.value.total_nilai / hasil.value.nilai_maksimal) * 100)
})

const nilaiBadge = (n) =>
  n === 10 ? 'text-bg-success' : n === 5 ? 'text-bg-warning' : 'text-bg-danger'

async function load() {
  try {
    const { data } = await client.get(`/submission/hasil/${sesiId}/`)
    hasil.value = data
    error.value = null
    if (data.semua_selesai_dinilai) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal memuat hasil.'
    clearInterval(pollTimer)
  } finally {
    loading.value = false
  }
}

function unduhPdf() {
  const ok = cetakTranskrip({
    hasil: hasil.value,
    mahasiswa: {
      nama: auth.user?.nama_lengkap || auth.user?.username,
      nim: auth.user?.nim,
      kelas: auth.user?.kelas,
    },
  })
  if (!ok) error.value = 'Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini.'
}

onMounted(() => {
  load()
  pollTimer = setInterval(load, 5000) // poll sampai AI selesai menilai
})
onBeforeUnmount(() => clearInterval(pollTimer))
</script>

<template>
  <div class="container py-4" style="max-width: 900px">
    <router-link :to="{ name: 'ujian-tersedia' }" class="btn-back mb-3">
      <i class="bi bi-arrow-left me-1"></i>Kembali ke daftar ujian
    </router-link>

    <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else-if="hasil">
      <!-- Status penilaian -->
      <div v-if="!hasil.semua_selesai_dinilai" class="alert alert-info d-flex align-items-center">
        <div class="spinner-border spinner-border-sm me-3"></div>
        <div>
          <strong>AI sedang menilai jawaban Anda…</strong><br />
          <span class="small">Halaman ini akan diperbarui otomatis. Anda juga boleh menutupnya dan kembali lagi nanti.</span>
        </div>
      </div>

      <!-- Ringkasan nilai -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4 text-center">
          <div class="text-secondary small mb-1">Total Nilai</div>
          <div v-if="hasil.total_nilai !== null" class="display-4 fw-bold"
               :class="persen >= 60 ? 'text-success' : 'text-danger'">
            {{ hasil.total_nilai }}<span class="fs-4 text-secondary">/{{ hasil.nilai_maksimal }}</span>
          </div>
          <div v-else class="display-6 text-secondary">Menunggu…</div>
          <div v-if="hasil.total_nilai !== null" class="progress mx-auto mt-3" style="max-width: 400px; height: 10px">
            <div class="progress-bar" :class="persen >= 60 ? 'bg-success' : 'bg-danger'" :style="{ width: persen + '%' }"></div>
          </div>
          <button
            v-if="hasil.semua_selesai_dinilai"
            class="btn btn-outline-danger btn-sm mt-3"
            @click="unduhPdf"
          >
            <i class="bi bi-file-earmark-pdf me-1"></i>Unduh Transkrip PDF
          </button>
        </div>
      </div>

      <!-- Skema penilaian AI -->
      <div class="d-flex flex-wrap justify-content-center gap-2 mb-4 small">
        <span class="badge text-bg-danger">0 — Tidak relevan</span>
        <span class="badge text-bg-warning">5 — Sebagian benar</span>
        <span class="badge text-bg-success">10 — Lengkap &amp; tepat</span>
      </div>

      <!-- Detail per soal -->
      <div v-for="j in hasil.jawaban" :key="j.nomor_soal" class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge text-bg-primary">Soal {{ j.nomor_soal }}</span>
            <span v-if="j.grading_status === 'done'" class="badge fs-6" :class="nilaiBadge(j.nilai)">
              {{ j.nilai }} / 10
            </span>
            <span v-else-if="j.grading_status === 'failed'" class="badge text-bg-danger">Gagal dinilai</span>
            <span v-else class="badge text-bg-secondary">
              <span class="spinner-border spinner-border-sm me-1" style="width: 10px; height: 10px"></span>Dinilai…
            </span>
          </div>
          <p class="fw-semibold mb-2" style="white-space: pre-wrap">{{ j.pertanyaan }}</p>
          <div class="bg-light rounded p-3 small mb-2" style="white-space: pre-wrap">{{ j.teks_jawaban || '(Tidak dijawab)' }}</div>
          <div v-if="j.alasan_nilai" class="small text-secondary">
            <i class="bi bi-robot me-1"></i><strong>Catatan AI:</strong> {{ j.alasan_nilai }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
