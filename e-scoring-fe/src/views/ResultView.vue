<template>
  <!--
    ResultView.vue
    Halaman hasil ujian setelah submit.
    Polling hasil grading sampai AI selesai menilai.
  -->
  <div class="result-page min-h-screen light-mode">
    <Navbar />

    <main class="result-main">
      <div class="result-content animate-fade-in">

        <!-- ── Loading / Grading State ─────────────────────────────── -->
        <template v-if="!graded">
          <div class="grading-card glass-card">
            <div class="grading-icon">🤖</div>
            <h1 class="grading-title">AI Sedang Menilai Jawaban Anda</h1>
            <p class="text-muted text-sm">
              Mohon tunggu sebentar. Proses penilaian esai dilakukan secara otomatis oleh AI.
            </p>
            <div class="spinner" style="margin: 1rem auto;"></div>
            <p class="text-xs text-muted">Biasanya membutuhkan 1–3 menit...</p>
          </div>
        </template>

        <!-- ── Hasil Tersedia ──────────────────────────────────────── -->
        <template v-else>



          <!-- Score Card -->
          <div class="score-hero glass-card">
            <div class="score-badge" :class="scoreClass">
              {{ hasil?.total_nilai ?? '—' }}
              <span class="score-max">/ {{ hasil?.nilai_maksimal }}</span>
            </div>
            <h1 class="score-title">Hasil Ujian</h1>
            <p class="score-ujian">{{ hasil?.ujian_judul }}</p>

            <!-- Info Mahasiswa -->
            <div class="mahasiswa-info" v-if="authStore.user">
              <span>{{ authStore.user.nama_lengkap || authStore.user.username }}</span>
              <span class="mhs-sep">·</span>
              <span>NIM: {{ authStore.user.nim }}</span>
              <span v-if="authStore.user.kelas" class="mhs-sep">·</span>
              <span v-if="authStore.user.kelas">{{ authStore.user.kelas }}</span>
            </div>

            <div class="score-meta">
              <div class="meta-chip">
                <span>Durasi</span>
                <strong>{{ examStore.ujian?.durasi_menit ?? '—' }} menit</strong>
              </div>
              <div class="meta-chip">
                <span>Soal Dijawab</span>
                <strong>{{ examStore.sesi?.jumlah_soal_dijawab ?? examStore.answeredCount ?? '—' }} / {{ examStore.sesi?.jumlah_soal ?? examStore.totalSoal ?? '—' }}</strong>
              </div>
              <div class="meta-chip">
                <span>Selesai</span>
                <strong>{{ formatDate(examStore.sesi?.waktu_selesai) }}</strong>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="score-actions">
              <button
                id="btn-download-pdf"
                class="btn btn-secondary"
                @click="downloadPDF"
                :disabled="isDownloading"
              >
                <span v-if="isDownloading" class="spinner" style="width:1rem;height:1rem;border-width:2px;margin-right:0.5rem"></span>
                📄 {{ isDownloading ? 'Memproses PDF...' : 'Download PDF' }}
              </button>
              <router-link :to="{ name: 'Dashboard' }" class="btn btn-primary">
                ← Kembali ke Dashboard
              </router-link>
            </div>
          </div>

          <!-- Detail per Soal -->
          <div class="detail-section">
            <h2 class="section-title">Detail Penilaian per Soal</h2>
            <div class="detail-list">
              <div
                v-for="jawaban in hasil?.jawaban"
                :key="jawaban.nomor_soal"
                class="detail-item glass-card"
              >
                <div class="detail-header">
                  <span class="soal-label">Soal {{ jawaban.nomor_soal }}</span>
                  <span class="detail-score" :class="getScoreClass(jawaban.nilai)">
                    {{ jawaban.nilai ?? '—' }} / 10
                  </span>
                </div>

                <p class="detail-question">{{ jawaban.pertanyaan }}</p>

                <div class="detail-answer-block">
                  <p class="detail-answer-label">Jawaban Anda:</p>
                  <p class="detail-answer-text">{{ jawaban.teks_jawaban || '(tidak dijawab)' }}</p>
                </div>

                <div class="ai-reason" v-if="jawaban.alasan_nilai">
                  <span class="ai-label">🤖 Alasan AI:</span>
                  <p>{{ jawaban.alasan_nilai }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>
    </main>

    <!-- ── Hidden Printable Template for PDF ── -->
    <div class="pdf-offscreen" aria-hidden="true">
      <div ref="pdfTemplate" class="pdf-template">
        <KopInstitusi />
        <h2 class="pdf-title">TRANSKRIP NILAI UJIAN ESAI</h2>
        
        <table class="pdf-info-table" v-if="authStore.user">
          <tr>
            <td width="120">Nama Mahasiswa</td>
            <td width="10">:</td>
            <td><strong>{{ authStore.user.nama_lengkap || authStore.user.username }}</strong></td>
          </tr>
          <tr>
            <td>NIM</td>
            <td>:</td>
            <td>{{ authStore.user.nim }}</td>
          </tr>
          <tr>
            <td>Kelas</td>
            <td>:</td>
            <td>{{ authStore.user.kelas || '—' }}</td>
          </tr>
          <tr>
            <td>Judul Ujian</td>
            <td>:</td>
            <td>{{ hasil?.ujian_judul }}</td>
          </tr>
          <tr>
            <td>Waktu Selesai</td>
            <td>:</td>
            <td>{{ formatDate(examStore.sesi?.waktu_selesai) }}</td>
          </tr>
        </table>

        <div class="pdf-score-box">
          <div class="pdf-score-label">NILAI AKHIR</div>
          <div class="pdf-score-value">{{ hasil?.total_nilai ?? '—' }} / {{ hasil?.nilai_maksimal }}</div>
        </div>

        <h3 class="pdf-subtitle">Detail Jawaban dan Penilaian</h3>
        
        <div v-for="jawaban in hasil?.jawaban" :key="jawaban.nomor_soal" class="pdf-qa-item">
          <div class="pdf-qa-header">
            <strong>Soal {{ jawaban.nomor_soal }}</strong>
            <span style="float:right;">Nilai: <strong>{{ jawaban.nilai ?? '—' }}</strong> / 10</span>
          </div>
          <div class="pdf-qa-body">
            <p><strong>Pertanyaan:</strong><br/>{{ jawaban.pertanyaan }}</p>
            <p><strong>Jawaban Mahasiswa:</strong><br/>{{ jawaban.teks_jawaban || '(tidak dijawab)' }}</p>
            <p v-if="jawaban.alasan_nilai"><strong>Alasan Penilaian (AI):</strong><br/>{{ jawaban.alasan_nilai }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useAuthStore } from '@/stores/auth'
import { laporanApi, submissionApi }   from '@/services/api'
import Navbar from '@/components/Navbar.vue'
import KopInstitusi from '@/components/KopInstitusi.vue'
import html2pdf from 'html2pdf.js'

const route     = useRoute()
const examStore = useExamStore()
const authStore = useAuthStore()

const hasil   = ref(null)
const graded  = ref(false)
const pdfTemplate = ref(null)
let pollTimer = null
const isDownloading = ref(false)

const scoreClass = computed(() => {
  const n = hasil.value?.total_nilai ?? 0
  const max = hasil.value?.nilai_maksimal ?? 1
  const pct = (n / max) * 100
  if (pct >= 75) return 'score-badge--high'
  if (pct >= 50) return 'score-badge--mid'
  return 'score-badge--low'
})

function getScoreClass(nilai) {
  if (nilai === 10) return 'text-success'
  if (nilai === 5)  return 'text-warning'
  return 'text-danger'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

async function downloadPDF() {
  if (!pdfTemplate.value) return
  isDownloading.value = true

  const opt = {
    margin:       [10, 10, 10, 10],
    filename:     `Transkrip-Nilai-${authStore.user?.nim || 'Ujian'}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  try {
    // Generate PDF from hidden template
    await html2pdf().set(opt).from(pdfTemplate.value).save()
  } catch (err) {
    console.error('Gagal membuat PDF', err)
    alert('Terjadi kesalahan saat membuat PDF')
  } finally {
    isDownloading.value = false
  }
}

async function poll() {
  try {
    const data = await examStore.pollHasil()
    hasil.value = data
    if (data.semua_selesai_dinilai) {
      graded.value = true
      clearInterval(pollTimer)
    }
  } catch (_) { /* retry */ }
}

onMounted(async () => {
  // Set sesi id supaya pollHasil bisa dipakai
  if (!examStore.sesiId) {
    examStore.sesi = { id: Number(route.params.sesiId) }
  }

  // Sinkronkan info meta dari backend (SesiDetail)
  try {
    const { data: sesiDetail } = await submissionApi.getSesiDetail(examStore.sesi.id)
    if (sesiDetail) {
      if (!examStore.sesi) examStore.sesi = { id: examStore.sesiId }
      examStore.sesi.waktu_selesai = sesiDetail.waktu_selesai
      examStore.sesi.waktu_mulai = sesiDetail.waktu_mulai
      
      const dijawab = sesiDetail.jawaban ? sesiDetail.jawaban.filter(j => j.teks_jawaban && j.teks_jawaban.trim()).length : 0
      examStore.sesi.jumlah_soal_dijawab = dijawab
      examStore.sesi.jumlah_soal = sesiDetail.jawaban ? sesiDetail.jawaban.length : 0
    }
  } catch (err) {
    console.warn('Gagal memuat detail sesi', err)
  }

  poll()
  pollTimer = setInterval(poll, 5000)
})

onBeforeUnmount(() => clearInterval(pollTimer))
</script>

<style scoped>
/* ── Printable Template (Off-screen) ── */
.pdf-offscreen {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 800px;
  background: white;
  z-index: -100;
}

.pdf-template {
  background: white;
  color: #000;
  padding: 10mm;
  font-family: 'Times New Roman', Times, serif;
  width: 210mm; /* A4 width approx */
  min-height: 297mm;
  box-sizing: border-box;
}

.pdf-title {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin-bottom: 20px;
  text-decoration: underline;
}

.pdf-info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 11pt;
}

.pdf-info-table td {
  padding: 4px;
  vertical-align: top;
}

.pdf-score-box {
  border: 2px solid #000;
  padding: 15px;
  text-align: center;
  margin-bottom: 30px;
  background-color: #f9f9f9;
}

.pdf-score-label {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 5px;
}

.pdf-score-value {
  font-size: 24pt;
  font-weight: bold;
}

.pdf-subtitle {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 15px;
  border-bottom: 1px solid #000;
  padding-bottom: 5px;
}

.pdf-qa-item {
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.pdf-qa-header {
  background: #f0f0f0;
  padding: 8px;
  border: 1px solid #000;
  border-bottom: none;
  font-size: 11pt;
}

.pdf-qa-body {
  border: 1px solid #000;
  padding: 10px;
  font-size: 10pt;
  line-height: 1.5;
}

.pdf-qa-body p {
  margin: 0 0 10px 0;
}

.pdf-qa-body p:last-child {
  margin-bottom: 0;
}

/* ── Mahasiswa Info ── */
.mahasiswa-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
  justify-content: center;
}

.mhs-sep { color: var(--color-text-muted); }

/* ── Layout ── */
.result-page { display: flex; flex-direction: column; }

.result-main {
  flex: 1;
  padding: var(--space-8) var(--space-6);
}

.result-content {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.grading-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-12);
}

.grading-icon { font-size: 3rem; }
.grading-title { font-size: 1.4rem; }

/* Score Hero */
.score-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.score-badge {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.score-badge--high { color: var(--color-success); }
.score-badge--mid  { color: var(--color-warning); }
.score-badge--low  { color: var(--color-danger); }

.score-max {
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.score-title { font-size: 1.5rem; }
.score-ujian { color: var(--color-primary-400); font-size: 0.9rem; }

.score-meta {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}

.meta-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
}

.meta-chip strong {
  font-size: 0.95rem;
  color: var(--color-text-primary);
  margin-top: 2px;
}

.score-actions {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}

/* Detail List */
.section-title { font-size: 1.15rem; font-weight: 700; margin-bottom: var(--space-4); }

.detail-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.soal-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary-400);
}

.detail-score {
  font-size: 1.1rem;
  font-weight: 800;
}

.detail-question {
  font-size: 0.95rem;
  color: var(--color-text-primary);
  line-height: 1.7;
}

.detail-answer-block {
  background: var(--color-surface-3);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.detail-answer-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.detail-answer-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.ai-reason {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.ai-label {
  font-weight: 600;
  color: var(--color-primary-400);
  display: block;
  margin-bottom: var(--space-1);
}
</style>
