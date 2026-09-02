import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import ThemeToggle from '@/Components/ThemeToggle';
import ForecastChart from '@/Components/Chart';
import RekomendasiCard from '@/Components/RekomendasiCard';
import ForecastingTerminal from '@/pages/Admin/ForecastingTerminal';
import axios from 'axios';

// ─── Konstanta ─────────────────────────────────────────────────────────────
const REQUIRED_MIN_DATA = 24;
const EMPTY_ARRAY = [];

// ─── Helper Fungsi ──────────────────────────────────────────────────────────
function formatPeriod(value) {
    if (!value) return '-';
    try {
        const d = new Date(`${value}T12:00:00`);
        if (Number.isNaN(d.getTime())) return String(value);
        return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(d);
    } catch {
        return String(value);
    }
}

function mapeTierLabel(mape) {
    if (mape == null || !Number.isFinite(mape)) return { label: '—', tone: 'slate' };
    if (mape < 8)  return { label: 'Sangat Baik', tone: 'emerald' };
    if (mape < 15) return { label: 'Baik',        tone: 'emerald' };
    if (mape < 25) return { label: 'Cukup',       tone: 'amber' };
    return { label: 'Perlu Perbaikan', tone: 'rose' };
}

function statusAkurasiFromMape(mape) {
    if (mape == null || !Number.isFinite(mape)) return 'cukup';
    if (mape < 8)  return 'sangat_baik';
    if (mape < 15) return 'baik';
    if (mape < 25) return 'cukup';
    return 'buruk';
}

function calcTrendPercent(values) {
    if (!values?.length || values.length < 2) return null;
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    if (!prev || prev <= 0) return null;
    return Number((((last - prev) / prev) * 100).toFixed(2));
}

function statusTrendFromPercent(trend) {
    if (trend == null || !Number.isFinite(trend)) return 'stabil';
    if (trend > 8)  return 'naik';
    if (trend < -8) return 'turun';
    return 'stabil';
}

function rekomendasiFromTrend(statusTrend) {
    if (statusTrend === 'naik')  return 'Persediaan disarankan ditambah secara bertahap untuk mengantisipasi peningkatan permintaan.';
    if (statusTrend === 'turun') return 'Penambahan stok perlu dikurangi agar tidak terjadi penumpukan persediaan.';
    return 'Persediaan dapat dipertahankan mengikuti pola penjualan sebelumnya.';
}

// ─── buildChartWindow: kembalikan SEMUA baris (Time Range filter ada di Chart.jsx) ─────
/**
 * Mengembalikan seluruh baris chart tanpa dipotong.
 * Pemotongan berdasarkan rentang waktu dilakukan oleh komponen ForecastChart.
 * @param {Array} allRows
 * @returns {Array}
 */
function buildChartWindow(allRows) {
    return allRows ?? [];
}

