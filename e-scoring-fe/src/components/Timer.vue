<template>
  <!--
    Timer.vue
    Countdown timer ujian. Berubah warna saat waktu <5 menit.
  -->
  <div class="timer" :class="{ 'timer--warning': timerStore.isWarning, 'timer--expired': timerStore.isExpired }">
    <div class="timer-icon">⏱</div>
    <div class="timer-body">
      <span class="timer-label">Sisa Waktu</span>
      <span class="timer-display">{{ timerStore.formattedTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { useTimerStore } from '@/stores/timer'
const timerStore = useTimerStore()
</script>

<style scoped>
.timer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  transition: all var(--transition-normal);
}

.timer-icon {
  font-size: 1.4rem;
}

.timer-body {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.timer-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.timer-display {
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  letter-spacing: 0.05em;
}

/* Kurang 5 menit */
.timer--warning {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
  animation: pulse-ring 2s infinite;
}

.timer--warning .timer-display {
  color: var(--color-warning);
}

/* Habis */
.timer--expired {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}

.timer--expired .timer-display {
  color: var(--color-danger);
}
</style>
