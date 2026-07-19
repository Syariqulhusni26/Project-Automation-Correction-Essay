<template>
  <div class="kop-institusi">
    <div class="kop-logo-wrap">
      <img
        src="/logo-pnl-lhoksumawe-aceh.png"
        alt="Logo Politeknik Negeri Lhokseumawe"
        class="kop-logo"
      />
    </div>
    <div class="kop-teks">
      <p class="kop-nama-institusi">POLITEKNIK NEGERI LHOKSEUMAWE</p>
      <p class="kop-jurusan">JURUSAN TEKNOLOGI INFORMASI DAN KOMPUTER</p>
      <p class="kop-alamat">Jalan Banda Aceh-Medan Km. 280, Buketrata – Lhokseumawe 24301 PO.BOX 90</p>
      <p class="kop-kontak">Telp/Fax. (0645) 42785 &nbsp;·&nbsp; Laman : www.pnl.ac.id</p>
    </div>
  </div>
  <div class="kop-divider"></div>
</template>

<script setup>
</script>

<style scoped>
/* ── Font Times New Roman untuk kop ── */
.kop-institusi,
.kop-nama-institusi,
.kop-jurusan,
.kop-alamat,
.kop-kontak {
  font-family: 'Times New Roman', Times, serif;
  color: #000; /* Selalu hitam untuk PDF */
}

/* ── Kop Institusi ── */
.kop-institusi {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  padding-bottom: 0.5rem;
}

.kop-logo-wrap {
  flex-shrink: 0;
}

.kop-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.kop-teks {
  text-align: center;
}

.kop-nama-institusi {
  font-size: 14pt;
  font-weight: 700;
  line-height: 1.4;
  margin: 0;
  letter-spacing: 0.02em;
}

.kop-jurusan {
  font-size: 12pt;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}

.kop-alamat,
.kop-kontak {
  font-size: 10pt;
  line-height: 1.5;
  margin: 0;
}

.kop-divider {
  border: none;
  border-top: 3px double #000; /* Divider ganda tebal untuk kesan resmi */
  margin: 0.25rem 0 1rem 0;
}
</style>
