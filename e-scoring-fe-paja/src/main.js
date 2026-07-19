import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css'

import App from './App.vue'
import router from './router'
import './stores/theme' // terapkan tema tersimpan sesegera mungkin, sebelum render pertama

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
