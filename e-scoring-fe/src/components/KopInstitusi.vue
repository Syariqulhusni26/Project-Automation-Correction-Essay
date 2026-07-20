<template>

<div class="kop-institusi">

    <div class="kop-logo-wrap">
        <img
            src="/logo-pnl.png"
            class="kop-logo"
            alt="Logo"
        >
    </div>

    <div class="kop-teks">

        <p class="kop-nama-institusi">
            POLITEKNIK NEGERI LHOKSEUMAWE
        </p>

        <p class="kop-jurusan">
            JURUSAN TEKNOLOGI INFORMASI DAN KOMPUTER
        </p>

        <p class="kop-alamat">
            Jalan Banda Aceh–Medan Km.280, Buketrata, Lhokseumawe 24301 PO.BOX 90
        </p>

        <p class="kop-kontak">
            Telp/Fax. (0645) 42785 • Laman : www.pnl.ac.id
        </p>

    </div>

    <!-- penyeimbang -->
    <div></div>

</div>

<div class="kop-divider"></div>

</template>

<script setup>
</script>

<style scoped>

.kop-institusi{
    display:grid;
    grid-template-columns:95px 1fr 95px;
    align-items:center;

    width:100%;
    margin-bottom:8px;

    font-family:"Times New Roman",serif;
    color:#000;
}

.kop-logo-wrap{
    display:flex;
    justify-content:center;
    align-items:center;
}

.kop-logo{

    width:88px;
    height:88px;
    object-fit:contain;

}

.kop-teks{

    text-align:center;

}

.kop-nama-institusi{

    margin:0;

    font-size:19pt;

    font-weight:700;

    letter-spacing:.4px;

    line-height:1.15;

}

.kop-jurusan{

    margin-top:2px;

    font-size:14pt;

    font-weight:700;

    line-height:1.2;

}

.kop-alamat{

    margin-top:6px;

    font-size:10pt;

    line-height:1.35;

}

.kop-kontak{

    margin-top:2px;

    font-size:10pt;

    line-height:1.35;

}

.kop-divider{

    margin-top:10px;

    border-top:3px solid #000;

    position:relative;

}

.kop-divider::after{

    content:"";
    display:block;
    border-top:1px solid #000;
    margin-top:2px;

}

/* ===========================
   DETAIL JAWABAN
=========================== */

.soal{

    margin:18px 12px;
    padding:4px 4px 3px 12px;
    border-left:3px solid #c7c7c7;
    page-break-inside:avoid;
}

.soal-head{
    margin-bottom:8px;
    font-size:13pt;
    font-weight:bold;
}

.lbl{
    font-weight:bold;
    margin-top:10px;
    margin-bottom:4px;
}

.soal p{

    margin:0;

    padding:4px 4px 3px 3px;

    line-height:1.7;

    text-align:justify;

    /* Ini yang mencegah teks keluar halaman */
    overflow-wrap:break-word;
    word-wrap:break-word;
    word-break:break-word;
    white-space:pre-wrap;

}

@media print{

.kop-logo{

width:82px;
height:82px;

}

}

</style>
