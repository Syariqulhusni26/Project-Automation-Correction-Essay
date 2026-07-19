/**
 * stores/exam.js
 * Pinia store untuk sesi ujian mahasiswa.
 * Mengelola: data sesi, jawaban per soal, status submit, dan polling hasil.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { submissionApi } from '@/services/api'

export const useExamStore = defineStore('exam', () => {
  // ─── State ───────────────────────────────────────────────────────────
  const sesi         = ref(null)   // SesiUjian object dari backend
  const ujian        = ref(null)   // Ujian detail (judul, durasi, soal list)
  const soalList     = ref([])     // Array Soal
  const jawabanMap   = ref({})     // { [soalId]: teks_jawaban }
  const currentSoalIndex = ref(0)  // Indeks soal yang sedang aktif
  const isSubmitting = ref(false)
  const hasilUjian   = ref(null)   // Data hasil setelah submit & grading selesai
  const durasi_menit = ref(null)   // Durasi ujian yang ditetapkan admin (menit)

  // ─── Getters ─────────────────────────────────────────────────────────
  const currentSoal    = computed(() => soalList.value[currentSoalIndex.value] || null)
  const totalSoal      = computed(() => soalList.value.length)
  const sesiId         = computed(() => sesi.value?.id || null)
  const isExamActive   = computed(() => sesi.value?.status === 'berlangsung')
  const answeredCount  = computed(() =>
    Object.values(jawabanMap.value).filter(v => v && v.trim().length > 0).length
  )

  // ─── Actions ─────────────────────────────────────────────────────────

  /**
   * Mulai / lanjutkan sesi ujian
   * @param {number} ujianId
   */
  async function startExam(ujianId) {
    // 1. Mulai ujian untuk mendapatkan ID Sesi
    const { data: mulaiData } = await submissionApi.mulaiUjian(ujianId)
    const sessionId = mulaiData.sesi_id

    if (mulaiData.selesai) {
      sesi.value = { id: sessionId }
      return { isFinished: true, sesiId: sessionId }
    }

    // 2. Ambil detail sesi ujian
    const { data: sesiData } = await submissionApi.getSesiDetail(sessionId)

    sesi.value = sesiData
    ujian.value = {
      id: sesiData.ujian,
      judul: sesiData.ujian_judul,
    }

    // 3. Ekstrak Soal dan Jawaban dari sesiData.jawaban
    const arrSoal = []
    const mapJawaban = {}

    if (sesiData.jawaban) {
      sesiData.jawaban.forEach(j => {
        arrSoal.push({
          id: j.soal,
          nomor_urut: j.soal_nomor,
          pertanyaan: j.soal_pertanyaan
        })
        mapJawaban[j.soal] = j.teks_jawaban || ''
      })
    }

    // Urutkan soal berdasarkan nomor urut
    arrSoal.sort((a, b) => a.nomor_urut - b.nomor_urut)

    soalList.value = arrSoal
    jawabanMap.value = mapJawaban

    // Kembalikan sisa_detik agar bisa digunakan oleh Timer di komponen View
    return { isFinished: false, sisaDetik: mulaiData.sisa_detik }
  }

  /**
   * Auto-save jawaban satu soal ke backend
   * @param {number} soalId
   * @param {string} teks
   */
  async function saveJawaban(soalId, teks) {
    jawabanMap.value[soalId] = teks
    try {
      await submissionApi.saveJawaban({
        sesi_pk: sesi.value.id,  // backend menggunakan key 'sesi_pk'
        soal_id: soalId,
        teks_jawaban: teks,
      })
    } catch (err) {
      // Gagal simpan tidak perlu menghentikan flow ujian
      console.warn('[ExamStore] saveJawaban gagal:', err?.response?.data || err.message)
    }
  }

  /**
   * Submit ujian → trigger AI grading
   */
  async function submitUjian() {
    if (!sesiId.value) return
    isSubmitting.value = true
    try {
      await submissionApi.submitUjian(sesiId.value)
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Polling hasil ujian sampai grading selesai
   */
  async function pollHasil() {
    if (!sesiId.value) return
    const { data } = await submissionApi.getHasil(sesiId.value)
    hasilUjian.value = data
    return data
  }

  /**
   * Navigasi soal
   */
  function goToSoal(index) {
    if (index >= 0 && index < totalSoal.value) {
      currentSoalIndex.value = index
    }
  }

  function nextSoal() { goToSoal(currentSoalIndex.value + 1) }
  function prevSoal() { goToSoal(currentSoalIndex.value - 1) }

  /**
   * Reset store (saat keluar dari halaman ujian)
   */
  function $reset() {
    sesi.value = null
    ujian.value = null
    soalList.value = []
    jawabanMap.value = {}
    currentSoalIndex.value = 0
    isSubmitting.value = false
    hasilUjian.value = null
    durasi_menit.value = null
  }

  return {
    sesi, ujian, soalList, jawabanMap, currentSoalIndex,
    isSubmitting, hasilUjian, durasi_menit,
    currentSoal, totalSoal, sesiId, isExamActive, answeredCount,
    startExam, saveJawaban, submitUjian, pollHasil,
    goToSoal, nextSoal, prevSoal, $reset,
  }
})
