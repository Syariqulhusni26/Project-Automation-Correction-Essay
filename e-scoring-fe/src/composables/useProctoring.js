/**
 * composables/useProctoring.js
 * Deteksi dan pelaporan pelanggaran ujian:
 *  - window blur (pindah aplikasi)
 *  - visibilitychange (tab baru / minimize)
 *  - fullscreen exit
 */
import { onMounted, onBeforeUnmount } from 'vue'
import { proctoringApi } from '@/services/api'
import { useExamStore } from '@/stores/exam'

/**
 * @param {Function} onViolation — callback saat pelanggaran terdeteksi, menerima { tipe, keterangan }
 */
export function useProctoring(onViolation) {
  const examStore = useExamStore()

  async function reportViolation(tipe, keterangan = '') {
    try {
      await proctoringApi.catatPelanggaran({
        sesi_id: examStore.sesiId,
        tipe,
        keterangan,
        user_agent: navigator.userAgent,
      })
    } catch (err) {
      console.error('[Proctoring] Gagal melaporkan pelanggaran:', err)
    }
    onViolation?.({ tipe, keterangan })
  }

  // Handler: pindah aplikasi / klik di luar window
  function handleBlur() {
    reportViolation('window_blur', 'Pengguna berpindah dari jendela ujian.')
  }

  // Handler: visibilitychange (buka tab baru / minimize)
  function handleVisibility() {
    if (document.visibilityState === 'hidden') {
      reportViolation('tab_baru', 'Tab ujian tidak lagi aktif.')
    }
  }

  // Handler: keluar fullscreen
  function handleFullscreenChange() {
    if (!document.fullscreenElement) {
      reportViolation('fullscreen_exit', 'Pengguna keluar dari mode layar penuh.')
    }
  }

  // Fungsi utilitas masuk fullscreen
  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen()
    } catch (err) {
      console.warn('[Proctoring] Tidak bisa masuk fullscreen:', err)
    }
  }

  onMounted(() => {
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    enterFullscreen()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('blur', handleBlur)
    document.removeEventListener('visibilitychange', handleVisibility)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    if (document.fullscreenElement) document.exitFullscreen()
  })

  return { enterFullscreen }
}
