import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3003,
    // Agar semua rute SPA (Vue Router history mode) tidak 404 saat akses langsung via URL
    historyApiFallback: true,
    proxy: {
      // Proxy API calls ke backend Django
      '/api': {
        target: 'http://192.168.160.201:8443',
        changeOrigin: true,
      }
    }
  }
})
