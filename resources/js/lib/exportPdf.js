/**
 * exportLaporanPdf — PDF Laporan Resmi AGRORRA KOERINTJI
 *
 * Layout A4 Portrait:
 *  Halaman 1: Ringkasan Eksekutif (tanpa tabel rincian)
 *    - Kop: Logo (JPEG murni) + judul + meta
 *    - Bagian A: Prediksi Per Jenis Kopi & Kriteria MAPE
 *    - Bagian B: Rekomendasi Keputusan Bisnis (Narasi Komprehensif)
 *
 *  Halaman 2+: Tabel rincian per jenis kopi (page break antar jenis)
 *    - Tabel Arabica (3 kolom: Periode, Aktual, Peramalan)
 *    - Tabel Robusta
 *    - Tabel Asalan
 *
 *  Footer: Tanda tangan Manajer Operasional
 *
 * Dependensi: jspdf, jspdf-autotable
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palet Warna ─────────────────────────────────────────────────────────────
const C = {
    hijau:     [22, 163, 74],
    hijauMuda: [220, 252, 231],
    hitam:     [15, 23, 42],
    abu:       [71, 85, 105],
    abuMuda:   [248, 250, 252],
    putih:     [255, 255, 255],
    garis:     [203, 213, 225],
};

const PW = 210;            // page width
const ML = 15;             // margin left
const MR = 15;             // margin right
const CW = PW - ML - MR;   // content width
const MT = 14;             // margin top

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Muat gambar via fetch, ubah ke lingkaran sempurna (canvas clip) dengan latar putih,
 * lalu kembalikan sebagai JPEG Data URL.
 */
async function loadLogoAsCircleDataUrl(src) {
    const resp = await fetch(src);
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);
    
    const canvas = document.createElement('canvas');
    const size = Math.min(bitmap.width, bitmap.height);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Fill dengan warna putih murni agar sudutnya tidak hitam saat di-JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 2. Buat clipping path lingkaran sempurna
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 3. Gambar logo di dalam lingkaran tersebut
    // Pusatkan gambar jika aslinya bukan persegi
    const dx = (size - bitmap.width) / 2;
    const dy = (size - bitmap.height) / 2;
    ctx.drawImage(bitmap, dx, dy);

    return canvas.toDataURL('image/jpeg', 1.0);
}

function fmtTglPanjang() {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date());
}

function fmtTglSingkat() {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date());
}

function fmtNum(v) {
    if (v == null) return '—';
    return Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

function fmtKg(v) {
    if (v == null) return '—';
    return `${fmtNum(v)} Kg`;
}

function wrapText(doc, text, x, y, maxW, lh = 4.5) {
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines, x, y);
    return y + lines.length * lh;
}

/** Nomor halaman di footer setiap halaman (panggil sebelum save) */
function addPageNumbers(doc) {
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.abu);
        doc.text(
            `Halaman ${i} dari ${total}`,
            PW / 2,
            doc.internal.pageSize.height - 8,
            { align: 'center' },
        );
    }
}

// ── Fungsi Utama ────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}  opts.filterJenis
 * @param {string}  opts.periodeLabel
 * @param {string}  opts.statTotal
 * @param {string}  opts.statForecast
 * @param {string}  opts.statMape
 * @param {string}  opts.statTrend
 * @param {string}  opts.ringkasanTeks
 * @param {Array}   opts.laporanRows
 * @param {object}  opts.statsPerJenis  - { arabica: { nextForecast, mape, trend, rekomendasi, alpha, beta, gamma }, ... }
 */