// ─── Komponen Toast Pop-up Sukses ────────────────────────────────────────────
function SuccessToast({ show, message, onClose }) {
    // Simpan onClose di ref agar useEffect tidak bergantung pada identitas fungsi
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => onCloseRef.current(), 4500);
        return () => clearTimeout(t);
    }, [show]); // ← hanya [show], bukan [show, onClose] agar tidak loop

    if (!show) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-white px-5 py-4 shadow-2xl shadow-emerald-900/10 dark:border-emerald-500/30 dark:bg-slate-900"
            style={{ animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
            <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}`}</style>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Berhasil Disimpan!</p>
                <p className="mt-0.5 text-xs text-[#475569] dark:text-slate-400">{message}</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 text-[#94A3B8] transition hover:text-rose-500 dark:hover:text-rose-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// ─── Komponen Badge Tone ────────────────────────────────────────────────────
function ToneBadge({ tone, label }) {
    const cls = {
        emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
        amber:   'bg-amber-100 text-amber-800 ring-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
        rose:    'bg-rose-100 text-rose-700 ring-rose-400/40 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
        slate:   'bg-slate-100 text-slate-600 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/30',
    }[tone] ?? 'bg-slate-100 text-slate-600 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-400';

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
            {label}
        </span>
    );
}

// ─── Sub-komponen Tab Data Asli ─────────────────────────────────────────────
function TabDataAsli({ jenisKopi, modelingSeries, filters, flash, initialDashboardData }) {
    // ── Filter & Data ──
    const [jenisKopiId, setJenisKopiId] = useState(filters?.jenis_kopi_id ?? (jenisKopi[0]?.id ?? ''));

    const dataCount = useMemo(() => modelingSeries.length, [modelingSeries]);
    const isDataCukup = dataCount >= REQUIRED_MIN_DATA;

    // ── State Parameter ──
    const [alpha, setAlpha] = useState(0.35);
    const [beta,  setBeta]  = useState(0.12);
    const [gamma, setGamma] = useState(0.28);

    // ── State UI ──
    const [isLoading,         setIsLoading]         = useState(false);
    const [isSaving,          setIsSaving]          = useState(false);
    const [errorMsg,          setErrorMsg]          = useState('');
    const [showToast,         setShowToast]         = useState(false);
    const [forecastResult,    setForecastResult]    = useState(null); // data hasil API mentah
    const [chartData,         setChartData]         = useState(initialDashboardData?.chartData ?? []);
    const [chartMode,         setChartMode]         = useState(initialDashboardData?.chartMode ?? 'single'); // 'single' | 'multi'
    const [rekomendasi,       setRekomendasi]       = useState(initialDashboardData?.rekomendasi ?? ''); // teks rekomendasi bisnis DSS
    const [metrics,           setMetrics]           = useState(null); // { mape, trendPersen, statusTrend }
    const [showForecastTerminal, setShowForecastTerminal] = useState(false);

    // ── Derived: nama jenis kopi aktif ──
    const activeJenisNama = useMemo(() => {
        const found = jenisKopi.find(jk => jk.id === jenisKopiId);
        return found?.nama_jenis ?? jenisKopiId;
    }, [jenisKopi, jenisKopiId]);

    // ── Ganti Jenis Kopi → navigasi Inertia ──
    const handleJenisChange = (val) => {
        setJenisKopiId(val);
        setForecastResult(null);
        setChartData([]);
        setMetrics(null);
        setErrorMsg('');
        router.get(
            window.location.pathname,
            { jenis_kopi_id: val },
            { preserveState: true, preserveScroll: true },
        );
    };

    // ── Proses hasil API → state (single jenis kopi) — Unified Timeline ──
    const processApiResult = useCallback((activeResult) => {
        if (!activeResult || activeResult.status !== 'success') return;

        // Backend sudah merakit Unified Timeline.
        // Key per baris: { tanggal, aktual, forecast }
        // Chart.jsx membaca: xDataKey="tanggal", actualKey="aktual", forecastKey="forecast"
        setChartMode('single');
        setChartData(activeResult.chart_data ?? []);
        setRekomendasi(activeResult.rekomendasi_bisnis ?? '');

        // Hitung metrik dari chart_data
        const aktualRows   = (activeResult.chart_data ?? []).filter((r) => r.aktual !== null && r.aktual !== undefined);
        const aktualValues = aktualRows.map((r) => r.aktual);
        const trendPersen  = calcTrendPercent(aktualValues);
        const statusTrend  = statusTrendFromPercent(trendPersen);
        // Baris forecast untuk tabel: baris di mana aktual===null
        const forecastRows = (activeResult.chart_data ?? [])
            .filter((r) => r.aktual === null || r.aktual === undefined)
            .map((r) => ({ tanggal: r.tanggal, sort_date: r.sort_date, quantity: r.forecast }));

        setMetrics({
            mape:          activeResult.mape_testing,
            trendPersen,
            statusTrend,
            forecast6:     forecastRows,
            aktualPeriods: aktualRows.map((r) => r.sort_date),
            paramDipakai:  activeResult.parameter_digunakan,
            periodeAwal:          activeResult.periode_awal,
            periodeAkhirAktual:   activeResult.periode_akhir_aktual,
            periodeAkhirForecast: activeResult.periode_akhir_forecast,
        });

        setAlpha(activeResult.parameter_digunakan?.alpha ?? 0.2);
        setBeta(activeResult.parameter_digunakan?.beta   ?? 0.1);
        setGamma(activeResult.parameter_digunakan?.gamma ?? 0.2);
    }, []);

    // ── Proses hasil API multi (filter Semua) → state ──
    const processMultiResult = useCallback((activeResult) => {
        if (!activeResult || activeResult.status !== 'success') return;

        setChartMode('multi');
        setChartData(activeResult.chart_data ?? []);
        setRekomendasi(activeResult.rekomendasi_bisnis ?? '');

        const param = activeResult.parameter_digunakan;
        setMetrics({
            mape:         activeResult.mape_testing,
            trendPersen:  null,
            statusTrend:  'stabil',
            forecast6:    [],
            aktualPeriods: [],
            paramDipakai: param,
        });
        if (param) {
            setAlpha(param.alpha ?? 0.2);
            setBeta(param.beta   ?? 0.1);
            setGamma(param.gamma ?? 0.2);
        }
    }, []);

    // ── Panggil API (otomatis / manual) ──
    const callApi = useCallback(async (mode, alphaVal, betaVal, gammaVal) => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const payload = {
                mode,
                jenis_kopi_id: jenisKopiId,
                alpha: mode === 'manual' ? alphaVal : null,
                beta:  mode === 'manual' ? betaVal  : null,
                gamma: mode === 'manual' ? gammaVal : null,
            };
            const res = await axios.post(route('admin.forecast.generate'), payload);
            const results = res.data.requests ?? res.data;

            // Cek apakah ini mode Semua (jenisKopiId === '' atau ada >1 result)
            const jkNama = jenisKopi.find((jk) => jk.id === jenisKopiId)?.nama_jenis?.toLowerCase() ?? '';
            const isSemua = jkNama === 'semua' || (Array.isArray(results) && results.length > 1);

            if (isSemua) {
                // Multi-series: proses semua hasil sekaligus
                if (Array.isArray(results) && results.some((r) => r.status === 'success')) {
                    const combinedResult = Array.isArray(results) ? results.find(r => r.jenis_kopi?.toLowerCase() === 'semua') ?? results[0] : results;
                    setForecastResult(combinedResult);
                    processMultiResult(combinedResult);
                } else {
                    const errMsg = Array.isArray(results)
                        ? (results[0]?.pesan ?? 'Terjadi kesalahan pada peramalan.')
                        : 'Terjadi kesalahan pada peramalan.';
                    setErrorMsg(errMsg);
                }
                return results;
            }

            // Single jenis kopi
            const active = Array.isArray(results) 
                ? (results.find((r) => r.jenis_kopi?.toLowerCase() === jkNama) ?? results[0])
                : results;
            
            if (active?.status === 'error') {
                setErrorMsg(active.pesan ?? 'Terjadi kesalahan pada peramalan.');
                return null;
            }
            setForecastResult(active);
            processApiResult(active);
            return active;
        } catch (err) {
            setErrorMsg(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal menghubungi server.');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [jenisKopiId, jenisKopi, processApiResult, processMultiResult]);

    // ── Tombol Peramalan Otomatis ──
    const handleRunOtomatis = () => callApi('otomatis', alpha, beta, gamma);

    // ── Tombol Hitung Ulang Manual ──
    const handleRunManual = () => callApi('manual', alpha, beta, gamma);

    // ── Tombol Simpan ──
    const handleSimpan = useCallback(() => {
        if (!forecastResult || !metrics) return;
        setIsSaving(true);

        // Ekstrak semua baris forecast (overlap 3 bln + 6 bln ke depan)
        const forecastRows = (forecastResult.chart_data ?? [])
            .filter((r) => r.forecast !== null && r.forecast !== undefined)
            .map((r) => ({
                periode:         r.sort_date,
                nilai_peramalan: r.forecast,
            }));
        const apiPeriods = metrics.aktualPeriods ?? [];

        router.post(
            route('admin.forecast.results.store'),
            {
                jenis_kopi_id:              jenisKopiId,
                metode_parameter:           'otomatis',
                alpha:                      Number((metrics.paramDipakai?.alpha ?? 0).toFixed(4)),
                beta:                       Number((metrics.paramDipakai?.beta  ?? 0).toFixed(4)),
                gamma:                      Number((metrics.paramDipakai?.gamma ?? 0).toFixed(4)),
                mape:                       Number((metrics.mape ?? 0).toFixed(2)),
                trend_persen:               metrics.trendPersen,
                status_akurasi:             statusAkurasiFromMape(metrics.mape),
                status_trend:               metrics.statusTrend,
                rekomendasi_tindakan:       rekomendasiFromTrend(metrics.statusTrend),
                periode_data_terakhir:      apiPeriods[apiPeriods.length - 1] ?? null,
                periode_awal_grafik:        apiPeriods[0] ?? null,
                periode_akhir_grafik:       apiPeriods[apiPeriods.length - 1] ?? null,
                periode_awal_prediksi:      forecastRows[0]?.periode ?? null,
                periode_akhir_prediksi:     forecastRows[forecastRows.length - 1]?.periode ?? null,
                jumlah_bulan_aktual_grafik: apiPeriods.length,
                jumlah_bulan_prediksi:      forecastRows.length,
                rincian:                    forecastRows,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowToast(true);
                    setIsSaving(false);
                },
                onError: (errors) => {
                    console.error('Save forecast failed. Validation errors:', errors);
                    setErrorMsg('Gagal menyimpan hasil peramalan.');
                    setIsSaving(false);
                },
            },
        );
    }, [forecastResult, metrics, jenisKopiId, chartMode]);

    // ── Derived UI ──
    const tier      = mapeTierLabel(metrics?.mape);
    const accScore  = metrics?.mape != null ? Math.max(0, Math.min(100, 100 - metrics.mape)).toFixed(0) : null;

    const cardCls = 'rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-5 shadow-md transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/55 dark:shadow-lg dark:shadow-black/25 dark:backdrop-blur-sm';

    return (
        <>
        <SuccessToast
            show={showToast}
            message="Hasil peramalan dan rincian prediksi telah disimpan ke database."
            onClose={() => setShowToast(false)}
        />
        <div className="space-y-5">
            {/* Flash & Error Banners */}
            {flash?.success && (
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-100">
                    {flash.success}
                </div>
            )}

            {errorMsg && (
                <div className="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
                    {errorMsg}
                </div>
            )}

            {/* ── 1. Filter & Validasi ── */}
            <div className={cardCls}>
                <h2 className="mb-3 text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                    Filter Jenis Kopi
                </h2>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    {/* Dropdown */}
                    <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-[#475569] dark:text-slate-400">
                            Pilih Jenis Kopi
                        </label>
                        {jenisKopi.length > 0 ? (
                            <select
                                value={jenisKopiId}
                                onChange={(e) => handleJenisChange(e.target.value)}
                                className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-emerald-500"
                            >
                                {jenisKopi.map((jk) => (
                                    <option key={jk.id} value={jk.id}>
                                        {jk.nama_jenis}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Belum ada jenis kopi aktif di sistem.
                            </p>
                        )}
                    </div>

                    {/* Badge jumlah data */}
                    <div className="shrink-0 text-right">
                        <p className="text-xs text-[#64748B] dark:text-slate-400">Total Data Historis</p>
                        <p className={`text-2xl font-bold tabular-nums ${isDataCukup ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {dataCount}
                            <span className="ml-1 text-sm font-normal text-[#64748B] dark:text-slate-400">bulan</span>
                        </p>
                    </div>
                </div>

                {/* Peringatan data tidak cukup */}
                {!isDataCukup && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                        <span className="mt-0.5 text-rose-500 dark:text-rose-400">⚠</span>
                        <span>
                            Data tidak mencukupi.{' '}
                            <strong>Minimal {REQUIRED_MIN_DATA} bulan</strong> data historis diperlukan untuk peramalan.
                            Saat ini tersedia <strong>{dataCount} bulan</strong>.
                        </span>
                    </div>
                )}
            </div>

            {/* ── 2. Tombol Jalankan Peramalan ── */}
            <div className={`${cardCls} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div>
                    <p className="text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                        Jalankan Peramalan
                    </p>
                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                        Parameter optimal (α, β, γ) dicari otomatis via grid search
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Tombol Jalankan Peramalan (Otomatis & Real-Time) */}
                    <button
                        type="button"
                        onClick={() => setShowForecastTerminal(true)}
                        disabled={!isDataCukup || isLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                        </svg>
                        Jalankan Peramalan
                    </button>
                </div>
            </div>

            {/* ── Modal Forecasting Terminal (Real-Time Pipeline) ── */}
            {showForecastTerminal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-[95%] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#161b22] p-4 sm:p-5 shadow-2xl">
                        {/* Terminal Header */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                                </div>
                                <span className="ml-2 text-xs font-semibold text-slate-300">
                                    Forecasting Pipeline — Real-Time
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowForecastTerminal(false)}
                                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <ForecastingTerminal
                            modelingSeries={modelingSeries}
                            jenisKopiId={jenisKopiId}
                            jenisKopiNama={activeJenisNama}
                            mode={'otomatis'}
                            alpha={alpha}
                            beta={beta}
                            gamma={gamma}
                            onCancel={() => setShowForecastTerminal(false)}
                            onComplete={(result) => {
                                setShowForecastTerminal(false);
                                if (result) {
                                    setForecastResult(result);
                                    processApiResult(result);
                                }
                                setShowToast(true);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── 3. Area Hasil (tampil jika forecastResult ada) ── */}
            {forecastResult && (
                <div className="space-y-5">
                    {/* Grafik */}
                    <div className="h-[420px] w-full">
                        <ForecastChart
                            data={chartData}
                            mode={chartMode}
                            xDataKey="tanggal"
                            actualKey="aktual"
                            forecastKey="forecast"
                            subtitle={chartMode === 'multi'
                                ? 'Arabica · Robusta · Asalan — Solid = Aktual, Putus-putus = Forecast'
                                : 'Hijau solid = Aktual · Kuning putus = In-Sample Overlap (3 bln) + Forecast 6 bln'}
                            chartBodyClassName="h-[340px] w-full min-w-0"
                        />
                    </div>

                    {/* ── Kartu Rekomendasi Bisnis DSS ── */}
                    {(isLoading || rekomendasi) && (
                        <RekomendasiCard teks={rekomendasi} isLoading={isLoading} />
                    )}

                    {/* ── Panel bawah: Parameter + Evaluasi ── */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Parameter Hybrid */}
                        <div className={cardCls}>
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                                        Parameter Model
                                    </h3>
                                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                                        Ubah nilai lalu klik "Hitung Ulang"
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Alpha (α)', val: alpha, set: setAlpha },
                                    { label: 'Beta (β)',  val: beta,  set: setBeta  },
                                    { label: 'Gamma (γ)', val: gamma, set: setGamma },
                                ].map((row) => (
                                    <div key={row.label}>
                                        <label className="mb-1 block text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                                            {row.label}
                                        </label>
                                        <input
                                            type="number"
                                            min={0.01}
                                            max={0.99}
                                            step={0.01}
                                            value={row.val}
                                            onChange={(e) => row.set(Math.min(0.99, Math.max(0.01, Number(e.target.value))))}
                                            className="w-full rounded-lg border border-[#D6DEE8] bg-white px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums text-[#0F172A] shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleRunManual}
                                disabled={isLoading}
                                className="mt-4 w-full rounded-xl border border-emerald-400/50 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-500/40 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700"
                            >
                                {isLoading ? 'Menghitung...' : '↺  Hitung Ulang (Manual)'}
                            </button>
                        </div>

                        {/* Info Evaluasi */}
                        <div className={cardCls}>
                            <h3 className="mb-3 text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                                Evaluasi Model
                            </h3>

                            <div className="space-y-3">
                                {/* MAPE */}
                                <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#D6DEE8] dark:bg-slate-800/60 dark:ring-slate-700">
                                    <div>
                                        <p className="text-xs text-[#64748B] dark:text-slate-400">MAPE</p>
                                        <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-white">
                                            {metrics?.mape != null ? `${Number(metrics.mape.toFixed(2)).toLocaleString('id-ID')}%` : '—'}
                                        </p>
                                    </div>
                                    <ToneBadge tone={tier.tone} label={tier.label} />
                                </div>

                                {/* Skor Akurasi */}
                                {accScore != null && (
                                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#D6DEE8] dark:bg-slate-800/60 dark:ring-slate-700">
                                        <p className="text-xs text-[#64748B] dark:text-slate-400">Skor Akurasi</p>
                                        <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                            {accScore} / 100
                                        </p>
                                    </div>
                                )}

                                {/* Trend */}
                                {metrics?.trendPersen != null && (
                                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#D6DEE8] dark:bg-slate-800/60 dark:ring-slate-700">
                                        <p className="text-xs text-[#64748B] dark:text-slate-400">Trend Penjualan</p>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold tabular-nums ${metrics.trendPersen > 0 ? 'text-emerald-600 dark:text-emerald-400' : metrics.trendPersen < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {metrics.trendPersen > 0 ? '+' : ''}{Number(metrics.trendPersen).toLocaleString('id-ID')}%
                                            </p>
                                            <p className="text-[11px] capitalize text-[#64748B] dark:text-slate-400">
                                                {metrics.statusTrend}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabel Forecast 6 Bulan */}
                    {metrics?.forecast6?.length > 0 && (
                        <div className={cardCls}>
                            <h3 className="mb-3 text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                                Prediksi 6 Bulan ke Depan
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-[#D6DEE8] dark:border-slate-700/60">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#F1F5F9] text-xs font-semibold uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Periode</th>
                                            <th className="px-4 py-3 text-right">Prediksi (kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E9EFF6] dark:divide-slate-800">
                                        {metrics.forecast6.map((row) => (
                                            <tr key={row.sort_date} className="bg-white transition hover:bg-emerald-50/40 dark:bg-slate-900/40 dark:hover:bg-emerald-900/10">
                                                <td className="px-4 py-2.5 font-medium text-[#1E293B] dark:text-slate-200">
                                                    {formatPeriod(row.sort_date)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-[#0F172A] dark:text-white">
                                                    {row.quantity.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 4. Tombol Simpan ── */}
                    <div className={`${cardCls} flex items-center justify-between gap-4`}>
                        <div>
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-slate-200">Simpan Hasil</p>
                            <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                                Parameter, MAPE, dan rincian prediksi akan disimpan ke database
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleSimpan}
                            disabled={isSaving || isLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    Simpan Hasil Peramalan
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

// ─── Sub-komponen Tab Uji Peramalan ────────────────────────────────────────
const LOADING_TEXTS = [
    'Membaca file CSV...',
    'Membersihkan data...',
    'Mendeteksi anomali...',
    'Mengagregasi per bulan...',
    'Menyiapkan preview...',
];

function TabUjiPeramalan() {
    // ── State: Fase upload ──
    const [dragActive,    setDragActive]    = useState(false);
    const [isUploading,   setIsUploading]   = useState(false);
    const [loadingText,   setLoadingText]   = useState(LOADING_TEXTS[0]);
    const [uploadError,   setUploadError]   = useState('');
    const [csvFileName,   setCsvFileName]   = useState('');
    const fileInputRef = useRef(null);

    // ── State: Fase hasil preprocess ──
    const [previewRows,   setPreviewRows]   = useState(null); // array dari data_tabel FastAPI
    const [anomaliData,   setAnomaliData]   = useState(null); // anomali_terdeteksi
    const [jenisOpsi,     setJenisOpsi]     = useState([]);   // ['arabica','robusta','asalan'] yang ada di CSV
    const [selectedJenis, setSelectedJenis] = useState('');

    // ── State: Fase hasil forecast ──
    const [isForecasting,  setIsForecasting]  = useState(false);
    const [forecastError,  setForecastError]  = useState('');
    const [forecastResult, setForecastResult] = useState(null);
    const [chartData,      setChartData]      = useState([]);
    const [chartMode,      setChartMode]      = useState('single');
    const [rekomendasi,    setRekomendasi]    = useState('');
    const [metrics,        setMetrics]        = useState(null);
    const [alpha,          setAlpha]          = useState(0.35);
    const [beta,           setBeta]           = useState(0.12);
    const [gamma,          setGamma]          = useState(0.28);

    // ── Animasi teks loading ──
    useEffect(() => {
        if (!isUploading) return;
        let idx = 0;
        const iv = setInterval(() => {
            idx = (idx + 1) % LOADING_TEXTS.length;
            setLoadingText(LOADING_TEXTS[idx]);
        }, 900);
        return () => clearInterval(iv);
    }, [isUploading]);

    // ── Jumlah baris valid & validasi ──
    const dataCount    = previewRows?.length ?? 0;
    const isDataCukup  = dataCount >= REQUIRED_MIN_DATA;

    // ── Kolom yang tampil di tabel preview ──
    const visibleKopis = useMemo(() => {
        if (!previewRows?.length) return [];
        return ['arabica', 'robusta', 'asalan'].filter(
            (k) => previewRows.some((r) => (r[k] ?? 0) > 0),
        );
    }, [previewRows]);

    // ── Upload & Preprocess ──
    const handleFile = useCallback(async (file) => {
        if (!file) return;
        if (!file.name.match(/\.(csv|txt)$/i)) {
            setUploadError('Hanya file .csv yang didukung.');
            return;
        }
        setUploadError('');
        setForecastError('');
        setPreviewRows(null);
        setForecastResult(null);
        setMetrics(null);
        setChartData([]);
        setCsvFileName(file.name);
        setIsUploading(true);
        setLoadingText(LOADING_TEXTS[0]);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Panggil via Laravel Gateway → Laravel forward ke FastAPI port 8001
            const res = await axios.post(route('admin.forecast.preprocess'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { data_bersih, anomalies } = res.data;

            if (!data_bersih?.length) {
                setUploadError('CSV tidak menghasilkan data. Periksa format kolom Anda.');
                return;
            }

            setPreviewRows(data_bersih);
            setAnomaliData(anomalies ?? []);

            // Tentukan opsi jenis kopi yang tersedia
            const opsi = ['arabica', 'robusta', 'asalan'].filter(
                (k) => data_bersih.some((r) => (r[k] ?? 0) > 0),
            );
            setJenisOpsi(opsi);
            setSelectedJenis(opsi[0] ?? '');
        } catch (err) {
            const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
            setUploadError(`Gagal memproses CSV: ${detail}`);
        } finally {
            setIsUploading(false);
        }
    }, []);

    // ── Apply Anomaly Recommendation ──
    const handleApplyAnomaly = useCallback((periode, newVal, jenis) => {
        if (!previewRows || !anomaliData) return;

        const targetIndex = previewRows.findIndex((r) => r.periode_str === periode);
        if (targetIndex === -1) return;

        // Update previewRows
        const newPreviewRows = [...previewRows];
        newPreviewRows[targetIndex] = {
            ...newPreviewRows[targetIndex],
            [jenis]: Number(newVal.toFixed(2))
        };
        
        // Update total
        let newTotal = 0;
        ['arabica', 'robusta', 'asalan'].forEach(k => {
             if(newPreviewRows[targetIndex][k]) newTotal += newPreviewRows[targetIndex][k];
        });
        newPreviewRows[targetIndex].total = Number(newTotal.toFixed(2));

        setPreviewRows(newPreviewRows);

        // Hapus dari anomaliData
        const newAnomaliData = anomaliData.filter((a) => !(a.periode === periode && a.jenis_kopi === jenis));
        setAnomaliData(newAnomaliData);

    }, [previewRows, anomaliData]);

    // ── Proses hasil forecast (single) → state chart & metrics (Tab Uji Peramalan) ──
    const processApiResult = useCallback((activeResult) => {
        if (!activeResult || activeResult.status !== 'success') return;

        // Unified Timeline langsung dari backend.
        // Key per baris: { tanggal, aktual, forecast }
        setChartMode('single');
        setChartData(activeResult.chart_data ?? []);
        setRekomendasi(activeResult.rekomendasi_bisnis ?? '');

        const aktualRows   = (activeResult.chart_data ?? []).filter((r) => r.aktual !== null && r.aktual !== undefined);
        const aktualValues = aktualRows.map((r) => r.aktual);
        const trendPersen  = calcTrendPercent(aktualValues);
        const statusTrend  = statusTrendFromPercent(trendPersen);
        const forecastRows = (activeResult.chart_data ?? [])
            .filter((r) => r.aktual === null || r.aktual === undefined)
            .map((r) => ({ tanggal: r.tanggal, quantity: r.forecast }));

        setMetrics({
            mape:         activeResult.mape_testing,
            trendPersen,
            statusTrend,
            forecast6:    forecastRows,
            paramDipakai: activeResult.parameter_digunakan,
        });
        setAlpha(activeResult.parameter_digunakan?.alpha ?? 0.2);
        setBeta(activeResult.parameter_digunakan?.beta   ?? 0.1);
        setGamma(activeResult.parameter_digunakan?.gamma ?? 0.2);
    }, []);

    // ── Jalankan Simulasi (Otomatis / Manual) – Tab Uji Peramalan ──
    const callForecastApi = useCallback(async (mode, alphaVal, betaVal, gammaVal) => {
        if (!previewRows?.length || !selectedJenis) return;
        setIsForecasting(true);
        setForecastError('');

        const parseMonYear = (str) => {
            try {
                const d = new Date(`${str.replace('-', ' ')} 1`);
                if (!isNaN(d)) {
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                }
            } catch {}
            return str;
        };

        const isSemua = selectedJenis === 'semua';
        const buildCustomData = (kopi) =>
            previewRows
                .filter((r) => (r[kopi] ?? 0) > 0)
                .map((r) => ({ periode: parseMonYear(r.tanggal), quantity: r[kopi] }));

        try {
            if (isSemua) {
                // Kirim 3 request paralel; backend masing-masing merakit Unified Timeline
                const kopiList = ['arabica', 'robusta', 'asalan'];
                const responses = await Promise.all(
                    kopiList.map((kopi) =>
                        axios.post(route('admin.forecast.generate'), {
                            mode, jenis_kopi_id: '',
                            custom_data: buildCustomData(kopi),
                            alpha: mode === 'manual' ? alphaVal : null,
                            beta:  mode === 'manual' ? betaVal  : null,
                            gamma: mode === 'manual' ? gammaVal : null,
                        })
                    )
                );

                const resultPerKopi = responses.map((res, i) => {
                    const r = (res.data.requests ?? res.data)[0];
                    if (r) r.jenis_kopi = kopiList[i];
                    return r;
                }).filter(Boolean);

                const successList = resultPerKopi.filter((r) => r.status === 'success');
                if (!successList.length) {
                    setForecastError(resultPerKopi[0]?.pesan ?? 'Terjadi kesalahan pada peramalan.');
                    return;
                }

                // Gabungkan 3 Unified Timeline menjadi satu multi-key flat
                const allLabelSet = [];
                const seen = new Set();
                successList.forEach((r) => {
                    (r.chart_data ?? []).forEach((row) => {
                        if (!seen.has(row.tanggal)) { seen.add(row.tanggal); allLabelSet.push(row.tanggal); }
                    });
                });
                const index = {};
                allLabelSet.forEach((lbl) => { index[lbl] = { tanggal: lbl }; });
                successList.forEach((r) => {
                    const kopi = r.jenis_kopi;
                    (r.chart_data ?? []).forEach((row) => {
                        if (index[row.tanggal]) {
                            index[row.tanggal][`${kopi}_aktual`]    = row.aktual;
                            index[row.tanggal][`${kopi}_forecast`]  = row.forecast;
                        }
                    });
                });
                allLabelSet.forEach((lbl) => {
                    ['arabica','robusta','asalan'].forEach((k) => {
                        index[lbl][`${k}_aktual`]    ??= null;
                        index[lbl][`${k}_forecast`]  ??= null;
                    });
                });

                const first = successList[0];
                setForecastResult(successList);
                setChartMode('multi');
                setChartData(allLabelSet.map((lbl) => index[lbl]));
                setRekomendasi(
                    successList.map((r) => `[${r.jenis_kopi.toUpperCase()}] ${r.rekomendasi_bisnis ?? ''}`).join(' | ')
                );
                setMetrics({
                    mape: first.mape_testing, trendPersen: null, statusTrend: 'stabil',
                    forecast6: [], paramDipakai: first.parameter_digunakan,
                });
                setAlpha(first.parameter_digunakan?.alpha ?? 0.2);
                setBeta(first.parameter_digunakan?.beta   ?? 0.1);
                setGamma(first.parameter_digunakan?.gamma ?? 0.2);
                return;
            }

            // ── Single jenis kopi ──
            const payload = {
                mode, jenis_kopi_id: '',
                alpha: mode === 'manual' ? alphaVal : null,
                beta:  mode === 'manual' ? betaVal  : null,
                gamma: mode === 'manual' ? gammaVal : null,
                custom_data: buildCustomData(selectedJenis),
            };
            const res = await axios.post(route('admin.forecast.generate'), payload);
            const resData = res.data.requests ?? res.data;
            const active  = Array.isArray(resData) ? (resData[0] ?? null) : resData;

            if (active?.status === 'error') {
                setForecastError(active.pesan ?? 'Terjadi kesalahan pada peramalan.');
                return;
            }
            setForecastResult(active);
            processApiResult(active);
        } catch (err) {
            setForecastError(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal menghubungi server.');
        } finally {
            setIsForecasting(false);
        }
    }, [previewRows, selectedJenis, processApiResult]);

    const handleRunSimulasi = () => callForecastApi('otomatis', alpha, beta, gamma);
    const handleRunManual   = () => callForecastApi('manual',   alpha, beta, gamma);

    // ── Reset seluruh state ──
    const handleReset = () => {
        setPreviewRows(null);
        setAnomaliData(null);
        setJenisOpsi([]);
        setSelectedJenis('');
        setForecastResult(null);
        setChartData([]);
        setMetrics(null);
        setUploadError('');
        setForecastError('');
        setCsvFileName('');
        setAlpha(0.35);
        setBeta(0.12);
        setGamma(0.28);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const cardCls = 'rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-5 shadow-md transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/55 dark:shadow-lg dark:shadow-black/25 dark:backdrop-blur-sm';
    const tier    = mapeTierLabel(metrics?.mape);
    const accScore = metrics?.mape != null ? Math.max(0, Math.min(100, 100 - metrics.mape)).toFixed(0) : null;

    // Hitung jumlah anomali di jenis kopi yang dipilih
    const anomaliByJenis = useMemo(() => {
        if (!anomaliData || !Array.isArray(anomaliData) || !selectedJenis) return [];
        return anomaliData.filter((a) => a.jenis_kopi === selectedJenis);
    }, [anomaliData, selectedJenis]);

    const anomalyCount = anomaliByJenis.length;

    return (
        <div className="space-y-5">
            {/* ── Banner Sandbox ── */}
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/25">
                <span className="text-lg">🧪</span>
                <div>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Mode Sandbox / Simulasi</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Data berasal dari CSV sementara · hasil peramalan <strong>tidak disimpan</strong> ke database.</p>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                FASE 1: Belum ada previewRows → tampilkan form upload
            ───────────────────────────────────────────────────────────── */}
            {!previewRows && (
                <div className={cardCls}>
                    <h2 className="mb-1 text-sm font-semibold text-[#1E293B] dark:text-slate-200">Unggah CSV Sementara</h2>
                    <p className="mb-4 text-xs text-[#64748B] dark:text-slate-400">
                        Format kolom: <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">tanggal</code>,{' '}
                        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">nama produk</code>,{' '}
                        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">quantity</code>.
                        Nama produk harus mengandung kata <em className="notranslate" translate="no">arabica</em>, <em className="notranslate" translate="no">robusta</em>, atau <em className="notranslate" translate="no">asalan</em>.
                    </p>

                    {uploadError && (
                        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                            <span className="mt-0.5">⚠</span>
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Drop zone */}
                    <label
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={async (e) => {
                            e.preventDefault();
                            setDragActive(false);
                            await handleFile(e.dataTransfer.files?.[0]);
                        }}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
                            dragActive
                                ? 'border-amber-400 bg-amber-50 dark:border-amber-400 dark:bg-amber-500/10'
                                : 'border-[#D6DEE8] bg-white hover:border-amber-400/70 hover:bg-amber-50/40 dark:border-slate-600/60 dark:bg-slate-950/30 dark:hover:border-amber-500/50'
                        }`}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-3">
                                <svg className="h-8 w-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{loadingText}</p>
                            </div>
                        ) : (
                            <>
                                <svg className="mb-3 h-10 w-10 text-amber-400 dark:text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                                <p className="text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                                    Drag &amp; drop file CSV di sini
                                </p>
                                <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                                    atau klik untuk memilih file
                                </p>
                                {csvFileName && (
                                    <p className="mt-3 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                        📄 {csvFileName}
                                    </p>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt,text/csv"
                                    className="hidden"
                                    onChange={(e) => handleFile(e.target.files?.[0])}
                                />
                            </>
                        )}
                    </label>

                    {/* Tombol Pilih File Lain */}
                    {!isUploading && csvFileName && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 w-full rounded-xl bg-amber-500/90 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md transition hover:bg-amber-400"
                        >
                            Pilih File Lain
                        </button>
                    )}

                    {/* ── Unduh Template CSV ── */}
                    {!isUploading && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <a
                                href="/contoh_format.csv"
                                download
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6DEE8] bg-white px-4 py-2 text-xs font-semibold text-[#475569] shadow-sm transition hover:border-amber-400/60 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-amber-500/50 dark:hover:text-amber-300"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Unduh Format CSV
                            </a>
                            <span className="text-[11px] text-[#94A3B8] dark:text-slate-500">Contoh format file yang diterima sistem</span>
                        </div>
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                FASE 2: Ada previewRows → tampilkan preview & tombol aksi
            ───────────────────────────────────────────────────────────── */}
            {previewRows && (
                <div className="space-y-5">
                    {/* Toolbar atas: info file + tombol reset */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                📄 {csvFileName}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDataCukup ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                                {dataCount} bulan
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6DEE8] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] shadow-sm transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:text-rose-300"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Mulai Ulang / Unggah File Baru
                        </button>
                    </div>

                    {/* Peringatan data tidak cukup */}
                    {!isDataCukup && (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                            <span className="mt-0.5">⚠</span>
                            <span>
                                Data tidak mencukupi. <strong>Minimal {REQUIRED_MIN_DATA} bulan</strong> diperlukan.
                                CSV Anda hanya memiliki <strong>{dataCount} bulan</strong>.
                            </span>
                        </div>
                    )}

                    {/* Peringatan & Resolusi Anomali Interaktif */}
                    {anomalyCount > 0 && (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-950/25">
                            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                                <span className="mt-0.5">🔍</span>
                                <span>
                                    Terdeteksi <strong>{anomalyCount} anomali</strong> pada data <strong className="capitalize notranslate" translate="no">{selectedJenis}</strong>.
                                    Data anomali ini dapat merusak akurasi peramalan. Anda dapat menerapkan nilai rekomendasi (rata-rata nilai sekitarnya) atau membiarkannya.
                                </span>
                            </div>
                            
                            <div className="mt-2 overflow-x-auto rounded-lg border border-amber-200/60 bg-white/50 dark:border-amber-500/20 dark:bg-slate-900/40">
                                <table className="w-full text-left text-xs text-amber-900 dark:text-amber-200">
                                    <thead className="border-b border-amber-200/60 bg-amber-100/50 dark:border-amber-500/20 dark:bg-amber-500/10">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold">Periode</th>
                                            <th className="px-3 py-2 font-semibold text-right">Nilai Aktual</th>
                                            <th className="px-3 py-2 font-semibold text-right">Rekomendasi</th>
                                            <th className="px-3 py-2 font-semibold text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-200/40 dark:divide-amber-500/20">
                                        {anomaliByJenis.map((anomali) => {
                                            const targetIndex = previewRows.findIndex(r => r.periode_str === anomali.periode);
                                            // Gunakan nilai rekomendasi dari backend secara default
                                            let newVal = anomali.rekomendasi;

                                            return (
                                                <tr key={anomali.periode} className="hover:bg-amber-100/30 dark:hover:bg-amber-500/5">
                                                    <td className="px-3 py-2 font-medium">{anomali.periode}</td>
                                                    <td className="px-3 py-2 text-right text-rose-600 dark:text-rose-400 font-medium">{anomali.nilai_aktual}</td>
                                                    <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">{newVal}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyAnomaly(anomali.periode, newVal, anomali.jenis_kopi)}
                                                            className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                                                        >
                                                            Terapkan
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tabel Preview */}
                    <div className={cardCls}>
                        <h3 className="mb-3 text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                            Preview Data Hasil Preprocess
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-[#D6DEE8] dark:border-slate-700/60">
                            <table className="w-full text-sm">
                                <thead className="bg-[#F1F5F9] text-xs font-semibold uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left">Periode</th>
                                        {visibleKopis.map((k) => (
                                            <th key={k} className="px-4 py-2.5 text-right capitalize notranslate" translate="no">{k} (kg)</th>
                                        ))}
                                        <th className="px-4 py-2.5 text-right notranslate" translate="no">Weight (kg)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9EFF6] dark:divide-slate-800">
                                    {previewRows.map((row, i) => {
                                        const isAnomaly = Array.isArray(anomaliData) 
                                            && anomaliData.some((a) => a.periode === row.periode_str && a.jenis_kopi === selectedJenis);
                                        return (
                                            <tr
                                                key={i}
                                                className={`transition ${isAnomaly ? 'bg-amber-50/80 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900/40'} hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                                            >
                                                <td className="px-4 py-2 font-medium text-[#1E293B] dark:text-slate-200">
                                                    {row.tanggal}
                                                    {isAnomaly && (
                                                        <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/25 dark:text-amber-300">
                                                            ⚡ anomali
                                                        </span>
                                                    )}
                                                </td>
                                                {visibleKopis.map((k) => (
                                                    <td key={k} className="px-4 py-2 text-right tabular-nums text-[#0F172A] dark:text-slate-200">
                                                        {(row[k] ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2 text-right font-semibold tabular-nums text-[#0F172A] dark:text-white">
                                                    {(row.total ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-2 text-right text-xs text-[#64748B] dark:text-slate-500">
                            {dataCount} baris · {visibleKopis.length} jenis kopi terdeteksi
                        </p>
                    </div>

                    {/* Pilih Jenis & Tombol Simulasi */}
                    <div className={`${cardCls} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}>
                        <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-[#475569] dark:text-slate-400">
                                Pilih Jenis Kopi untuk Diramalkan
                            </label>
                            <select
                                value={selectedJenis}
                                onChange={(e) => {
                                    setSelectedJenis(e.target.value);
                                    setForecastResult(null);
                                    setChartData([]);
                                    setMetrics(null);
                                    setRekomendasi('');
                                    setForecastError('');
                                }}
                                className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                            >
                                <option value="semua">🔍 Semua Jenis Kopi</option>
                                {jenisOpsi.map((k) => (
                                    <option key={k} value={k} className="capitalize">{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="shrink-0">
                            <button
                                type="button"
                                onClick={handleRunSimulasi}
                                disabled={!isDataCukup || isForecasting || !selectedJenis}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/90 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-amber-900/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isForecasting ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Mensimulasikan...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                        </svg>
                                        Jalankan Simulasi Peramalan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error forecast */}
                    {forecastError && (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100">
                            <span className="mt-0.5">⚠</span>
                            <span>{forecastError}</span>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────
                        FASE 3: Hasil Forecast (identik dengan TabDataAsli,
                        tapi TANPA tombol Simpan)
                    ─────────────────────────────────────────────────────── */}
                    {forecastResult && (
                        <div className="space-y-5">
                            {/* Label simulasi */}
                            <div className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-50/60 px-4 py-2 dark:border-amber-600/25 dark:bg-amber-950/20">
                                <span className="text-sm">🧪</span>
                                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                    Ini adalah hasil simulasi dari data CSV · tidak akan disimpan ke database.
                                </p>
                            </div>

                            {/* Grafik */}
                            <div className="h-[420px] w-full">
                                <ForecastChart
                                    data={chartData}
                                    mode={chartMode}
                                    xDataKey="tanggal"
                                    actualKey="aktual"
                                    forecastKey="forecast"
                                    subtitle={chartMode === 'multi'
                                        ? 'Arabica · Robusta · Asalan — Solid = Aktual, Putus-putus = Forecast'
                                        : `Simulasi: ${selectedJenis} — Hijau = Aktual · Kuning putus = In-Sample Overlap + Forecast`}
                                    chartBodyClassName="h-[340px] w-full min-w-0"
                                />
                            </div>

                            {/* ── Kartu Rekomendasi Bisnis DSS ── */}
                            {(isForecasting || rekomendasi) && (
                                <RekomendasiCard teks={rekomendasi} isLoading={isForecasting} />
                            )}

                            {/* Parameter Hybrid + Evaluasi */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Parameter Model */}
                                <div className={cardCls}>
                                    <h3 className="mb-1 text-sm font-semibold text-[#1E293B] dark:text-slate-200">Parameter Model</h3>
                                    <p className="mb-3 text-xs text-[#64748B] dark:text-slate-400">Ubah nilai lalu klik "Hitung Ulang (Manual)"</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Alpha (α)', val: alpha, set: setAlpha },
                                            { label: 'Beta (β)',  val: beta,  set: setBeta  },
                                            { label: 'Gamma (γ)', val: gamma, set: setGamma },
                                        ].map((row) => (
                                            <div key={row.label}>
                                                <label className="mb-1 block text-[11px] font-medium text-[#64748B] dark:text-slate-400">{row.label}</label>
                                                <input
                                                    type="number"
                                                    min={0.01} max={0.99} step={0.01}
                                                    value={row.val}
                                                    onChange={(e) => row.set(Math.min(0.99, Math.max(0.01, Number(e.target.value))))}
                                                    className="w-full rounded-lg border border-[#D6DEE8] bg-white px-2.5 py-1.5 text-center text-sm font-semibold tabular-nums text-[#0F172A] shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRunManual}
                                        disabled={isForecasting}
                                        className="mt-4 w-full rounded-xl border border-amber-400/50 bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-500/40 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
                                    >
                                        {isForecasting ? 'Menghitung...' : '↺  Hitung Ulang (Manual)'}
                                    </button>
                                </div>

                                {/* Evaluasi Model */}
                                <div className={cardCls}>
                                    <h3 className="mb-3 text-sm font-semibold text-[#1E293B] dark:text-slate-200">Evaluasi Simulasi</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#D6DEE8] dark:bg-slate-800/60 dark:ring-slate-700">
                                            <div>
                                                <p className="text-xs text-[#64748B] dark:text-slate-400">MAPE</p>
                                                <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#0F172A] dark:text-white">
                                                    {metrics?.mape != null ? `${Number(metrics.mape.toFixed(2)).toLocaleString('id-ID')}%` : '—'}
                                                </p>
                                            </div>
                                            <ToneBadge tone={tier.tone} label={tier.label} />
                                        </div>
                                        {accScore != null && (
                                            <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#D6DEE8] dark:bg-slate-800/60 dark:ring-slate-700">
                                                <p className="text-xs text-[#64748B] dark:text-slate-400">Skor Akurasi</p>
                                                <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-300">{accScore} / 100</p>
                                            </div>
                                        )}
                                        {metrics?.trendPersen != null && (
                                            <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 ring-1 ring-[#D6DEE8] dark:bg-slate-800/60 dark:ring-slate-700">
                                                <p className="text-xs text-[#64748B] dark:text-slate-400">Trend Penjualan</p>
                                                <div className="text-right">
                                                    <p className={`text-sm font-semibold tabular-nums ${metrics.trendPersen > 0 ? 'text-emerald-600 dark:text-emerald-400' : metrics.trendPersen < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {metrics.trendPersen > 0 ? '+' : ''}{Number(metrics.trendPersen).toLocaleString('id-ID')}%
                                                    </p>
                                                    <p className="text-[11px] capitalize text-[#64748B] dark:text-slate-400">{metrics.statusTrend}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tabel Prediksi 6 Bulan */}
                            {metrics?.forecast6?.length > 0 && (
                                <div className={cardCls}>
                                    <h3 className="mb-3 text-sm font-semibold text-[#1E293B] dark:text-slate-200">
                                        Prediksi Simulasi 6 Bulan ke Depan
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-[#D6DEE8] dark:border-slate-700/60">
                                        <table className="w-full text-sm">
                                            <thead className="bg-[#F1F5F9] text-xs font-semibold uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-400">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Periode</th>
                                                    <th className="px-4 py-3 text-right">Prediksi (kg)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E9EFF6] dark:divide-slate-800">
                                                {metrics.forecast6.map((row, i) => (
                                                    <tr key={i} className="bg-white transition hover:bg-amber-50/40 dark:bg-slate-900/40 dark:hover:bg-amber-900/10">
                                                        <td className="px-4 py-2.5 font-medium text-[#1E293B] dark:text-slate-200">
                                                            {row.tanggal ?? formatPeriod(row.periode)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums text-[#0F172A] dark:text-white">
                                                            {(row.quantity ?? 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Tombol Mulai Ulang (bukan Simpan!) */}
                            <div className={`${cardCls} flex items-center justify-between gap-4`}>
                                <div>
                                    <p className="text-sm font-semibold text-[#1E293B] dark:text-slate-200">Selesai dengan Simulasi?</p>
                                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">Unggah file baru atau coba parameter berbeda untuk simulasi ulang.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#D6DEE8] bg-white px-5 py-2.5 text-sm font-semibold text-[#475569] shadow-sm transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:text-rose-300"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    Mulai Ulang / Unggah File Baru
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Komponen Utama ─────────────────────────────────────────────────────────
export default function Forecast() {
    const { props } = usePage();
    const {
        modelingSeries = EMPTY_ARRAY,
        jenisKopi      = EMPTY_ARRAY,
        filters,
        flash,
        initialDashboardData = null,
    } = props;

    const [activeTab, setActiveTab] = useState('data_asli');

    return (
        <AdminLayout>
            <Head title="Peramalan Holt-Winters" />

            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* ── Header ── */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 pr-2">
                        <h1 className="text-xl font-bold tracking-tight text-[#0B1220] dark:text-lg dark:font-semibold dark:text-slate-50">
                            Peramalan Holt-Winters
                        </h1>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-[#475569] dark:font-normal dark:text-slate-400">
                            Parameter, akurasi, dan visualisasi hasil model pada data penjualan.
                        </p>
                    </div>
                    <div className="flex shrink-0 justify-start sm:justify-end">
                        <ThemeToggle />
                    </div>
                </div>

                {/* ── Navigasi Tabs ── */}
                <div className="rounded-2xl border border-[#D6DEE8] bg-white/90 p-3 shadow-md transition-colors duration-300 dark:border-slate-700/70 dark:bg-[#090f1e] dark:shadow-lg dark:shadow-black/30">
                    <div className="inline-flex rounded-xl border border-[#D6DEE8] bg-[#F8FAFC] p-1 dark:border-slate-700/80 dark:bg-slate-950">
                        <button
                            type="button"
                            onClick={() => setActiveTab('data_asli')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                activeTab === 'data_asli'
                                    ? 'bg-emerald-500/25 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-emerald-200'
                                    : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            Data Asli
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('uji_peramalan')}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                activeTab === 'uji_peramalan'
                                    ? 'bg-amber-500/25 text-amber-700 ring-1 ring-amber-500/40 dark:text-amber-200'
                                    : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            Uji Peramalan
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-[#64748B] dark:text-slate-400">
                        {activeTab === 'data_asli'
                            ? 'Data dari sistem · hasil peramalan akan disimpan ke database.'
                            : 'Data dari file CSV eksternal · hasil tidak disimpan.'}
                    </p>
                </div>

                {/* ── Area Konten Tab ── */}
                <div className="rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-5 shadow-md transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/55 dark:shadow-lg dark:shadow-black/25 dark:backdrop-blur-sm">
                    {activeTab === 'data_asli' && (
                        <TabDataAsli
                            jenisKopi={jenisKopi}
                            modelingSeries={modelingSeries}
                            filters={filters}
                            flash={flash}
                            initialDashboardData={initialDashboardData}
                        />
                    )}

                    {activeTab === 'uji_peramalan' && (
                        <TabUjiPeramalan />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

