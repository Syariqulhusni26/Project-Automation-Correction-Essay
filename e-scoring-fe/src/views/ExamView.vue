<template>
  <!--
    ExamView.vue
    Halaman utama ujian esai mahasiswa.
    - Mulai/resume sesi ujian
    - Timer + heartbeat
    - Proctoring (fullscreen, blur, tab)
    - Auto-save jawaban
    - Submit ujian
  -->
  <div class="exam-layout light-mode"
       @copy.prevent
       @paste.prevent
       @contextmenu.prevent>
    <!-- Loading awal -->
    <Loading v-if="loading" fullscreen message="Memuat soal ujian..." />

    <!-- Locked / Violation State -->
    <ViolationDialog :visible="isLocked" :violation="lastViolation" />

    <template v-if="!loading && examStore.ujian">
      <!-- ── Exam Header Bar ── -->
      <header class="exam-header">
        <div class="exam-header-left">
          <span class="exam-brand">
            <Zap class="icon-pulse" size="18" style="vertical-align: text-bottom; margin-right: 4px; color: var(--color-accent-400);" /> SAGE
          </span>
          <div class="exam-title-block">
            <h1 class="exam-title">{{ examStore.ujian?.judul }}</h1>
            <span class="text-muted text-xs">{{ examStore.ujian?.mata_pelajaran?.nama }}</span>
          </div>
        </div>

        <div class="exam-header-right">
          <Timer />
        </div>
      </header>

      <!-- ── Main Content ── -->
      <div class="exam-body">
        <!-- Panel Kiri: Navigator Soal -->
        <aside class="exam-sidebar">
          <QuestionNumber
            :soalList="examStore.soalList"
            :currentIndex="examStore.currentSoalIndex"
            :jawabanMap="examStore.jawabanMap"
            :answeredCount="examStore.answeredCount"
            @goto="examStore.goToSoal"
          />
        </aside>

        <!-- Area Soal -->
        <section class="exam-main">
          <QuestionCard
            v-if="examStore.currentSoal"
            :soal="examStore.currentSoal"
            :modelValue="examStore.jawabanMap[examStore.currentSoal.id] || ''"
            @answer-change="onAnswerChange"
          />

          <!-- Navigation Buttons -->
          <div class="exam-nav-btns">
            <button
              id="btn-prev-soal"
              class="btn btn-secondary icon-bounce"
              :disabled="examStore.currentSoalIndex === 0"
              @click="goToPrev"
            >
              <ChevronLeft size="16" /> Sebelumnya
            </button>

            <!-- Soal terakhir → tombol Selesai & Kumpulkan -->
            <button
              v-if="examStore.currentSoalIndex === examStore.totalSoal - 1"
              id="btn-finish-ujian"
              class="btn btn-finish icon-pulse"
              @click="confirmSubmit = true"
              :disabled="examStore.isSubmitting"
            >
              <CheckCircle size="16" /> Selesai &amp; Kumpulkan
            </button>

            <!-- Soal bukan terakhir → tombol Selanjutnya -->
            <button
              v-else
              id="btn-next-soal"
              class="btn btn-secondary icon-bounce"
              @click="goToNext"
            >
              Selanjutnya <ChevronRight size="16" />
            </button>
          </div>
        </section>
      </div>
    </template>

    <!-- ── Confirm Submit Dialog ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmSubmit" class="modal-overlay" @click.self="confirmSubmit = false">
          <div class="modal-content">
            <h2 class="text-xl font-bold" style="margin-bottom: 0.5rem;">Kumpulkan Ujian?</h2>
            <p class="text-muted text-sm">
              Anda telah menjawab
              <strong>{{ examStore.answeredCount }} dari {{ examStore.totalSoal }}</strong>
              soal. Jawaban yang belum diisi akan bernilai 0.
            </p>
            <div class="flex gap-4" style="margin-top: 1.5rem;">
              <button
                class="btn btn-secondary w-full"
                @click="confirmSubmit = false"
              >Batal</button>
              <button
                id="btn-confirm-submit"
                class="btn btn-primary w-full"
                @click="handleSubmit"
                :disabled="examStore.isSubmitting"
              >
                <span v-if="examStore.isSubmitting">Mengumpulkan...</span>
                <span v-else>Ya, Kumpulkan</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExamStore }  from '@/stores/exam'
