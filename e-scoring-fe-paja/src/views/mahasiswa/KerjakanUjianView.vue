<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import client from '../../api/client'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ujianId = route.params.id

const phase = ref('persiapan') // persiapan | loading | mengerjakan | submitting | pelanggaran
const error = ref(null)
const sesiId = ref(null)
const sesi = ref(null)
const soalList = ref([])       // dari sesi.jawaban: {soal, soal_nomor, soal_pertanyaan}
const jawabanMap = ref({})     // soal_id -> teks
const savedMap = ref({})       // soal_id -> teks terakhir yang tersimpan di server
const currentIdx = ref(0)
const sisaDetik = ref(0)
const saveStatus = ref('')     // '', 'menyimpan', 'tersimpan', 'gagal'
const pelanggaranInfo = ref(null)

// Proctoring bertingkat: 2 pelanggaran pertama = peringatan, ke-3 = sesi dihentikan;
// hitungannya di sessionStorage agar reload halaman tidak me-reset
const MAX_PERINGATAN = 2
const peringatan = ref(null)   // { ke, keterangan } saat overlay peringatan tampil
const showSubmitConfirm = ref(false)

let timerInterval = null
let heartbeatInterval = null
let autosaveInterval = null
let proctoringAktif = false

const timerText = computed(() => {
  const s = Math.max(0, sisaDetik.value)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const d = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${d}`
})
const timerWarning = computed(() => sisaDetik.value <= 300) // 5 menit terakhir

const soalAktif = computed(() => soalList.value[currentIdx.value])
const jumlahTerisi = computed(
  () => soalList.value.filter((s) => (jawabanMap.value[s.soal] || '').trim() !== '').length
)

async function mulai() {
  // Fullscreen diminta selagi masih dalam gesture klik; ditolak = ujian tidak dimulai
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    error.value =
      'Browser menolak mode layar penuh. Izinkan mode layar penuh lalu tekan tombol mulai lagi.'
    return
  }

  phase.value = 'loading'
  try {
    const { data } = await client.post(`/submission/mulai/${ujianId}/`)
    if (data.selesai) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      router.replace({ name: 'hasil-ujian', params: { sesiId: data.sesi_id } })
      return
    }
    sesiId.value = data.sesi_id
    sisaDetik.value = data.sisa_detik

    const detail = await client.get(`/submission/sesi/${sesiId.value}/`)
    sesi.value = detail.data
    sisaDetik.value = detail.data.sisa_detik
    soalList.value = [...detail.data.jawaban].sort((a, b) => a.soal_nomor - b.soal_nomor)
    for (const j of soalList.value) {
      jawabanMap.value[j.soal] = j.teks_jawaban || ''
      savedMap.value[j.soal] = j.teks_jawaban || ''
    }

    phase.value = 'mengerjakan'
    mulaiTimerDanProctoring()
  } catch (err) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    if (err.response?.data?.locked) {
      phase.value = 'pelanggaran'
      pelanggaranInfo.value = err.response.data.detail
    } else {
      error.value = err.response?.data?.detail || 'Gagal memulai ujian.'
      phase.value = 'persiapan'
    }
  }
}

function pasangListenerProctoring() {
  proctoringAktif = true
  window.addEventListener('blur', onBlur)
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.addEventListener('fullscreenchange', onFullscreenChange)
}

function lepasListenerProctoring() {
  proctoringAktif = false
  window.removeEventListener('blur', onBlur)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
}

function mulaiTimerDanProctoring() {
  timerInterval = setInterval(() => {
    sisaDetik.value -= 1
    if (sisaDetik.value <= 0) {
      submitUjian() // waktu habis → auto submit
    }
  }, 1000)

  heartbeatInterval = setInterval(kirimHeartbeat, 15000)
  autosaveInterval = setInterval(() => saveJawaban(soalAktif.value?.soal), 20000)

  pasangListenerProctoring()
  window.addEventListener('beforeunload', onBeforeUnload)
}

function hentikanSemua() {
  clearInterval(timerInterval)
  clearInterval(heartbeatInterval)
  clearInterval(autosaveInterval)
  lepasListenerProctoring()
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

async function kirimHeartbeat() {
  try {
    const { data } = await client.post('/proctoring/heartbeat/', { sesi_pk: sesiId.value })
    if (data.status === 'ok') {
      sisaDetik.value = data.sisa_detik // sinkron dengan server
    } else if (data.status === 'sesi_berakhir') {
      hentikanSemua()
      router.replace({ name: 'hasil-ujian', params: { sesiId: sesiId.value } })
    }
  } catch {
    // koneksi sesaat terputus — biarkan, heartbeat berikutnya mencoba lagi
  }
}

let debounceTimer = null
function onKetik() {
  saveStatus.value = ''
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => saveJawaban(soalAktif.value?.soal), 2000)
}

async function saveJawaban(soalId) {
  if (!soalId || phase.value !== 'mengerjakan') return
  const teks = jawabanMap.value[soalId] ?? ''
  if (teks === savedMap.value[soalId]) return // tidak ada perubahan
  saveStatus.value = 'menyimpan'
  try {
    await client.post('/submission/save-jawaban/', {
      sesi_pk: sesiId.value,
      soal_id: soalId,
      teks_jawaban: teks,
    })
    savedMap.value[soalId] = teks
    saveStatus.value = 'tersimpan'
  } catch (err) {
    if (err.response?.data?.timeout) {
      submitUjian()
    } else {
      saveStatus.value = 'gagal'
    }
  }
}

function pindahSoal(idx) {
  saveJawaban(soalAktif.value?.soal) // simpan soal saat ini sebelum pindah
  currentIdx.value = idx
}

function onBlur() {
  laporkanPelanggaran('window_blur', 'Jendela ujian kehilangan fokus (pindah aplikasi).')
}
function onVisibilityChange() {
  if (document.hidden) {
    laporkanPelanggaran('tab_baru', 'Tab ujian disembunyikan (membuka tab lain).')
  }
}
function onFullscreenChange() {
  if (!document.fullscreenElement) {
    laporkanPelanggaran('fullscreen_exit', 'Keluar dari mode layar penuh.')
  }
}
function onBeforeUnload(e) {
  e.preventDefault()
  e.returnValue = ''
}
// Paste/drop dari luar = pelanggaran (teks tetap tidak masuk karena event di-prevent)
function onPasteAttempt() {
  laporkanPelanggaran('copy_paste', 'Mencoba menempelkan (paste) teks dari luar ke kolom jawaban.')
}

function jumlahPelanggaran() {
  return Number(sessionStorage.getItem(`aes_warn_${sesiId.value}`) || 0)
}

async function laporkanPelanggaran(tipe, keterangan) {
  if (!proctoringAktif) return
  // Lepas listener dulu agar satu kejadian (blur + visibilitychange) tidak dihitung ganda
  lepasListenerProctoring()

  const ke = jumlahPelanggaran() + 1
  sessionStorage.setItem(`aes_warn_${sesiId.value}`, String(ke))

  if (ke <= MAX_PERINGATAN) {
    // Masih dapat peringatan — timer, heartbeat, dan autosave tetap berjalan
    peringatan.value = { ke, keterangan }
    return
  }

  hentikanSemua()
  try {
    const { data } = await client.post('/proctoring/pelanggaran/', {
      sesi_pk: sesiId.value,
      tipe,
      keterangan,
    })
    pelanggaranInfo.value = data.detail
  } catch {
    pelanggaranInfo.value = 'Sesi Anda dihentikan karena pelanggaran. Akun dikunci.'
  }
  phase.value = 'pelanggaran'
}

async function lanjutkanSetelahPeringatan() {
  peringatan.value = null
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // gesture klik seharusnya cukup; kalau tetap ditolak, deteksi lain masih aktif
  }
  pasangListenerProctoring()
}

async function keluarSetelahPelanggaran() {
  await auth.logout()
  router.replace({ name: 'login' })
}

// Modal in-page, bukan confirm() — dialog native bisa memicu blur = pelanggaran palsu
function mintaSubmit() {
  saveJawaban(soalAktif.value?.soal)
  showSubmitConfirm.value = true
}

async function submitUjian() {
  if (phase.value === 'submitting') return
  showSubmitConfirm.value = false

  phase.value = 'submitting'
  hentikanSemua()
  try {
    await saveJawaban(soalAktif.value?.soal)
    await client.post(`/submission/submit/${sesiId.value}/`)
    router.replace({ name: 'hasil-ujian', params: { sesiId: sesiId.value } })
  } catch (err) {
    error.value = err.response?.data?.detail || 'Gagal submit. Coba lagi.'
    phase.value = 'mengerjakan'
    mulaiTimerDanProctoring()
  }
}

onBeforeUnmount(hentikanSemua)
onMounted(() => {})
</script>

<template>
  <!-- Fase persiapan -->
  <div v-if="phase === 'persiapan'" class="d-flex align-items-center justify-content-center min-vh-100 bg-light">
    <div class="card border-0 shadow-lg" style="max-width: 560px">
      <div class="card-body p-4 p-md-5">
        <h1 class="h4 fw-bold mb-3"><i class="bi bi-shield-lock me-2 text-primary"></i>Aturan Ujian</h1>
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
        <div class="alert alert-warning small">
          <strong>PENTING — hal berikut terdeteksi sebagai pelanggaran:</strong>
          <ul class="mb-2 mt-2">
            <li>Berpindah tab atau membuka aplikasi lain.</li>
            <li>Keluar dari mode layar penuh.</li>
            <li>Menempelkan (paste) jawaban dari luar ujian.</li>
            <li>Menutup jendela browser sebelum submit.</li>
          </ul>
          <strong>Pelanggaran ke-1 dan ke-2 mendapat peringatan. Pelanggaran ke-3 menghentikan ujian dan mengunci akun Anda.</strong>
        </div>
        <ul class="small text-secondary">
          <li>Ujian berjalan dalam mode layar penuh.</li>
          <li>Jawaban tersimpan otomatis secara berkala.</li>
          <li>Jika waktu habis, jawaban tersubmit otomatis.</li>
          <li>Jika koneksi/laptop mati, login kembali untuk melanjutkan — waktu tetap berjalan.</li>
        </ul>
        <div class="d-grid gap-2 mt-4">
          <button class="btn btn-primary btn-lg" @click="mulai">
            <i class="bi bi-play-fill me-1"></i>Saya Mengerti, Mulai Ujian
          </button>
          <router-link :to="{ name: 'ujian-tersedia' }" class="btn btn-outline-secondary">Kembali</router-link>
        </div>
      </div>
    </div>
  </div>

  <!-- Fase loading -->
  <div v-else-if="phase === 'loading'" class="d-flex align-items-center justify-content-center min-vh-100">
    <div class="text-center">
      <div class="spinner-border text-primary mb-3"></div>
      <div class="text-secondary">Menyiapkan sesi ujian…</div>
    </div>
  </div>

  <!-- Fase pelanggaran -->
  <div v-else-if="phase === 'pelanggaran'" class="d-flex align-items-center justify-content-center min-vh-100 bg-danger bg-opacity-10">
    <div class="card border-danger shadow-lg" style="max-width: 480px">
      <div class="card-body p-4 text-center">
        <i class="bi bi-x-octagon-fill text-danger" style="font-size: 3rem"></i>
        <h1 class="h5 fw-bold mt-3 text-danger">Ujian Dihentikan</h1>
        <p class="text-secondary">{{ pelanggaranInfo }}</p>
        <p class="small text-secondary">Hubungi dosen Anda untuk membuka kunci akun.</p>
        <button class="btn btn-danger w-100" @click="keluarSetelahPelanggaran">Keluar</button>
      </div>
    </div>
  </div>

  <!-- Fase mengerjakan / submitting (klik kanan dimatikan selama ujian) -->
  <div v-else class="min-vh-100 bg-light d-flex flex-column" @contextmenu.prevent>
    <!-- Header ujian -->
    <div class="bg-body border-bottom shadow-sm sticky-top">
      <div class="container py-2 d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">{{ sesi?.ujian_judul }}</div>
          <div class="small text-secondary">
            {{ auth.user?.nama_lengkap }} ({{ auth.user?.nim }})
            <span class="ms-2" :class="{
              'text-success': saveStatus === 'tersimpan',
              'text-warning': saveStatus === 'menyimpan',
              'text-danger': saveStatus === 'gagal',
            }">
              <template v-if="saveStatus === 'menyimpan'"><i class="bi bi-arrow-repeat"></i> menyimpan…</template>
              <template v-else-if="saveStatus === 'tersimpan'"><i class="bi bi-check2"></i> tersimpan</template>
              <template v-else-if="saveStatus === 'gagal'"><i class="bi bi-wifi-off"></i> gagal menyimpan</template>
            </span>
          </div>
        </div>
        <div class="text-end">
          <div class="fs-4 fw-bold font-monospace" :class="timerWarning ? 'text-danger' : 'text-primary'">
            <i class="bi bi-stopwatch me-1"></i>{{ timerText }}
          </div>
          <div class="small text-secondary">{{ jumlahTerisi }}/{{ soalList.length }} terisi</div>
        </div>
      </div>
    </div>

    <div class="container py-4 flex-grow-1">
      <div class="row g-4">
        <!-- Navigasi soal -->
        <div class="col-md-3 col-lg-2">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="small fw-semibold mb-2">Navigasi Soal</div>
              <div class="d-flex flex-wrap gap-2">
                <button
                  v-for="(s, idx) in soalList"
                  :key="s.soal"
                  class="btn btn-sm nav-soal"
                  :class="idx === currentIdx
                    ? 'btn-primary'
                    : (jawabanMap[s.soal] || '').trim() !== '' ? 'btn-success' : 'btn-outline-secondary'"
                  @click="pindahSoal(idx)"
                >{{ s.soal_nomor }}</button>
              </div>
              <hr />
              <button class="btn btn-danger w-100 btn-sm" :disabled="phase === 'submitting'" @click="mintaSubmit">
                <span v-if="phase === 'submitting'" class="spinner-border spinner-border-sm me-1"></span>
                <i class="bi bi-send me-1"></i>Submit Ujian
              </button>
            </div>
          </div>
        </div>

        <!-- Soal aktif -->
        <div class="col-md-9 col-lg-10">
          <div v-if="soalAktif" class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge text-bg-primary fs-6">Soal {{ soalAktif.soal_nomor }}</span>
                <span v-if="soalAktif.soal_bobot" class="small text-secondary">Bobot: {{ soalAktif.soal_bobot }} poin</span>
              </div>
              <p class="fs-5 mb-4" style="white-space: pre-wrap">{{ soalAktif.soal_pertanyaan }}</p>

              <label class="form-label small fw-semibold">Jawaban Anda</label>
              <!-- Paste/drop/copy/cut diblokir agar jawaban yang disiapkan sebelum ujian tidak bisa ditempel -->
              <textarea
                v-model="jawabanMap[soalAktif.soal]"
                class="form-control"
                rows="10"
                placeholder="Ketik jawaban esai Anda di sini…"
                @input="onKetik"
                @blur="saveJawaban(soalAktif.soal)"
                @paste.prevent="onPasteAttempt"
                @drop.prevent="onPasteAttempt"
                @copy.prevent
                @cut.prevent
              ></textarea>
              <div class="form-text"><i class="bi bi-slash-circle me-1"></i>Copy-paste dinonaktifkan — menempel teks dari luar terhitung pelanggaran.</div>

              <div class="d-flex justify-content-between mt-3">
                <button
                  class="btn btn-outline-secondary"
                  :disabled="currentIdx === 0"
                  @click="pindahSoal(currentIdx - 1)"
                >
                  <i class="bi bi-chevron-left me-1"></i>Sebelumnya
                </button>
                <button
                  class="btn btn-outline-primary"
                  :disabled="currentIdx === soalList.length - 1"
                  @click="pindahSoal(currentIdx + 1)"
                >
                  Berikutnya<i class="bi bi-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay peringatan pelanggaran (timer tetap berjalan) -->
    <div v-if="peringatan" class="overlay-backdrop">
      <div class="card border-warning shadow-lg" style="max-width: 480px">
        <div class="card-body p-4 text-center">
          <i class="bi bi-exclamation-triangle-fill text-warning" style="font-size: 3rem"></i>
          <h2 class="h5 fw-bold mt-3">Peringatan {{ peringatan.ke }} dari {{ MAX_PERINGATAN }}</h2>
          <p class="text-secondary mb-1">{{ peringatan.keterangan }}</p>
          <p class="small fw-semibold text-danger">
            {{ peringatan.ke >= MAX_PERINGATAN
              ? 'Pelanggaran berikutnya menghentikan ujian dan mengunci akun Anda!'
              : 'Waktu ujian tetap berjalan. Jangan ulangi pelanggaran.' }}
          </p>
          <button class="btn btn-warning w-100 fw-semibold" @click="lanjutkanSetelahPeringatan">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Kembali ke Ujian (Layar Penuh)
          </button>
        </div>
      </div>
    </div>

    <!-- Modal konfirmasi submit (pengganti confirm() native) -->
    <div v-if="showSubmitConfirm" class="overlay-backdrop">
      <div class="card shadow-lg" style="max-width: 440px">
        <div class="card-body p-4 text-center">
          <i class="bi bi-send-check text-primary" style="font-size: 3rem"></i>
          <h2 class="h5 fw-bold mt-3">Submit Ujian?</h2>
          <p class="text-secondary">
            Anda sudah mengisi <strong>{{ jumlahTerisi }} dari {{ soalList.length }}</strong> soal.
            Setelah submit, jawaban tidak bisa diubah lagi.
          </p>
          <div class="d-grid gap-2">
            <button class="btn btn-danger fw-semibold" @click="submitUjian">
              <i class="bi bi-send me-1"></i>Ya, Submit Sekarang
            </button>
            <button class="btn btn-outline-secondary" @click="showSubmitConfirm = false">Kembali Mengerjakan</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-soal {
  width: 38px;
  height: 38px;
}

.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1050;
}
</style>
