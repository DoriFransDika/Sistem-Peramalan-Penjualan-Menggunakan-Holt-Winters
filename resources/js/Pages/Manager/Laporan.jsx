import { Head, router } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import ManagerLayout from '@/Layouts/ManagerLayout';
import StatCard from '@/Components/StatCard';
import Filter from '@/Components/Filter';
import ThemeToggle from '@/Components/ThemeToggle';
import { exportLaporanPdf } from '@/lib/exportPdf';
import {
    exportRowsToCsv,
    formatKg,
    formatNumber,
    rekomendasiManajemen,
    trendArrow,
    trendFromPercent,
    trendLabel,
} from '@/lib/forecastDisplay';

function formatTanggalCetak() {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date());
}

export default function ManagerLaporan({
    filter: filterJenis = 'Semua',
    filterPeriode = 'semua',
    laporanRows = [],
    stats = null,
    statsPerJenis = {},
    filterOptions = ['Semua', 'Arabica', 'Robusta', 'Asalan'],
    periodeOptions = [{ value: 'semua', label: 'Semua periode' }],
}) {
    const isSemua = filterJenis === 'Semua';
    const trendDirection = trendFromPercent(stats?.trend);

    // ── Stat Card values — berlaku untuk Semua dan per-jenis ─────────────────
    const missing = isSemua ? (stats?.missingForecastTypes ?? []) : [];
    const hasPartialData = missing.length > 0;
    const missingWarning = hasPartialData
        ? `Belum diramalkan: ${missing.join(', ')}`
        : null;

    // --- UI/UX Master Filter States ---
    const [masterFilterJenis, setMasterFilterJenis] = useState(filterJenis || 'Semua');
    const [masterFilterTahun, setMasterFilterTahun] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 10;



    // Ekstrak Tahun Unik Secara Otomatis
    const availableYears = useMemo(() => {
        const years = new Set();
        laporanRows.forEach((row) => {
            // Ambil string tahun (4 digit, contoh: 2024, 2025) dari periode
            const match = String(row.periode || '').match(/\b(20\d{2})\b/);
            if (match) {
                years.add(match[1]);
            } else {
                const digits = String(row.periode || '').match(/\d{4}/);
                if (digits) years.add(digits[0]);
            }
        });
        return Array.from(years).sort((a, b) => a.localeCompare(b));
    }, [laporanRows]);

    const filteredRows = useMemo(() => {
        let rows = laporanRows;
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            rows = rows.filter((r) => {
                const per = String(r.periode || '').toLowerCase();
                const jen = String(r.jenisKopi || '').toLowerCase();
                return per.includes(q) || jen.includes(q);
            });
        }
        if (masterFilterJenis && masterFilterJenis !== 'Semua') {
            rows = rows.filter((r) => String(r.jenisKopi).toLowerCase() === String(masterFilterJenis).toLowerCase());
        }
        if (masterFilterTahun !== 'Semua') {
            rows = rows.filter((r) => String(r.periode).includes(masterFilterTahun));
        }
        return rows;
    }, [laporanRows, searchTerm, masterFilterJenis, masterFilterTahun]);

    const calcStats = useMemo(() => {
        if (!filteredRows.length) return { total: 0, forecast: 0, mape: null, trend: null };
        let sumAktual = 0, sumForecast = 0, sumMape = 0, sumTrend = 0;
        let countMape = 0, countTrend = 0;

        filteredRows.forEach(r => {
            if (r.aktual) sumAktual += Number(r.aktual);
            if (r.peramalan) sumForecast += Number(r.peramalan);
            if (r.mape != null) { sumMape += Number(r.mape); countMape++; }
            if (r.trend != null) { sumTrend += Number(r.trend); countTrend++; }
        });

        return {
            total: sumAktual,
            forecast: sumForecast,
            mape: countMape ? (sumMape / countMape).toFixed(2) : null,
            trend: countTrend ? (sumTrend / countTrend).toFixed(2) : null
        };
    }, [filteredRows]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const pagedRows = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return filteredRows.slice(start, start + ROWS_PER_PAGE);
    }, [filteredRows, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, masterFilterJenis, masterFilterTahun]);

    // Teks Rekomendasi Dinamis untuk Card Analisis
    const rekomendasiList = useMemo(() => {
        const rekPerJenis = {};
        laporanRows.forEach((row) => {
            if (row.rekomendasi) rekPerJenis[row.jenisKopi.toLowerCase()] = row.rekomendasi;
        });

        const targetJenis = masterFilterJenis && masterFilterJenis !== 'Semua' ? masterFilterJenis.toLowerCase() : null;
        let items = [];

        if (targetJenis) {
            const rek = rekPerJenis[targetJenis] || 'Data rekomendasi belum tersedia.';
            items.push({ jenis: masterFilterJenis || targetJenis, rek });
        } else {
            // Semua jenis
            ['Arabica', 'Robusta', 'Asalan'].forEach((j) => {
                const rek = rekPerJenis[j.toLowerCase()] || 'Data rekomendasi belum tersedia.';
                items.push({ jenis: j, rek });
            });
        }
        return items;
    }, [laporanRows, masterFilterJenis]);

    return (
        <ManagerLayout>
            <Head title="Laporan Manager" />

            <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 pr-2">
                    <h1 className="text-xl font-bold tracking-tight text-[#0B1220] dark:text-lg dark:font-semibold dark:text-slate-50">
                        Laporan Peramalan Persediaan Kopi
                    </h1>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-[#475569] dark:font-normal dark:text-slate-300/80">
                        Ringkasan hasil peramalan dari data_penjualan, hasil_peramalan, dan rincian_peramalan.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <ThemeToggle />
                </div>
            </div>

            <div className="print:hidden flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#D6DEE8] bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                        Filter Jenis Kopi
                    </span>
                    <select
                        value={masterFilterJenis}
                        onChange={(e) => setMasterFilterJenis(e.target.value)}
                        className="notranslate ml-2 rounded-md border border-[#D6DEE8] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#0F172A] outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        translate="no"
                    >
                        {filterOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-emerald-300/55 bg-[#FAFBFD]/95 px-3 py-1.5 text-xs text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:border-emerald-300/40 dark:bg-slate-950/60 dark:text-slate-200 dark:shadow-none">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900/90 dark:text-emerald-300/90">
                        Periode Laporan
                    </span>
                    <select
                        value={masterFilterTahun}
                        onChange={(e) => setMasterFilterTahun(e.target.value)}
                        className="ml-2 rounded-full border border-[#D6DEE8] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#0F172A] outline-none ring-1 ring-[#D6DEE8] focus:border-emerald-400 focus:ring-emerald-400/50 dark:border-transparent dark:bg-slate-900/80 dark:text-emerald-100 dark:ring-slate-700/70"
                    >
                        <option value="Semua">Semua periode</option>
                        {availableYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="print:hidden grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Penjualan"
                    value={formatKg(calcStats.total)}
                    caption={masterFilterJenis === 'Semua' ? 'Gabungan semua jenis' : <span className="notranslate" translate="no">{masterFilterJenis}</span>}
                />
                <StatCard
                    title="Prediksi"
                    value={formatKg(calcStats.forecast)}
                    caption={masterFilterJenis === 'Semua' ? 'Total volume gabungan' : <span className="notranslate" translate="no">{masterFilterJenis}</span>}
                    warning={isSemua && hasPartialData ? missingWarning : null}
                />
                <StatCard
                    title="Tingkat Error (MAPE)"
                    value={calcStats.mape != null ? `${Number(calcStats.mape).toLocaleString('id-ID')}%` : '—'}
                    caption={masterFilterJenis === 'Semua' ? 'Rata-rata akurasi model' : <span className="notranslate" translate="no">{masterFilterJenis}</span>}
                    warning={isSemua && hasPartialData ? missingWarning : null}
                />
                <StatCard
                    title="Proyeksi Pertumbuhan (Trend)"
                    value={calcStats.trend != null ? trendArrow(calcStats.trend) : '—'}
                    caption={masterFilterJenis === 'Semua' ? 'Rata-rata semua jenis' : <span className="notranslate" translate="no">{masterFilterJenis}</span>}
                    accent="emerald"
                    warning={isSemua && hasPartialData ? missingWarning : null}
                />
            </div>

            <div className="print:hidden flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() =>
                        exportLaporanPdf({
                            filterJenis: masterFilterJenis,
                            periodeLabel: masterFilterTahun === 'Semua' ? 'Semua periode' : masterFilterTahun,
                            statTotal: formatKg(calcStats.total),
                            statForecast: formatKg(calcStats.forecast),
                            statMape: calcStats.mape != null ? `${Number(calcStats.mape).toLocaleString('id-ID')}%` : '—',
                            statTrend: calcStats.trend != null ? trendArrow(calcStats.trend) : '—',
                            ringkasanTeks: '', // Not used anymore as it's dynamic
                            laporanRows: filteredRows,
                            statsPerJenis,
                        })
                    }
                    className="inline-flex items-center rounded-full border border-transparent bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_14px_rgba(5,120,85,0.28)] transition duration-200 hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950"
                >
                    Cetak Laporan PDF
                </button>
                <button
                    type="button"
                    onClick={() => exportRowsToCsv(laporanRows)}
                    className="inline-flex items-center rounded-full border border-[#D6DEE8] bg-[#FAFBFD] px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#334155] shadow-sm transition hover:border-emerald-300/70 hover:bg-white dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200"
                >
                    Export CSV
                </button>
            </div>

            <div
                id="laporan-print-area"
                className="rounded-2xl border border-[#D0DAE6] bg-[#FAFBFD] p-4 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/80 print:border-0 print:bg-white print:shadow-none print:text-black"
            >
                <div className="hidden print:block mb-4 border-b border-slate-300 pb-3">
                    <h2 className="text-lg font-bold text-slate-900">
                        Laporan Peramalan Persediaan Kopi
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        AGRORRA KOERINTJI — Monitoring Manager
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Dicetak: {formatTanggalCetak()}</p>
                </div>

                <div className="mb-4 rounded-xl border border-[#D6DEE8] bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50 print:border-slate-200 print:bg-slate-50">
                    <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 print:text-slate-900">
                        Analisis Keputusan Bisnis
                    </h3>
                    <div className="mt-2 text-xs leading-relaxed text-[#475569] dark:text-slate-300 print:text-slate-700">
                        <ul className="list-disc pl-5 space-y-1">
                            {rekomendasiList.map((item, idx) => (
                                <li key={idx}>
                                    <strong className="capitalize notranslate" translate="no">{item.jenis}</strong>: {item.rek}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <dl className="mt-4 grid gap-3 text-[11px] sm:grid-cols-2 items-end">
                        <div>
                            <dt className="font-medium text-[#64748B]">Jumlah baris tabel</dt>
                            <dd className="text-[#0F172A] dark:text-slate-200">{filteredRows.length}</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-[#64748B]">Tanggal cetak</dt>
                            <dd className="text-[#0F172A] dark:text-slate-200">{formatTanggalCetak()}</dd>
                        </div>
                    </dl>
                </div>

                {/* ── Toolbar: Search ───────────────── */}
                <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8] dark:text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari periode atau jenis kopi…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-full border border-[#D6DEE8] bg-white py-1.5 pl-8 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder-slate-500"
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] shadow-lg transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20 print:overflow-visible print:border-slate-300 print:shadow-none print:rounded-none">
                    <div className="flex items-center justify-between border-b border-[#D6DEE8] px-4 py-3 dark:border-slate-800 print:hidden">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300/90">
                            Data Rincian Laporan
                        </h3>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                            {filteredRows.length.toLocaleString('id-ID')} baris
                        </p>
                    </div>

                    <div className="max-h-[min(60vh,520px)] overflow-auto print:max-h-none print:overflow-visible">
                        <table className="min-w-full divide-y divide-[#D6DEE8] text-[11px] dark:divide-slate-800">
                            <thead className="sticky top-0 z-10 bg-white/95 text-[#64748B] backdrop-blur dark:bg-slate-900/95 dark:text-slate-300 print:bg-slate-100 print:text-black">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">Periode</th>
                                    <th className="px-3 py-2 text-left font-medium">Jenis Kopi</th>
                                    <th className="px-3 py-2 text-right font-medium">Data Aktual</th>
                                    <th className="px-3 py-2 text-right font-medium">Hasil Peramalan</th>
                                    <th className="px-3 py-2 text-right font-medium">Tingkat Error (MAPE)</th>
                                    <th className="px-3 py-2 text-right font-medium">Proyeksi Pertumbuhan (Trend)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D6DEE8] dark:divide-slate-800 print:bg-white print:text-black">
                                {pagedRows.length > 0 ? (
                                    pagedRows.map((row) => (
                                        <tr
                                            key={`${row.periode}-${row.jenisKopi}`}
                                            className="transition-colors hover:bg-[#EEF2F7]/80 dark:hover:bg-slate-900/50"
                                        >
                                            <td className="whitespace-nowrap px-3 py-2 text-[#334155] dark:text-slate-200 print:text-black">
                                                {row.periode}
                                            </td>
                                            <td className="px-3 py-2 capitalize notranslate text-[#334155] dark:text-slate-200 print:text-black" translate="no">
                                                {row.jenisKopi}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right text-[#0F172A] dark:text-slate-100 print:text-black">
                                                {row.aktual != null ? formatNumber(row.aktual) : '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right text-[#0F172A] dark:text-slate-100 print:text-black">
                                                {row.peramalan != null ? formatNumber(row.peramalan) : '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right text-[#475569] dark:text-slate-300 print:text-black">
                                                {row.mape != null ? `${Number(row.mape).toLocaleString('id-ID')}%` : '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-right text-[#475569] dark:text-slate-300 print:text-black">
                                                {row.trend != null
                                                    ? `${row.trend > 0 ? '+' : ''}${Number(row.trend).toLocaleString('id-ID')}%`
                                                    : trendLabel(row.trendDirection)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-3 py-10 text-center text-sm text-[#64748B] dark:text-slate-500"
                                        >
                                            Tidak ada data untuk filter yang dipilih.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Footer Tabel: Pagination ────────────────── */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex-1"></div>
                    {/* Paginasi lokal (kanan) */}
                    {filteredRows.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                                Hal.{' '}
                                <strong className="text-[#0F172A] dark:text-slate-100">{currentPage}</strong>
                                {' / '}
                                <strong className="text-[#0F172A] dark:text-slate-100">{totalPages}</strong>
                                <span className="ml-1.5 text-[10px]">({filteredRows.length} baris)</span>
                            </span>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="rounded-full border border-[#D6DEE8] bg-white px-3 py-1 text-[11px] font-medium text-[#334155] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    ← Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="rounded-full border border-[#D6DEE8] bg-white px-3 py-1 text-[11px] font-medium text-[#334155] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ManagerLayout>
    );
}