export async function exportLaporanPdf({
    filterJenis,
    periodeLabel,
    statTotal,
    statForecast,
    statMape,
    statTrend,
    ringkasanTeks,
    laporanRows,
    statsPerJenis = {},
}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const tglPanjang = fmtTglPanjang();
    const tglSingkat = fmtTglSingkat();
    let y = MT;

    // ═══════════════════════════════════════════════════════════════════════
    // HALAMAN 1: RINGKASAN EKSEKUTIF
    // ═══════════════════════════════════════════════════════════════════════

    // ── Kop: Logo ──────────────────────────────────────────────────────────
    try {
        const logoDataUrl = await loadLogoAsCircleDataUrl('/Logo.jpeg');
        const lh = 22, lw = 22;
        const lx = (PW - lw) / 2;
        
        doc.addImage(logoDataUrl, 'JPEG', lx, y, lw, lh);
        
        // Jarak lega di bawah logo sebelum judul (margin-bottom ~ 12mm)
        y += lh + 12;
    } catch (_) {
        y += 10;
    }

    // ── Kop: Judul ─────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...C.hijau);
    doc.text('AGRORRA KOERINTJI', PW / 2, y, { align: 'center' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.abu);
    doc.text('Laporan Peramalan Persediaan Kopi', PW / 2, y, { align: 'center' });
    y += 6;

    // Garis pembatas
    doc.setDrawColor(...C.garis);
    doc.setLineWidth(0.5);
    doc.line(ML, y, PW - MR, y);
    y += 5;

    // ── Kop: Meta informasi ────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.abu);
    doc.text('Filter Jenis Kopi', ML, y);
    doc.text('Periode Laporan', PW / 2, y, { align: 'center' });
    doc.text('Tanggal Cetak', PW - MR, y, { align: 'right' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.hitam);
    doc.text(filterJenis, ML, y);
    doc.text(periodeLabel, PW / 2, y, { align: 'center' });
    doc.text(tglPanjang, PW - MR, y, { align: 'right' });
    y += 9;

    // ── Ringkasan Metrik (Total Penjualan, Prediksi, MAPE, Trend) ─────────
    // Sanitasi string Trend: hapus karakter unicode panah (↑↓) dan emoji yang
    // tidak dikenali font Helvetica di jsPDF, ganti dengan +/-
    const cleanTrend = String(statTrend)
        .replace(/[↑⬆▲🔼]/g, '+')
        .replace(/[↓⬇▼🔽]/g, '-')
        .replace(/[^\x20-\x7E%.,\d+\-—]/g, '')
        .trim();

    const boxAH = 20;
    doc.setFillColor(...C.hijauMuda);
    doc.setDrawColor(...C.hijau);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, boxAH, 2, 2, 'FD');

    const metrik = [
        { label: 'Total Penjualan',    val: statTotal },
        { label: 'Prediksi Bln Depan', val: statForecast },
        { label: 'Rata-rata Tingkat Error (MAPE)',     val: statMape },
        { label: 'Rata-rata Proyeksi Pertumbuhan (Trend)',    val: cleanTrend },
    ];
    const mcw = CW / 4;
    metrik.forEach((m, i) => {
        const mx = ML + i * mcw + mcw / 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.abu);
        doc.text(m.label, mx, y + 7, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...C.hitam);
        doc.text(String(m.val), mx, y + 13, { align: 'center' });
    });
    y += boxAH + 9;

    // ── Bagian A: Prediksi Per Jenis Kopi & Skala MAPE ─────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.hijau);
    doc.text('A. Prediksi Per Jenis Kopi (Bulan Depan)', ML, y);
    y += 4;

    const jenisKeys = ['arabica', 'robusta', 'asalan'];
    const jenisLabels = { arabica: 'Arabica', robusta: 'Robusta', asalan: 'Asalan' };

    // Dinamisasi: filter tabel prediksi sesuai master filter jenis kopi
    const activeKeys = filterJenis && filterJenis !== 'Semua'
        ? jenisKeys.filter(k => k === filterJenis.toLowerCase())
        : jenisKeys;

    const prediksiBody = activeKeys.map((k) => {
        const s = statsPerJenis[k] || {};
        return {
            jenis:    jenisLabels[k],
            prediksi: fmtKg(s.nextForecast),
            mape:     s.mape != null ? `${s.mape}%` : '—',
            // Gunakan karakter plus (+) atau minus (-) alih-alih panah unicode
            trend:    s.trend != null
                ? `${s.trend >= 0 ? '+' : '-'} ${Math.abs(s.trend)}%`
                : '—',
        };
    });

    // Tabel Prediksi (Dibuat lebar penuh / Full Width)
    autoTable(doc, {
        startY: y,
        columns: [
            { header: 'Jenis Kopi',          dataKey: 'jenis' },
            { header: 'Prediksi Bulan Depan', dataKey: 'prediksi' },
            { header: 'Tingkat Error (MAPE)',                 dataKey: 'mape' },
            { header: 'Proyeksi Pertumbuhan (Trend)',                dataKey: 'trend' },
        ],
        body: prediksiBody,
        margin: { left: ML, right: MR },
        headStyles: {
            fillColor: C.hijau, textColor: C.putih, fontStyle: 'bold',
            fontSize: 8.5, halign: 'center', cellPadding: 2.5,
        },
        bodyStyles: {
            fontSize: 8.5, textColor: C.hitam, cellPadding: 2.5,
            lineColor: C.garis, lineWidth: 0.1,
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: 40 },
            1: { halign: 'right' },
            2: { halign: 'center', cellWidth: 30 },
            3: { halign: 'center', cellWidth: 30 },
        },
        alternateRowStyles: { fillColor: C.abuMuda },
        tableLineColor: C.garis,
        tableLineWidth: 0.1,
    });

    y = doc.lastAutoTable.finalY + 5;
    
    // Tabel Legenda MAPE (Diletakkan di Bawah Tabel Prediksi, di tengah)
    const mapeLegendaBody = [
        { kriteria: '< 10%', evaluasi: 'Peramalan Sangat Akurat' },
        { kriteria: '10% - 20%', evaluasi: 'Peramalan Baik' },
        { kriteria: '20% - 50%', evaluasi: 'Peramalan Cukup' },
        { kriteria: '> 50%', evaluasi: 'Peramalan Tidak Akurat' },
    ];
    
    autoTable(doc, {
        startY: y,
        columns: [
            { header: 'Kriteria Evaluasi Tingkat Error (MAPE)', dataKey: 'kriteria' },
            { header: 'Status Akurasi', dataKey: 'evaluasi' },
        ],
        body: mapeLegendaBody,
        margin: { left: ML + 20, right: MR + 20 }, // Memberi margin kiri kanan agar tabel ada di tengah
        headStyles: {
            fillColor: C.abu, textColor: C.putih, fontStyle: 'bold',
            fontSize: 7.5, halign: 'center', cellPadding: 1.5,
        },
        bodyStyles: {
            fontSize: 7.5, textColor: C.hitam, cellPadding: 1.5,
            lineColor: C.garis, lineWidth: 0.1,
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 40 },
            1: { halign: 'left' },
        },
        alternateRowStyles: { fillColor: C.abuMuda },
        tableLineColor: C.garis,
        tableLineWidth: 0.1,
    });

    // Pindah kursor ke bawah tabel legenda
    y = doc.lastAutoTable.finalY + 9;

    // ── Bagian B: Rekomendasi Keputusan Bisnis ─────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.hijau);
    doc.text('B. Rekomendasi Keputusan Bisnis', ML, y);
    y += 5;

    // Build narasi komprehensif yang dinamis untuk ketiga kopi
    const getPred = (key) => fmtKg(statsPerJenis[key]?.nextForecast);
    let narasiKomprehensif = `Berdasarkan hasil pemrosesan model Holt-Winters untuk periode mendatang, seluruh varian kopi memerlukan penyesuaian stok. `;
    narasiKomprehensif += `Prediksi penjualan untuk bulan depan adalah Arabica sebanyak ${getPred('arabica')}, lalu Robusta sebesar ${getPred('robusta')}, dan Asalan mencapai ${getPred('asalan')}. `;
    
    // Tambahan logika prioritas ruang
    let highestForecast = { jenis: null, val: -1 };
    jenisKeys.forEach(k => {
        const val = statsPerJenis[k]?.nextForecast || -1;
        if (val > highestForecast.val) {
            highestForecast = { jenis: jenisLabels[k], val: val };
        }
    });

    if (highestForecast.jenis) {
        narasiKomprehensif += `Manajemen gudang sangat disarankan untuk memprioritaskan alokasi kapasitas ruang penyimpanan utama untuk kopi ${highestForecast.jenis}, mengingat volume permintaannya yang diproyeksikan paling tinggi. Langkah ini esensial untuk mencegah stockout yang dapat mengganggu rantai pasok perusahaan.`;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.hitam);
    
    // Print paragraf narasi
    y = wrapText(doc, narasiKomprehensif, ML + 2, y, CW - 4, 5);
    y += 6;

    // Bullet points dari backend
    doc.setFont('helvetica', 'bold');
    doc.text('Rincian Tindakan per Varian:', ML + 2, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    jenisKeys.forEach((k) => {
        const s = statsPerJenis[k] || {};
        const rek = s.rekomendasi || 'Data peramalan belum tersedia.';
        const bullet = `•  ${jenisLabels[k]}: ${rek}`;
        y = wrapText(doc, bullet, ML + 5, y, CW - 7, 4.5);
        y += 1.5;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // HALAMAN 2+: TABEL RINCIAN PER JENIS KOPI
    // ═══════════════════════════════════════════════════════════════════════

    const tabelCols = [
        { header: 'Periode',              dataKey: 'periode' },
        { header: 'Data Aktual (Kg)',      dataKey: 'aktual' },
        { header: 'Hasil Peramalan (Kg)', dataKey: 'peramalan' },
    ];

    jenisKeys.forEach((k) => {
        const label = jenisLabels[k];
        const rows = laporanRows
            .filter((r) => r.jenisKopi === label)
            .map((r) => ({
                periode:   r.periode ?? '—',
                aktual:    r.aktual != null ? fmtNum(r.aktual) : '—',
                peramalan: r.peramalan != null ? fmtNum(r.peramalan) : '—',
            }));

        if (rows.length === 0) return; // skip jenis tanpa data

        // Page break — setiap jenis kopi di halaman baru
        doc.addPage();
        let ty = MT;

        // Sub-header halaman
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...C.hijau);
        doc.text(`Rincian Data — ${label}`, ML, ty);
        ty += 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.abu);
        doc.text(`Filter: ${filterJenis}  |  Periode: ${periodeLabel}  |  Total baris: ${rows.length}`, ML, ty + 3);
        ty += 8;

        autoTable(doc, {
            startY: ty,
            columns: tabelCols,
            body: rows,
            margin: { left: ML, right: MR },
            headStyles: {
                fillColor: C.hijau, textColor: C.putih, fontStyle: 'bold',
                fontSize: 8, halign: 'center', cellPadding: 3,
            },
            bodyStyles: {
                fontSize: 7.5, textColor: C.hitam, cellPadding: 2.5,
                lineColor: C.garis, lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: C.abuMuda },
            columnStyles: {
                0: { cellWidth: 35, halign: 'center' },
                1: { halign: 'right' },
                2: { halign: 'right' },
            },
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // FOOTER TANDA TANGAN (halaman terakhir)
    // ═══════════════════════════════════════════════════════════════════════

    const pageH = doc.internal.pageSize.height;
    const lastTableY = doc.lastAutoTable?.finalY ?? MT;

    let sigY = lastTableY + 14;
    if (pageH - sigY < 52) {
        doc.addPage();
        sigY = MT + 10;
    }

    const sigW = 72;
    const sigX = PW - MR - sigW;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.hitam);

    // "Sungai Penuh, [tanggal]"
    doc.text(`Sungai Penuh, ${tglSingkat}`, sigX + sigW / 2, sigY, { align: 'center' });
    sigY += 5;

    // "Mengetahui,"
    doc.text('Mengetahui,', sigX + sigW / 2, sigY, { align: 'center' });
    sigY += 24; // ruang tanda tangan pena ~24mm

    // Garis tanda tangan
    doc.setDrawColor(...C.abu);
    doc.setLineWidth(0.3);
    doc.line(sigX + 5, sigY, sigX + sigW - 5, sigY);
    sigY += 5;

    // "Manajer Operasional"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Manajer Operasional', sigX + sigW / 2, sigY, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════════════
    // Nomor halaman di footer semua halaman, lalu simpan
    // ═══════════════════════════════════════════════════════════════════════
    addPageNumbers(doc);

    const fileName = `laporan-peramalan-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
}
