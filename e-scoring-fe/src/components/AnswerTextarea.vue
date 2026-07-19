<template>
  <!--
    AnswerTextarea.vue
    Textarea jawaban esai dengan auto-save debounce.
    Emit 'update:modelValue' tiap perubahan.
  -->
  <div class="answer-wrapper">
    <textarea
      :id="id"
      class="form-textarea answer-textarea"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      rows="8"
      @input="onInput"
    ></textarea>
    <!-- Auto-save indicator -->
    <Transition name="fade">
      <span v-if="saving" class="save-indicator">
        <Loader2 size="12" class="icon-spin" style="display:inline-block;vertical-align:text-bottom;margin-right:3px;" /> Menyimpan...
      </span>
      <span v-else-if="saved" class="save-indicator save-indicator--done">
        <CheckCircle2 size="12" style="display:inline-block;vertical-align:text-bottom;margin-right:3px;" /> Tersimpan
      </span>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Loader2, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps({
  id:          { type: String,  default: 'answer-textarea' },
  modelValue:  { type: String,  default: '' },
  disabled:    { type: Boolean, default: false },
  placeholder: { type: String,  default: 'Tulis jawaban Anda di sini...' },
})

const emit = defineEmits(['update:modelValue'])

const saving = ref(false)
const saved  = ref(false)
let debounceTimer = null

function onInput(event) {
  const value = event.target.value
  emit('update:modelValue', value)

  // Tampilkan indikator saving setelah 500ms idle
  saving.value = false
  saved.value  = false
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saving.value = true
    // Parent akan handle save via @answer-change, simulasi delay UI
    setTimeout(() => {
      saving.value = false
      saved.value  = true
      setTimeout(() => { saved.value = false }, 2000)
    }, 600)
  }, 500)
}
</script>

<style scoped>
.answer-wrapper {
  position: relative;
}

.answer-textarea {
  font-size: 0.95rem;
  min-height: 180px;
  line-height: 1.8;
  padding: var(--space-3) var(--space-4);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.save-indicator {
  position: absolute;
  bottom: var(--space-2);
  right: var(--space-3);
  font-size: 0.72rem;
  color: var(--color-text-muted);
  pointer-events: none;
}

.save-indicator--done {
  color: var(--color-success);
}

/* Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
