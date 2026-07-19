# E-Scoring Frontend

Aplikasi frontend **Vue 3** untuk sistem ujian esai otomatis berbasis AI.  
Terhubung ke backend **Django REST Framework** di `e-scoring-be`.

---

## Tech Stack

| Teknologi     | Versi   | Peran                                  |
|---------------|---------|----------------------------------------|
| Vue 3         | ^3.4    | Framework UI (Composition API)         |
| Vite          | ^5.3    | Build tool & dev server                |
| Vue Router 4  | ^4.3    | Client-side routing + navigation guard |
| Pinia         | ^2.1    | State management (auth, exam, timer)   |
| Axios         | ^1.7    | HTTP client + JWT interceptor          |
| VueUse        | ^10.11  | Browser composables (opsional)         |
| Vanilla CSS   | —       | Design system custom (no Tailwind)     |

---

## Struktur Folder

```
src/
├── assets/
│   └── main.css          # Global CSS design system (dark theme, tokens, utilities)
├── components/
│   ├── Navbar.vue         # Top navigation bar (semua role)
│   ├── Sidebar.vue        # Collapsible sidebar (admin/dosen)
│   ├── QuestionCard.vue   # Card soal esai + AnswerTextarea
│   ├── QuestionNumber.vue # Grid navigator nomor soal
│   ├── Timer.vue          # Countdown timer dari Pinia store
│   ├── AnswerTextarea.vue # Textarea jawaban + auto-save indicator
│   ├── ViolationDialog.vue# Modal pelanggaran ujian (fullscreen lock)
│   ├── Loading.vue        # Spinner overlay (inline / fullscreen)
│   └── StatusBadge.vue    # Badge status (success/warning/danger/info/neutral)
├── composables/
│   ├── useProctoring.js   # Deteksi blur/tab/fullscreen + lapor ke backend
│   └── useDownload.js     # Helper download Blob (PDF/Excel)
├── router/
│   └── index.js           # Routes + navigation guard (role-based)
├── services/
│   └── api.js             # Axios instance + semua API calls
├── stores/
│   ├── auth.js            # Auth store: login, logout, profil, persistensi token
│   ├── exam.js            # Exam store: sesi, soal, jawaban, submit
│   └── timer.js           # Timer store: countdown + heartbeat ke backend
└── views/
    ├── LoginView.vue       # Halaman login
    ├── DashboardView.vue   # Dashboard mahasiswa (daftar ujian tersedia)
    ├── ExamView.vue        # Halaman ujian (soal + timer + proctoring)
    ├── ResultView.vue      # Hasil ujian + polling AI grading
    └── Admin/
        ├── AdminDashboardView.vue  # Dashboard dosen (statistik + tabel ujian)
        ├── AdminQuestionView.vue   # CRUD soal per ujian + import Excel
        ├── AdminStudentView.vue    # Manajemen mahasiswa + unlock + import/export
        ├── AdminScoreView.vue      # Rekap nilai + export Excel/PDF
        └── AdminLogsView.vue       # Log pelanggaran per ujian
```

---

## Instalasi & Menjalankan

### 1. Install dependencies
```bash
npm install
```

### 2. Konfigurasi environment
Salin `.env.example` menjadi `.env` dan sesuaikan URL backend:
```env
VITE_API_BASE_URL=http://localhost:8443/api/v1
```
Ganti `localhost:8443` dengan IP LAN backend jika diakses dari perangkat lain.

### 3. Jalankan dev server
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

---

## Endpoint API yang Digunakan

| Store / View        | Method   | Endpoint                                          |
|---------------------|----------|---------------------------------------------------|
| `auth.js`           | POST     | `/auth/login/`                                    |
| `auth.js`           | POST     | `/auth/logout/`                                   |
| `auth.js`           | GET      | `/auth/profile/`                                  |
| `AdminStudentView`  | GET      | `/auth/mahasiswa/`                                |
| `AdminStudentView`  | POST     | `/auth/mahasiswa/import/`                         |
| `AdminStudentView`  | GET      | `/auth/mahasiswa/export-kartu/`                   |
| `AdminStudentView`  | POST     | `/auth/mahasiswa/:pk/unlock/`                     |
| `AdminStudentView`  | DELETE   | `/auth/mahasiswa/:pk/`                            |
| `DashboardView`     | GET      | `/ujian/tersedia/`                                |
| `AdminDashboard`    | GET      | `/ujian/dashboard/`                               |
| `AdminDashboard`    | GET/POST | `/ujian/`                                         |
| `AdminDashboard`    | POST     | `/ujian/:pk/aktivasi/`                            |
| `AdminQuestionView` | GET/POST | `/ujian/:ujianId/soal/`                           |
| `AdminQuestionView` | POST     | `/ujian/:ujianId/soal/upload/`                    |
| `exam.js`           | POST     | `/submission/mulai/:ujianId/`                     |
| `exam.js`           | POST     | `/submission/save-jawaban/`                       |
| `exam.js`           | POST     | `/submission/submit/:sesiId/`                     |
| `exam.js`           | GET      | `/submission/hasil/:sesiId/`                      |
| `timer.js`          | POST     | `/proctoring/heartbeat/`                          |
| `useProctoring.js`  | POST     | `/proctoring/pelanggaran/`                        |
| `AdminScoreView`    | GET      | `/laporan/nilai/:ujianId/`                        |
| `AdminLogsView`     | GET      | `/laporan/log-pelanggaran/:ujianId/`              |
| `AdminScoreView`    | GET      | `/laporan/export/excel/:ujianId/`                 |
| `AdminScoreView`    | GET      | `/laporan/export/pdf/:sesiId/`                    |

---

## Alur Ujian Mahasiswa

```
Login → Dashboard (daftar ujian) → Exam (fullscreen + timer)
  ↓ auto-save jawaban tiap 1.5 detik (debounce)
  ↓ heartbeat tiap 15 detik
  ↓ proctoring: blur/tab/fullscreen → lapor pelanggaran → akun dikunci
  ↓ Submit (manual / waktu habis)
  → Result (polling AI grading setiap 5 detik)
  → Download PDF Transkrip
```
