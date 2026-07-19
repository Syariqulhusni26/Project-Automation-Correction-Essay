<template>
  <!--
    QuestionCard.vue
    Menampilkan satu soal esai beserta area jawaban.
    Emit 'answer-change' tiap kali teks berubah.
  -->
  <div class="question-card animate-fade-in" :key="soal.id">
    <!-- Header Soal -->
    <div class="card-header">
      <div class="soal-badge">Soal {{ soal.nomor_urut }}</div>
      <span class="text-muted text-sm">{{ answeredStatus }}</span>
    </div>

    <!-- Teks Pertanyaan -->
    <div class="question-text">
      <p>{{ soal.pertanyaan }}</p>
    </div>

    <!-- Area Jawaban -->
    <div class="answer-section">
      <label :for="`answer-${soal.id}`" class="form-label">Jawaban Anda:</label>
      <AnswerTextarea
        :id="`answer-${soal.id}`"
        :modelValue="modelValue"
        :disabled="disabled"
        @update:modelValue="$emit('answer-change', $event)"
      />
      <div class="char-count">
        <span :class="{ 'text-warning': charCount < 20 }">
          {{ charCount }} karakter
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AnswerTextarea from './AnswerTextarea.vue'

const props = defineProps({
  soal:       { type: Object,  required: true },
  modelValue: { type: String,  default: '' },
  disabled:   { type: Boolean, default: false },
})

defineEmits(['answer-change'])

const charCount = computed(() => (props.modelValue || '').length)

const answeredStatus = computed(() =>
  charCount.value > 0 ? '✅ Sudah dijawab' : '⬜ Belum dijawab'
)
</script>

<style scoped>
.question-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.soal-badge {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500));
  color: white;
  padding: 0.25rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.question-text {
  background: var(--color-surface-3);
  border-left: 3px solid var(--color-primary-500);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: var(--space-4);
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text-primary);
}

.answer-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
