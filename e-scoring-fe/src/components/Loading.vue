<template>
  <!--
    Loading.vue
    Fullscreen atau inline loading overlay.
    Props: fullscreen (bool), message (string)
  -->
  <div
    class="loading-wrapper"
    :class="{ 'loading-wrapper--fullscreen': fullscreen }"
    role="status"
    :aria-label="message"
  >
    <div class="loading-inner">
      <div class="spinner-ring">
        <div class="spinner-track"></div>
        <div class="spinner-fill"></div>
      </div>
      <p v-if="message" class="loading-message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  fullscreen: { type: Boolean, default: false },
  message:    { type: String,  default: '' },
})
</script>

<style scoped>
.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
}

.loading-wrapper--fullscreen {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(8px);
  z-index: 999;
}

.loading-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

/* Custom spinner dengan dua cincin */
.spinner-ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.spinner-track {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 4px solid var(--color-surface-3);
}

.spinner-fill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 4px solid transparent;
  border-top-color: var(--color-primary-500);
  border-right-color: var(--color-accent-500);
  animation: spin 0.8s linear infinite;
}

.loading-message {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  text-align: center;
}
</style>
