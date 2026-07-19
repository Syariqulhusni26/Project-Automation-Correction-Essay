import logoUrl from '../assets/logo-pnl.png'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// "Sabtu, 18 Juli 2026" dari datetime backend; kalau tidak bisa diparse, tampilkan apa adanya
function fmtHari(dt) {
  if (!dt) return null
  const d = new Date(dt)
  if (isNaN(d)) return String(dt)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtJam(dt) {
  if (!dt) return null
  const d = new Date(dt)
  if (isNaN(d)) return null
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Transkrip dibuat di sisi browser (jendela cetak → simpan sebagai PDF)
// karena endpoint PDF backend belum memuat kop surat kampus.
export function cetakTranskrip({ hasil, mahasiswa }) {
  // Toleransi beberapa kemungkinan nama field dari backend
  const mataKuliah =
    hasil.mata_kuliah_nama || hasil.mata_kuliah || hasil.ujian?.mata_kuliah_nama || null
  const judulUjian = hasil.ujian_judul || hasil.judul_ujian || hasil.ujian?.judul || null
  const waktuMulai = hasil.waktu_mulai || hasil.sesi?.waktu_mulai || null
  const waktuSelesai = hasil.waktu_selesai || hasil.sesi?.waktu_selesai || null

  const hari = fmtHari(waktuMulai) || '—'
  const jamMulai = fmtJam(waktuMulai)
  const jamSelesai = fmtJam(waktuSelesai)
  const jam = jamMulai ? `${jamMulai}${jamSelesai ? ' — ' + jamSelesai : ''} WIB` : '—'

  const detail = (hasil.jawaban ?? [])
    .map(
      (j) => `
      <div class="soal">
        <div class="soal-head"><strong>Soal ${j.nomor_soal}</strong> (Nilai: <strong>${j.nilai ?? '—'} / 10</strong>)</div>
        <p class="lbl">Pertanyaan:</p>
        <p>${esc(j.pertanyaan)}</p>
        <p class="lbl">Jawaban Mahasiswa:</p>
        <p>${esc(j.teks_jawaban) || '<i>(Tidak dijawab)</i>'}</p>
        <p class="lbl">Alasan Penilaian (AI):</p>
        <p>${esc(j.alasan_nilai) || '—'}</p>
      </div>`
    )
    .join('')

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Transkrip Nilai — ${esc(mahasiswa.nama)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; font-size: 12pt; }
  .kop { display: flex; align-items: center; gap: 14px; }
  .kop img { width: 84px; height: 84px; object-fit: contain; }
  .kop-teks { flex: 1; text-align: center; }
  .kop-teks .b0 { font-size: 11pt; }
  .kop-teks .b1 { font-size: 16pt; font-weight: bold; }
  .kop-teks .b2 { font-size: 12pt; font-weight: bold; }
  .kop-teks .b3 { font-size: 9pt; }
  .garis { border-bottom: 3px solid #000; margin-top: 8px; }
  .garis2 { border-bottom: 1px solid #000; margin-top: 2px; margin-bottom: 18px; }
  h2 { text-align: center; text-decoration: underline; font-size: 13pt; margin: 0 0 16px; }
  table.info { border-collapse: collapse; margin-bottom: 18px; }
  table.info td { padding: 2px 8px 2px 0; vertical-align: top; }
  table.info td:first-child { width: 130px; }
  table.info td:nth-child(2) { width: 12px; }
  .nilai-akhir { font-weight: bold; }
  h3 { font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 4px; }
  .soal { margin-bottom: 14px; page-break-inside: avoid; }
  .soal-head { margin-bottom: 4px; }
  .lbl { font-weight: bold; margin: 6px 0 0; }
  p { margin: 2px 0; }
</style>
</head>
<body>
  <div class="kop">
    <img src="${logoUrl}" alt="Logo PNL" />
    <div class="kop-teks">
      <div class="b0">KEMENTERIAN PENDIDIKAN TINGGI, SAINS DAN TEKNOLOGI</div>
      <div class="b1">POLITEKNIK NEGERI LHOKSEUMAWE</div>
      <div class="b2">JURUSAN TEKNOLOGI INFORMASI DAN KOMPUTER</div>
      <div class="b3">Jalan Banda Aceh-Medan Km. 280,3 Buketrata, Lhokseumawe, 24301 PO.BOX 90</div>
      <div class="b3">Telepon: (0645) 42670, 42785 Fax: 42785</div>
      <div class="b3">Laman: www.pnl.ac.id</div>
    </div>
  </div>
  <div class="garis"></div>
  <div class="garis2"></div>

  <h2>TRANSKRIP NILAI UJIAN ESAI</h2>

  <table class="info">
    <tr><td>Nama Mahasiswa</td><td>:</td><td><strong>${esc(mahasiswa.nama)}</strong></td></tr>
    <tr><td>NIM</td><td>:</td><td>${esc(mahasiswa.nim)}</td></tr>
    <tr><td>Kelas</td><td>:</td><td>${esc(mahasiswa.kelas) || '—'}</td></tr>
    <tr><td>Mata Kuliah</td><td>:</td><td>${esc(mataKuliah) || '—'}</td></tr>
    <tr><td>Judul Ujian</td><td>:</td><td>${esc(judulUjian) || '—'}</td></tr>
    <tr><td>Hari/Tanggal</td><td>:</td><td>${esc(hari)}</td></tr>
    <tr><td>Jam Ujian</td><td>:</td><td>${esc(jam)}</td></tr>
    <tr><td>NILAI AKHIR</td><td>:</td><td class="nilai-akhir">${hasil.total_nilai ?? '—'} / ${hasil.nilai_maksimal ?? '—'}</td></tr>
  </table>

  <h3>Detail Jawaban dan Penilaian</h3>
  ${detail}

  <script>
    window.onload = () => { window.focus(); window.print() }
  <\/script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return false // popup diblokir browser
  w.document.write(html)
  w.document.close()
  return true
}
