export function formatKg(value) {
    if (value == null || Number.isNaN(Number(value))) {
        return '—';
    }
    return `${Number(value).toLocaleString('id-ID')} Kg`;
}

export function formatNumber(value) {
    if (value == null || Number.isNaN(Number(value))) {
        return '—';
    }
    return Number(value).toLocaleString('id-ID');
}

/** @returns {'naik' | 'turun' | 'stabil'} */
export function trendFromPercent(trendPercent) {
    if (trendPercent == null || Number.isNaN(Number(trendPercent))) {
        return 'stabil';
    }
    if (trendPercent > 8) return 'naik';
    if (trendPercent < -8) return 'turun';
    return 'stabil';
}

/** @returns {'naik' | 'turun' | 'stabil'} */
export function trendFromValues(current, previous) {
    if (current == null || previous == null || previous === 0) {
        return 'stabil';
    }
    const pct = ((current - previous) / previous) * 100;
    return trendFromPercent(pct);
}

export function trendLabel(direction) {
    if (direction === 'naik') return 'Naik';
    if (direction === 'turun') return 'Turun';
    return 'Stabil';
}

export function trendArrow(statsTrend) {
    if (statsTrend == null) return '—';
    if (statsTrend >= 0) return `↑ ${Number(Math.abs(statsTrend)).toLocaleString('id-ID')}%`;
    return `↓ ${Number(Math.abs(statsTrend)).toLocaleString('id-ID')}%`;
}

export function rekomendasiSingkat(direction) {
    if (direction === 'naik') return 'Tambah persediaan secara bertahap.';
    if (direction === 'turun') return 'Kurangi penambahan stok.';
    return 'Pertahankan jumlah persediaan.';
}

export function rekomendasiManajemen(direction) {
    if (direction === 'naik') {
        return 'Persediaan disarankan ditambah secara bertahap untuk mengantisipasi peningkatan permintaan.';
    }
    if (direction === 'turun') {
        return 'Penambahan stok perlu dikurangi agar tidak terjadi penumpukan persediaan.';
    }
    return 'Persediaan dapat dipertahankan mengikuti pola penjualan sebelumnya.';
}

export function buildLaporanRows(filterJenis, periodeFilter, chartPerJenis, baseData) {
    const types =
        filterJenis === 'Semua' ? Object.keys(chartPerJenis) : [filterJenis];

    const rows = [];

    types.forEach((jenis) => {
        const series = chartPerJenis[jenis] ?? [];
        const meta = baseData[jenis] ?? {};

        series.forEach((row, idx) => {
            if (!matchPeriodeFilter(row.periode, periodeFilter)) {
                return;
            }

            const prev = series[idx - 1];
            const currentVal = row.peramalan ?? row.aktual;
            const prevVal = prev ? (prev.peramalan ?? prev.aktual) : null;
            const direction = trendFromValues(currentVal, prevVal);
            const trendPct =
                currentVal != null && prevVal != null && prevVal !== 0
                    ? Math.round(((currentVal - prevVal) / prevVal) * 100)
                    : null;

            rows.push({
                periode: row.periode,
                jenisKopi: jenis,
                aktual: row.aktual,
                peramalan: row.peramalan,
                mape: meta.mape ?? null,
                trend: trendPct,
                trendDirection: direction,
                rekomendasi: rekomendasiSingkat(direction),
            });
        });
    });

    return rows.sort((a, b) => a.periode.localeCompare(b.periode) || a.jenisKopi.localeCompare(b.jenisKopi));
}

function matchPeriodeFilter(periode, filter) {
    if (filter === 'semua' || !filter) return true;
    const monthMap = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        Mei: 4,
        Jun: 5,
        Jul: 6,
        Agu: 7,
        Sep: 8,
        Okt: 9,
        Nov: 10,
        Des: 11,
    };
    const [mon, year] = periode.split(' ');
    const m = monthMap[mon];
    const y = Number(year);
    if (m === undefined || Number.isNaN(y)) return true;

    if (filter === '2026-q2') return y === 2026 && m >= 3 && m <= 5;
    if (filter === '2026-q3') return y === 2026 && m >= 6 && m <= 8;
    if (filter === '2026-q4') return y === 2026 && m >= 9 && m <= 10;

    return true;
}

export function exportRowsToCsv(rows) {
    const header = ['Periode', 'Jenis Kopi', 'Data Aktual', 'Hasil Peramalan', 'MAPE', 'Trend', 'Rekomendasi'];
    const lines = rows.map((r) => [
        r.periode,
        r.jenisKopi,
        r.aktual ?? '',
        r.peramalan ?? '',
        r.mape != null ? `${Number(r.mape).toLocaleString('id-ID')}%` : '',
        r.trend != null ? `${Number(r.trend).toLocaleString('id-ID')}%` : trendLabel(r.trendDirection),
        r.rekomendasi,
    ]);
    const csv = [header, ...lines]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-peramalan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
