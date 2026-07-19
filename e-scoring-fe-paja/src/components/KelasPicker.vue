<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { fetchAll } from '../api/client'

// v-model: string kelas dipisah koma, sama seperti format field kelas_target di backend
const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const open = ref(false)
const search = ref('')
const kelasTersedia = ref([])
const loading = ref(true)

const selected = computed({
  get: () =>
    props.modelValue
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  set: (arr) => emit('update:modelValue', arr.join(', ')),
})

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  const semua = [...new Set([...kelasTersedia.value, ...selected.value])].sort()
  if (!q) return semua
  return semua.filter((k) => k.toLowerCase().includes(q))
})

const bisaTambahBaru = computed(() => {
  const q = search.value.trim()
  if (!q) return false
  return !kelasTersedia.value.some((k) => k.toLowerCase() === q.toLowerCase()) &&
         !selected.value.some((k) => k.toLowerCase() === q.toLowerCase())
})

function toggle(kelas) {
  const arr = [...selected.value]
  const idx = arr.indexOf(kelas)
  if (idx === -1) arr.push(kelas)
  else arr.splice(idx, 1)
  selected.value = arr
}

function tambahBaru() {
  const kelas = search.value.trim()
  if (!kelas) return
  selected.value = [...selected.value, kelas]
  search.value = ''
}

function hapusChip(kelas) {
  selected.value = selected.value.filter((k) => k !== kelas)
}

function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(async () => {
  document.addEventListener('click', onClickOutside)
  try {
    const list = await fetchAll('/auth/mahasiswa/')
    kelasTersedia.value = [...new Set(list.map((m) => m.kelas).filter(Boolean))].sort()
  } catch {
    // gagal memuat daftar kelas — picker tetap bisa dipakai untuk input manual
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="kelas-picker position-relative">
    <div class="picker-control form-control" :class="{ focused: open }" @click="open = true">
      <template v-if="selected.length === 0">
        <span class="text-secondary">Pilih kelas target…</span>
      </template>
      <template v-else>
        <span v-for="k in selected" :key="k" class="chip">
          {{ k }}
          <button type="button" class="chip-x" @click.stop="hapusChip(k)">
            <i class="bi bi-x"></i>
          </button>
        </span>
      </template>
    </div>

    <div v-if="open" class="picker-dropdown shadow">
      <div class="p-2 border-bottom">
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          placeholder="Cari atau ketik kelas baru…"
          autofocus
          @keydown.enter.prevent="bisaTambahBaru && tambahBaru()"
        />
      </div>
      <div class="picker-list">
        <div v-if="loading" class="text-center text-secondary small py-3">Memuat kelas…</div>
        <template v-else>
          <label v-for="k in filteredOptions" :key="k" class="picker-item">
            <input type="checkbox" class="form-check-input me-2" :checked="selected.includes(k)" @change="toggle(k)" />
            {{ k }}
          </label>
          <button
            v-if="bisaTambahBaru"
            type="button"
            class="picker-item picker-add"
            @click="tambahBaru"
          >
            <i class="bi bi-plus-lg me-2"></i>Tambah kelas "{{ search.trim() }}"
          </button>
          <div v-if="!loading && filteredOptions.length === 0 && !bisaTambahBaru" class="text-center text-secondary small py-3">
            Belum ada data kelas. Import mahasiswa dulu, atau ketik nama kelas baru.
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-control {
  min-height: 42px;
  height: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  cursor: text;
  padding: 6px 10px;
}
.picker-control.focused {
  border-color: var(--aes-primary);
  box-shadow: 0 0 0 0.2rem rgba(124, 58, 237, 0.15);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(124, 58, 237, 0.12);
  color: #6d28d9;
  border-radius: 999px;
  padding: 2px 6px 2px 10px;
  font-size: 0.8rem;
  font-weight: 600;
}
.chip-x {
  background: none;
  border: none;
  color: inherit;
  display: flex;
  align-items: center;
  padding: 0;
  line-height: 1;
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1050;
  background: var(--aes-surface);
  border: 1px solid var(--aes-border);
  border-radius: 10px;
  overflow: hidden;
}
.picker-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
}
.picker-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--aes-text);
  text-align: left;
}
.picker-item:hover {
  background: var(--aes-surface-2);
}
.picker-add {
  color: var(--aes-primary-dark);
  font-weight: 600;
}
</style>
