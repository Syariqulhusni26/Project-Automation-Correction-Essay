<template>
  <!--
    QuestionNumber.vue
    Grid navigator nomor soal di panel samping Exam.vue.
    Tiap tombol menunjukkan status: sudah dijawab / aktif / kosong.
  -->
  <div class="qnum-panel">
    <h3 class="panel-title">Navigasi Soal</h3>
    <div class="qnum-grid">
      <button
        v-for="(soal, index) in soalList"
        :key="soal.id"
        :id="`btn-soal-${soal.nomor_urut}`"
        class="qnum-btn"
        :class="{
          'qnum-btn--active':    index === currentIndex,
          'qnum-btn--answered':  isAnswered(soal.id) && index !== currentIndex,
        }"
        @click="$emit('goto', index)"
        :title="`Soal ${soal.nomor_urut}`"
      >
        {{ soal.nomor_urut }}
      </button>
    </div>

    <!-- Legenda -->
    <div class="legend">
      <span class="legend-item"><span class="dot dot--answered"></span> Dijawab</span>
      <span class="legend-item"><span class="dot dot--active"></span> Aktif</span>
      <span class="legend-item"><span class="dot dot--empty"></span> Kosong</span>
    </div>

    <!-- Progress -->
    <div class="progress-wrapper">
      <div class="progress-label">
        <span>{{ answeredCount }} / {{ soalList.length }} soal dijawab</span>
        <span>{{ Math.round((answeredCount / soalList.length) * 100) || 0 }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${(answeredCount / soalList.length) * 100}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  soalList:     { type: Array,  required: true },
  currentIndex: { type: Number, default: 0 },
  jawabanMap:   { type: Object, default: () => ({}) },
  answeredCount:{ type: Number, default: 0 },
})

defineEmits(['goto'])

function isAnswered(soalId) {
  return !!(props.jawabanMap[soalId]?.trim())
}
</script>

<style scoped>
.qnum-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.qnum-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-2);
}

.qnum-btn {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-3);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.qnum-btn:hover {
  border-color: var(--color-primary-500);
  color: var(--color-primary-400);
}

.qnum-btn--active {
  background: var(--color-primary-600);
  border-color: var(--color-primary-500);
  color: white;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
}

.qnum-btn--answered {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: var(--color-success);
}

.legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.dot--active   { background: var(--color-primary-500); }
.dot--answered { background: var(--color-success); }
.dot--empty    { background: var(--color-surface-3); border: 1px solid var(--color-border); }

.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.progress-bar {
  height: 6px;
  background: var(--color-surface-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-600), var(--color-accent-500));
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}
</style>
