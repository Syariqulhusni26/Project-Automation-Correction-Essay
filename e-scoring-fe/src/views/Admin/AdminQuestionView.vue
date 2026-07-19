<template>
  <!--
    Admin/AdminQuestionView.vue
    Manajemen soal esai per ujian.
  -->
  <div class="admin-layout">
    <Sidebar />
    <div class="admin-body">
      <Navbar />
      <main class="admin-main">
        <div class="admin-content animate-fade-in">

          <!-- Header -->
          <header class="section-header">
            <div>
              <router-link :to="{ name: 'AdminDashboard' }" class="back-link">← Kembali</router-link>
              <h1 class="page-title" v-if="ujianDetail">
                Soal — {{ ujianDetail.judul }}
              </h1>
            </div>
            <div class="flex gap-4">
              <!-- Upload Excel -->
              <label id="btn-upload-excel" class="btn btn-secondary" style="cursor:pointer;">
                📥 Import Excel
                <input type="file" accept=".xlsx,.xls" hidden @change="onUploadExcel" />
              </label>
              <!-- Tambah Manual -->
              <button
                id="btn-add-soal"
                class="btn btn-primary"
                @click="openForm(null)"
              >
                + Tambah Soal
              </button>
            </div>
          </header>

          <Loading v-if="loading" message="Memuat soal..." />

          <template v-else>
            <!-- Soal List -->
            <div class="soal-list">
              <div
                v-for="soal in soalList"
                :key="soal.id"
                class="soal-item glass-card"
              >
                <div class="soal-item-header">
                  <span class="soal-number">Soal {{ soal.nomor_urut }}</span>
                  <div class="flex gap-2">
                    <button
                      :id="`btn-edit-soal-${soal.id}`"
                      class="btn btn-sm btn-secondary"
                      @click="openForm(soal)"
                    >✏️ Edit</button>
                    <button
                      :id="`btn-delete-soal-${soal.id}`"
                      class="btn btn-sm btn-danger"
                      @click="deleteSoal(soal.id)"
                    >🗑</button>
                  </div>
                </div>
                <p class="soal-question">{{ soal.pertanyaan }}</p>
                <details class="soal-answer-detail">
                  <summary class="text-sm text-muted" style="cursor:pointer;">Lihat referensi jawaban & kata kunci</summary>
                  <div style="margin-top: 0.5rem;">
                    <p class="text-sm"><strong>Referensi:</strong> {{ soal.referensi_jawaban }}</p>
                    <p class="text-sm text-muted" v-if="soal.kata_kunci">
                      <strong>Kata Kunci:</strong> {{ soal.kata_kunci }}
                    </p>
                  </div>
                </details>
              </div>

              <div v-if="soalList.length === 0" class="empty-state glass-card">
                <span>📭</span>
                <p class="text-muted text-sm">Belum ada soal. Tambahkan soal atau import dari Excel.</p>
              </div>
            </div>
          </template>
        </div>
      </main>
    </div>
  </div>

  <!-- ── Form Modal ── -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
        <div class="modal-content" style="max-width: 600px;">
          <h2 class="text-xl font-bold" style="margin-bottom: 1rem;">
            {{ editSoal ? 'Edit Soal' : 'Tambah Soal' }}
          </h2>

          <form @submit.prevent="saveSoal" style="display:flex;flex-direction:column;gap:1rem;">
            <div class="form-group">
              <label class="form-label">Pertanyaan</label>
              <textarea v-model="form.pertanyaan" class="form-textarea" required rows="4"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Referensi Jawaban (Kunci)</label>
              <textarea v-model="form.referensi_jawaban" class="form-textarea" required rows="4"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Kata Kunci (pisahkan dengan koma)</label>
              <input v-model="form.kata_kunci" class="form-input" placeholder="enkapsulasi, inheritance, polimorfisme" />
            </div>

            <div class="flex gap-4" style="justify-content:flex-end;">
              <button type="button" class="btn btn-secondary" @click="showForm = false">Batal</button>
              <button id="btn-save-soal" type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ujianApi } from '@/services/api'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Loading from '@/components/Loading.vue'

const route    = useRoute()
const ujianId  = Number(route.params.ujianId)

const loading    = ref(false)
const saving     = ref(false)
const soalList   = ref([])
const ujianDetail= ref(null)
const showForm   = ref(false)
const editSoal   = ref(null)
const form       = reactive({ pertanyaan: '', referensi_jawaban: '', kata_kunci: '' })

async function fetchData() {
  loading.value = true
  const [soalRes, ujianRes] = await Promise.all([
    ujianApi.getSoalList(ujianId),
    ujianApi.getUjianDetail(ujianId),
  ])
  soalList.value    = soalRes.data
  ujianDetail.value = ujianRes.data
  loading.value = false
}

function openForm(soal) {
  editSoal.value = soal
  if (soal) {
    Object.assign(form, {
      pertanyaan:        soal.pertanyaan,
      referensi_jawaban: soal.referensi_jawaban,
      kata_kunci:        soal.kata_kunci,
    })
  } else {
    Object.assign(form, { pertanyaan: '', referensi_jawaban: '', kata_kunci: '' })
  }
  showForm.value = true
}

async function saveSoal() {
  saving.value = true
  try {
    if (editSoal.value) {
      await ujianApi.updateSoal(editSoal.value.id, form)
    } else {
      await ujianApi.createSoal(ujianId, form)
    }
    showForm.value = false
    await fetchData()
  } finally {
    saving.value = false
  }
}

async function deleteSoal(id) {
  if (!confirm('Hapus soal ini?')) return
  await ujianApi.deleteSoal(id)
  await fetchData()
}

async function onUploadExcel(event) {
  const file = event.target.files[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  await ujianApi.uploadSoalExcel(ujianId, fd)
  await fetchData()
  event.target.value = ''
}

onMounted(fetchData)
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.admin-body   { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.admin-main   { flex: 1; padding: var(--space-6); overflow-y: auto; }
.admin-content{ max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-6); }
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
.page-title { font-size: 1.4rem; font-weight: 800; margin-top: var(--space-1); }
.back-link  { font-size: 0.85rem; color: var(--color-primary-400); }

.soal-list { display: flex; flex-direction: column; gap: var(--space-4); }

.soal-item { display: flex; flex-direction: column; gap: var(--space-3); }

.soal-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.soal-number {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary-400);
}

.soal-question {
  font-size: 0.95rem;
  line-height: 1.7;
}

.empty-state {
  text-align: center;
  padding: var(--space-12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  font-size: 1.5rem;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