import { useAuthStore }  from '@/stores/auth'
import { useTimerStore } from '@/stores/timer'
import { useProctoring } from '@/composables/useProctoring'
import Navbar            from '@/components/Navbar.vue'
import Loading           from '@/components/Loading.vue'
import Timer             from '@/components/Timer.vue'
import QuestionCard      from '@/components/QuestionCard.vue'
import QuestionNumber    from '@/components/QuestionNumber.vue'
import ViolationDialog   from '@/components/ViolationDialog.vue'
import { Zap, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-vue-next'

const route     = useRoute()
const router    = useRouter()
const examStore = useExamStore()
const authStore = useAuthStore()
const timerStore= useTimerStore()

const loading       = ref(true)
const isLocked      = ref(false)
const lastViolation = ref(null)
const confirmSubmit = ref(false)

// ── Proctoring ──────────────────────────────────────────────────────────
useProctoring(async ({ tipe, keterangan }) => {
  lastViolation.value = { tipe, keterangan }
  isLocked.value = true
  timerStore.stopTimer()
  
  // Jika pelanggaran terjadi, otomatis logout dan hapus local state.
  alert(`Pelanggaran terdeteksi: ${tipe}. Anda akan dikeluarkan dari ujian.`)
  examStore.$reset()
  await authStore.logout()
})

// ── Lifecycle ───────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const ujianId = Number(route.params.ujianId)
    const res = await examStore.startExam(ujianId)
    
    if (res?.isFinished) {
      router.replace({ name: 'Result', params: { sesiId: res.sesiId } })
      return
    }

    // Mulai timer dari sisa detik yang dikembalikan oleh backend
    timerStore.startTimer(res.sisaDetik, handleTimeUp)
  } catch (err) {
    console.error('Gagal memuat ujian:', err)
    router.push({ name: 'Dashboard' })
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  timerStore.stopTimer()
  examStore.$reset()
})

// ── Methods ─────────────────────────────────────────────────────────────
let saveDebounceMap = {}

function onAnswerChange(text) {
  const soalId = examStore.currentSoal?.id
  if (!soalId) return

  // Update store lokal dulu (reaktif langsung)
  examStore.jawabanMap[soalId] = text

  // Debounce 1.5 detik sebelum kirim ke server
  clearTimeout(saveDebounceMap[soalId])
  saveDebounceMap[soalId] = setTimeout(() => {
    examStore.saveJawaban(soalId, text)
  }, 1500)
}

// Navigasi ke soal berikut — flush-save dulu agar jawaban pasti terkirim
async function goToNext() {
  const soalId = examStore.currentSoal?.id
  if (soalId) {
    clearTimeout(saveDebounceMap[soalId])
    await examStore.saveJawaban(soalId, examStore.jawabanMap[soalId] || '')
  }
  examStore.nextSoal()
}

// Navigasi ke soal sebelumnya — flush-save dulu
async function goToPrev() {
  const soalId = examStore.currentSoal?.id
  if (soalId) {
    clearTimeout(saveDebounceMap[soalId])
    await examStore.saveJawaban(soalId, examStore.jawabanMap[soalId] || '')
  }
  examStore.prevSoal()
}

async function handleSubmit() {
  // Flush-save jawaban soal aktif sebelum submit
  const soalId = examStore.currentSoal?.id
  if (soalId) {
    clearTimeout(saveDebounceMap[soalId])
    await examStore.saveJawaban(soalId, examStore.jawabanMap[soalId] || '')
  }
  confirmSubmit.value = false
  await examStore.submitUjian()
  router.push({ name: 'Result', params: { sesiId: examStore.sesiId } })
}

function handleTimeUp() {
  // Otomatis submit saat waktu habis
  handleSubmit()
}
</script>

<style scoped>
.exam-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.exam-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(15, 15, 26, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-6);
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.exam-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.exam-brand {
  font-size: 1.1rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.exam-title-block {
  display: flex;
  flex-direction: column;
}

.exam-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.exam-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.exam-body {
  flex: 1;
  display: flex;
  gap: var(--space-6);
  padding: var(--space-6);
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

.exam-sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  align-self: flex-start;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.exam-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.exam-nav-btns {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.btn-finish {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 700;
  border: none;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
  transition: all var(--transition-normal);
}

.btn-finish:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(16, 185, 129, 0.55);
}

.btn-finish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
