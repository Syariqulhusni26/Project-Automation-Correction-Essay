<template>
  <!--
    StatusBadge.vue
    Badge fleksibel untuk status ujian, grading, akun, dll.
    Props: status ('success'|'warning'|'danger'|'info'|'neutral'), label (string)
  -->
  <span class="badge" :class="`badge-${status}`">
    <span class="badge-dot" v-if="dot"></span>
    {{ label }}
  </span>
</template>

<script setup>
defineProps({
  /**
   * Salah satu dari: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
   */
  status: {
    type: String,
    default: 'neutral',
    validator: v => ['success', 'warning', 'danger', 'info', 'neutral'].includes(v),
  },
  label:  { type: String, required: true },
  dot:    { type: Boolean, default: true },
})
</script>

<style scoped>
.badge-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
</style>
