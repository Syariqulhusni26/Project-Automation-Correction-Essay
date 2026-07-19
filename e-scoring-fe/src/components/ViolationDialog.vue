<template>
  <!--
    ViolationDialog.vue
    Modal yang muncul saat backend mendeteksi pelanggaran dan mengunci akun.
    Tidak bisa ditutup oleh mahasiswa — hanya Dosen yang bisa unlock.
  -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-overlay" role="alertdialog" aria-modal="true">
        <div class="modal-content violation-modal">
          <!-- Icon -->
          <div class="violation-icon">🚨</div>

          <!-- Judul -->
          <h2 class="violation-title">Ujian Dihentikan</h2>

          <!-- Pesan -->
          <p class="violation-message">
            Sistem mendeteksi <strong>pelanggaran</strong> selama ujian berlangsung.
            Akun Anda telah dikunci sementara.
          </p>

          <!-- Tipe Pelanggaran -->
          <div class="violation-detail" v-if="violation">
            <StatusBadge status="danger" :label="violationLabel" />
            <p class="text-sm text-muted mt-4">{{ violation.keterangan }}</p>
          </div>

          <!-- Instruksi -->
          <div class="violation-info">
            <p>Hubungi <strong>Dosen pengawas</strong> untuk membuka kembali akun Anda.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  visible:   { type: Boolean, required: true },
  violation: { type: Object,  default: null },
})

const VIOLATION_LABELS = {
  tab_baru:          'Membuka Tab/Jendela Baru',
  window_blur:       'Berpindah Aplikasi',
  fullscreen_exit:   'Keluar dari Layar Penuh',
  heartbeat_timeout: 'Koneksi Terputus',
}

const violationLabel = computed(() =>
  props.violation ? (VIOLATION_LABELS[props.violation.tipe] || props.violation.tipe) : ''
)
</script>

<style scoped>
.violation-modal {
  text-align: center;
  max-width: 420px;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.violation-icon {
  font-size: 3.5rem;
  margin-bottom: var(--space-4);
}

.violation-title {
  font-size: 1.5rem;
  color: var(--color-danger);
  margin-bottom: var(--space-2);
}

.violation-message {
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-4);
}

.violation-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}

.violation-info {
  background: var(--color-surface-3);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
