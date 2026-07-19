/**
 * stores/timer.js
 * Pinia store untuk countdown timer ujian.
 * Sinkronisasi sisa waktu via heartbeat response dari backend.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { proctoringApi } from '@/services/api'
import { useExamStore } from './exam'

export const useTimerStore = defineStore('timer', () => {
  // ─── State ───────────────────────────────────────────────────────────
  const remainingSeconds = ref(0)
  const intervalId       = ref(null)
  const heartbeatId      = ref(null)
  const isExpired        = ref(false)

  // ─── Getters ─────────────────────────────────────────────────────────
  const formattedTime = computed(() => {
    const total = remainingSeconds.value
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  const isWarning = computed(() => remainingSeconds.value > 0 && remainingSeconds.value <= 300) // 5 menit

  // ─── Actions ─────────────────────────────────────────────────────────

  /**
   * Mulai timer dengan durasi dalam detik
   */
  function startTimer(durationSeconds, onExpire) {
    remainingSeconds.value = durationSeconds
    isExpired.value = false

    // Countdown setiap detik
    intervalId.value = setInterval(() => {
      if (remainingSeconds.value <= 0) {
        isExpired.value = true
        stopTimer()
        onExpire?.()
      } else {
        remainingSeconds.value--
      }
    }, 1000)

    // Heartbeat ke backend setiap 15 detik
    heartbeatId.value = setInterval(async () => {
      try {
        const examStore = useExamStore()
        if (!examStore.sesiId) return
        const { data } = await proctoringApi.heartbeat({ sesi_id: examStore.sesiId })
        // Sinkronisasi sisa waktu dari server (lebih akurat)
        if (data.sisa_waktu_detik !== undefined) {
          remainingSeconds.value = data.sisa_waktu_detik
        }
      } catch (err) {
        console.warn('[Timer] Heartbeat gagal:', err)
      }
    }, 15000)
  }

  /**
   * Sinkronkan sisa waktu dari server secara manual
   */
  function syncTime(seconds) {
    remainingSeconds.value = seconds
  }

  /**
   * Stop semua interval
   */
  function stopTimer() {
    if (intervalId.value)    clearInterval(intervalId.value)
    if (heartbeatId.value)   clearInterval(heartbeatId.value)
    intervalId.value  = null
    heartbeatId.value = null
  }

  function $reset() {
    stopTimer()
    remainingSeconds.value = 0
    isExpired.value = false
  }

  return {
    remainingSeconds, isExpired,
    formattedTime, isWarning,
    startTimer, stopTimer, syncTime, $reset,
  }
})
