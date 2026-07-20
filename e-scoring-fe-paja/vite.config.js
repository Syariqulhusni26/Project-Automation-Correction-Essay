import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // true = dengarkan di semua alamat jaringan (LAN), bukan cuma localhost —
    // supaya bisa diakses dari HP tanpa perlu flag --host manual
    host: true,
  },
})
