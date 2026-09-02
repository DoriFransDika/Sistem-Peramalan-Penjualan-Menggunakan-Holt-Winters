import { router } from '@inertiajs/react';
import { useMemo, useState, useCallback } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Konstanta & helpers visual
// ─────────────────────────────────────────────────────────────────────────────

const FASTAPI_BASE = window.FASTAPI_URL || import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8001';

const KOPI_COLORS = {
    arabica: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-300/50 dark:border-blue-400/40',
        text: 'text-blue-800 dark:text-blue-200',
        bar: '#3b82f6',
    },
    robusta: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-300/50 dark:border-amber-400/40',
        text: 'text-amber-800 dark:text-amber-200',
        bar: '#f59e0b',
    },
    asalan: {
        bg: 'bg-violet-50 dark:bg-violet-500/10',
        border: 'border-violet-300/50 dark:border-violet-400/40',
        text: 'text-violet-800 dark:text-violet-200',
        bar: '#8b5cf6',
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-komponen: Badge jumlah anomali
// ─────────────────────────────────────────────────────────────────────────────

function AnomalyBadge({ count }) {
    if (count === 0)
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                ✓ Tidak ada anomali
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
            ⚠ {count} anomali
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-komponen: Mini bar chart per jenis kopi
// ─────────────────────────────────────────────────────────────────────────────

function AnomalyChart({ dataTabel, jenis, anomalyPeriodes }) {
    const color = KOPI_COLORS[jenis] ?? KOPI_COLORS.arabica;
    const anomalySet = new Set(anomalyPeriodes);

    const chartData = dataTabel.map((row) => ({
        tanggal: row.tanggal,
        value: Number(row[jenis] ?? 0),
        isAnomaly: anomalySet.has(row.periode_str) || anomalySet.has(row.tanggal),
    }));

    return (
        <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <XAxis
                        dataKey="tanggal"
                        tick={{ fontSize: 9 }}
                        interval="preserveStartEnd"
                        className="fill-slate-500 dark:fill-slate-400"
                    />
                    <YAxis tick={{ fontSize: 9 }} width={40} className="fill-slate-500 dark:fill-slate-400" />
                    <Tooltip
                        contentStyle={{
                            fontSize: 11,
                            borderRadius: 12,
                            border: '1px solid #e2e8f0',
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(8px)',
                        }}
                        formatter={(value) => [Number(value).toLocaleString('id-ID') + ' Kg', jenis]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isAnomaly ? '#ef4444' : color.bar}
                                fillOpacity={entry.isAnomaly ? 0.9 : 0.7}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponen Utama: AnomalyPreview
// ─────────────────────────────────────────────────────────────────────────────

export default function AnomalyPreview({ preprocessedData, onCancel }) {
    if (!preprocessedData) return null;

    const { data_bersih = [], file_name = 'file.csv' } = preprocessedData;

    // ── State anomali internal (diisi oleh Tahap 2) ───────────────────────────
    const [anomalies, setAnomalies] = useState([]);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectError, setDetectError] = useState(null);
    const [hasDetected, setHasDetected] = useState(false);

    // ── State perbaikan yang diterapkan user ──────────────────────────────────
    const [appliedFixes, setAppliedFixes] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // ── Kelompokkan anomali berdasarkan jenis_kopi ────────────────────────────
    const groupedAnomalies = useMemo(() => {
        const grouped = { arabica: [], robusta: [], asalan: [] };
        anomalies.forEach((a) => {
            const k = a.jenis_kopi?.toLowerCase();
            if (k && grouped[k] !== undefined) grouped[k].push(a);
        });
        return grouped;
    }, [anomalies]);

    const totalAnomalies = useMemo(
        () => Object.values(groupedAnomalies).reduce((s, arr) => s + arr.length, 0),
        [groupedAnomalies],
    );

    // ── Build lookup anomali untuk highlight di tabel ─────────────────────────
    // key: "jenis::periode_str"  atau  "jenis::tanggal"
    const anomalyLookup = useMemo(() => {
        const map = {};
        anomalies.forEach((a) => {
            const k = a.jenis_kopi?.toLowerCase();
            if (!k) return;
            // Backend mengembalikan "periode" (bisa periode_str atau tanggal)
            map[`${k}::${a.periode}`] = a;
        });
        return map;
    }, [anomalies]);

    // ── Data tabel dengan perbaikan diterapkan ────────────────────────────────
    const correctedData = useMemo(() => {
        if (Object.keys(appliedFixes).length === 0) return data_bersih;
        return data_bersih.map((row) => {
            const newRow = { ...row };
            for (const jenis of ['arabica', 'robusta', 'asalan']) {
                // coba cocokkan dengan periode_str atau tanggal
                const key1 = `${jenis}::${row.periode_str}`;
                const key2 = `${jenis}::${row.tanggal}`;
                if (appliedFixes[key1] !== undefined) newRow[jenis] = appliedFixes[key1];
                else if (appliedFixes[key2] !== undefined) newRow[jenis] = appliedFixes[key2];
            }
            newRow.total =
                (Number(newRow.arabica) || 0) +
                (Number(newRow.robusta) || 0) +
                (Number(newRow.asalan) || 0);
            return newRow;
        });
    }, [data_bersih, appliedFixes]);

    // ── Handlers perbaikan ────────────────────────────────────────────────────
    const applyAllRecommendations = useCallback(() => {
        const fixes = {};
        anomalies.forEach((a) => {
            const k = a.jenis_kopi?.toLowerCase();
            const key = `${k}::${a.periode}`;
            fixes[key] = a.rekomendasi;
        });
        setAppliedFixes(fixes);
    }, [anomalies]);

    const applySingle = useCallback((jenis, periode, rekomendasi) => {
        setAppliedFixes((prev) => ({ ...prev, [`${jenis}::${periode}`]: rekomendasi }));
    }, []);

    const undoSingle = useCallback((jenis, periode) => {
        setAppliedFixes((prev) => {
            const next = { ...prev };
            delete next[`${jenis}::${periode}`];
            return next;
        });
    }, []);

    // ── Tutup pratinjau ───────────────────────────────────────────────────────
    const handleDismiss = () => {
        router.post(route('admin.sales.cancel-upload'), {}, { preserveScroll: true });
        onCancel?.();
    };

    // ── Simpan ke database ────────────────────────────────────────────────────
    const handleSimpanKeDatabase = () => {
        if (isSaving) return;
        setIsSaving(true);
        const payload = correctedData.map((row) => ({
            tanggal: row.periode_str ?? row.tanggal,
            arabica: Number(row.arabica ?? 0),
            robusta: Number(row.robusta ?? 0),
            asalan: Number(row.asalan ?? 0),
        }));
        router.post(
            route('admin.sales.store-bulk'),
            { data: payload, file_name },
            { preserveScroll: true, onFinish: () => setIsSaving(false) },
        );
    };

    // ── Tahap 2: Kirim data_bersih ke /api/detect-anomaly ────────────────────
    const handleDetectAnomaly = async () => {
        if (isDetecting || data_bersih.length === 0) return;
        setIsDetecting(true);
        setDetectError(null);
        // Reset anomali & perbaikan lama
        setAnomalies([]);
        setAppliedFixes({});
        setHasDetected(false);

        try {
            const res = await fetch(`${FASTAPI_BASE}/api/detect-anomaly`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ data_bersih }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail ?? `HTTP ${res.status}`);
            }

            const json = await res.json();
            setAnomalies(Array.isArray(json.anomalies) ? json.anomalies : []);
            setHasDetected(true);
        } catch (err) {
            setDetectError(err.message ?? 'Terjadi kesalahan tidak diketahui.');
        } finally {
            setIsDetecting(false);
        }
    };

    const fixCount = Object.keys(appliedFixes).length;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 relative">

            {/* ── Header Banner ──────────────────────────────────────────────── */}
            <div className="sticky top-0 z-40 rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-5 py-4 shadow-md backdrop-blur-sm dark:border-emerald-400/30 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                            {/* Flask icon */}
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                            </svg>
                            Hasil Preprocessing
                        </h2>
                        <p className="mt-1 text-[11px] text-emerald-800/80 dark:text-emerald-200/70">
                            File: <code className="rounded bg-emerald-100/80 px-1 py-0.5 text-[10px] dark:bg-emerald-500/20">{file_name}</code>
                            {' '}— <strong>{data_bersih.length}</strong> periode berhasil di-pivot
                            {hasDetected && <> · <strong>{totalAnomalies}</strong> anomali terdeteksi</>}
                        </p>
                    </div>

                    {/* Tombol-tombol aksi header */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Terapkan semua rekomendasi (hanya tampil bila ada anomali) */}
                        {hasDetected && totalAnomalies > 0 && (
                            <button
                                type="button"
                                onClick={applyAllRecommendations}
                                className="rounded-full border border-emerald-400/60 bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-400 dark:border-emerald-400/40 dark:bg-emerald-500/80"
                            >
                                ✨ Terapkan Semua ({totalAnomalies})
                            </button>
                        )}

                        {/* Simpan ke Database */}
                        <button
                            type="button"
                            onClick={handleSimpanKeDatabase}
                            disabled={isSaving || correctedData.length === 0}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/50 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition duration-150 hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40 disabled:opacity-40 dark:border-blue-400/30 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Menyimpan…
                                </>
                            ) : (
                                <>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                    </svg>
                                    Simpan ke Database
                                </>
                            )}
                        </button>

                        {/* Tutup */}
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="rounded-full border border-[#D6DEE8] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#334155] transition hover:bg-[#F4F7FB] dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            Tutup Pratinjau
                        </button>
                    </div>
                </div>

                {/* Indikator fix diterapkan */}
                {fixCount > 0 && (
                    <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        ✅ {fixCount} rekomendasi diterapkan — nilai di tabel sudah dikoreksi.
                    </p>
                )}
            </div>

            {/* ── Tabel Pivot (Tahap 1) ───────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
                <div className="flex items-center justify-between border-b border-[#D6DEE8] px-4 py-3 dark:border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300/90">
                        Tabel Pivot Bulanan
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {correctedData.length} periode
                    </p>
                </div>

                <div className="max-h-[min(50vh,400px)] overflow-auto">
                    <table className="min-w-full divide-y divide-[#D6DEE8] text-[11px] dark:divide-slate-800">
                        <thead className="sticky top-0 z-10 bg-white/95 text-[#64748B] backdrop-blur dark:bg-slate-900/95 dark:text-slate-300">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Tanggal</th>
                                <th className="px-3 py-2 text-right font-medium notranslate" translate="no">Arabica (Kg)</th>
                                <th className="px-3 py-2 text-right font-medium notranslate" translate="no">Robusta (Kg)</th>
                                <th className="px-3 py-2 text-right font-medium notranslate" translate="no">Asalan (Kg)</th>
                                <th className="px-3 py-2 text-right font-medium notranslate" translate="no">Weight (Kg)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D6DEE8] dark:divide-slate-800">
                            {correctedData.map((row, idx) => {
                                // Cek apakah baris ini memiliki anomali
                                const rowPeriode = row.periode_str ?? row.tanggal ?? '';
                                const hasAnomaly = ['arabica', 'robusta', 'asalan'].some(
                                    (j) => anomalyLookup[`${j}::${rowPeriode}`] || anomalyLookup[`${j}::${row.tanggal}`],
                                );
                                return (
                                    <tr
                                        key={idx}
                                        className={
                                            hasAnomaly
                                                ? 'bg-rose-50/60 transition-colors hover:bg-rose-100/60 dark:bg-rose-500/5 dark:hover:bg-rose-500/10'
                                                : 'transition-colors hover:bg-[#EEF2F7]/80 dark:hover:bg-slate-900/50'
                                        }
                                    >
                                        <td className="whitespace-nowrap px-3 py-2 font-medium text-[#0F172A] dark:text-slate-100">
                                            {row.tanggal}
                                        </td>
                                        {['arabica', 'robusta', 'asalan'].map((jenis) => {
                                            const aKey = `${jenis}::${rowPeriode}` in anomalyLookup
                                                ? `${jenis}::${rowPeriode}`
                                                : `${jenis}::${row.tanggal}`;
                                            const anomaly = anomalyLookup[aKey];
                                            const isFixed = appliedFixes[aKey] !== undefined;
                                            return (
                                                <td
                                                    key={jenis}
                                                    className={`whitespace-nowrap px-3 py-2 text-right ${anomaly && !isFixed
                                                        ? 'font-bold text-rose-600 dark:text-rose-400'
                                                        : isFixed
                                                            ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                                            : 'text-[#0F172A] dark:text-slate-100'
                                                        }`}
                                                    title={
                                                        anomaly
                                                            ? `${anomaly.keterangan} | Aktual: ${anomaly.nilai_aktual} → Rekomendasi: ${anomaly.rekomendasi}`
                                                            : undefined
                                                    }
                                                >
                                                    {Number(row[jenis] ?? 0).toLocaleString('id-ID')}
                                                    {anomaly && !isFixed && <span className="ml-1 text-[9px]">⚠️</span>}
                                                    {isFixed && <span className="ml-1 text-[9px]">✓</span>}
                                                </td>
                                            );
                                        })}
                                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-[#0F172A] dark:text-slate-100">
                                            {Number(row.total ?? 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TOMBOL DETEKSI ANOMALI — Tahap 2
                Hanya muncul jika data_bersih sudah ada (pivot berhasil)
            ══════════════════════════════════════════════════════════════════ */}
            {data_bersih.length > 0 && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-indigo-300/60 bg-indigo-50/50 py-5 px-4 dark:border-indigo-400/30 dark:bg-indigo-500/5">
                    {/* Label petunjuk */}
                    <p className="text-center text-[11px] text-indigo-700/80 dark:text-indigo-300/70">
                        Tahap 1 selesai. Klik tombol di bawah untuk menjalankan deteksi anomali secara terpisah.
                    </p>

                    {/* Tombol utama */}
                    <button
                        id="btn-detect-anomaly"
                        type="button"
                        onClick={handleDetectAnomaly}
                        disabled={isDetecting}
                        className="inline-flex items-center gap-2 rounded-full border border-indigo-400/60 bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition duration-150 hover:from-indigo-400 hover:to-purple-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-400/30 dark:from-indigo-600 dark:to-purple-600 dark:hover:from-indigo-500 dark:hover:to-purple-500"
                    >
                        {isDetecting ? (
                            /* Loading state */
                            <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Mendeteksi Anomali…
                            </>
                        ) : (
                            /* Normal state */
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                {hasDetected ? '🔄 Jalankan Ulang Deteksi Anomali' : '🔍 Jalankan Deteksi Anomali'}
                            </>
                        )}
                    </button>

                    {/* Loading progress bar animasi */}
                    {isDetecting && (
                        <div className="w-full max-w-xs overflow-hidden rounded-full bg-indigo-200/60 dark:bg-indigo-900/40">
                            <div className="h-1 animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: '75%' }} />
                        </div>
                    )}

                    {/* Error message */}
                    {detectError && (
                        <div className="w-full rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 dark:border-rose-400/30 dark:bg-rose-500/10">
                            <p className="flex items-start gap-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                </svg>
                                <span>
                                    <strong>Gagal mendeteksi anomali:</strong> {detectError}
                                    <br />
                                    <span className="text-[10px] font-normal opacity-80">
                                        Pastikan server FastAPI sudah berjalan di {FASTAPI_BASE}
                                    </span>
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Hasil: tidak ada anomali */}
                    {hasDetected && totalAnomalies === 0 && (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-50 px-4 py-2.5 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                Tidak ada anomali terdeteksi. Data Anda bersih! ✓
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Panel Anomali per Jenis Kopi (hanya tampil setelah deteksi) ── */}
            {hasDetected && (
                <div className="grid gap-4 lg:grid-cols-3">
                    {['arabica', 'robusta', 'asalan'].map((jenis) => {
                        const validList = groupedAnomalies[jenis] ?? [];
                        const colors = KOPI_COLORS[jenis];
                        // Kumpulkan periode anomali untuk chart
                        const anomalyPeriodes = validList.map((a) => a.periode);

                        return (
                            <div
                                key={jenis}
                                className={`overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} shadow-md transition-colors dark:shadow-black/10`}
                            >
                                {/* Header kartu */}
                                <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
                                    <h4 className={`text-xs font-semibold uppercase tracking-[0.2em] notranslate ${colors.text}`} translate="no">
                                        {jenis}
                                    </h4>
                                    <AnomalyBadge count={validList.length} />
                                </div>

                                {/* Mini chart */}
                                <div className="px-3 pt-3">
                                    <AnomalyChart
                                        dataTabel={data_bersih}
                                        jenis={jenis}
                                        anomalyPeriodes={anomalyPeriodes}
                                    />
                                </div>

                                {/* Daftar anomali */}
                                {validList.length > 0 ? (
                                    <div className="space-y-2 px-4 pb-4 pt-2 overflow-y-auto max-h-[40vh] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                                        {validList.map((a, idx) => {
                                            const fixKey = `${jenis}::${a.periode}`;
                                            const isFixed = appliedFixes[fixKey] !== undefined;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`rounded-xl border px-3 py-2.5 text-[11px] transition-all ${isFixed
                                                        ? 'border-emerald-300/50 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-500/10'
                                                        : 'border-rose-300/50 bg-white dark:border-rose-400/30 dark:bg-slate-900/50'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="space-y-1 flex-1 min-w-0">
                                                            <p className="font-semibold text-[#0F172A] dark:text-slate-100">
                                                                {a.periode}
                                                            </p>
                                                            {/* Keterangan aturan */}
                                                            {a.keterangan && (
                                                                <p className="truncate text-[10px] text-[#64748B] dark:text-slate-400" title={a.keterangan}>
                                                                    {a.keterangan}
                                                                </p>
                                                            )}
                                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#64748B] dark:text-slate-400">
                                                                <span>
                                                                    Aktual:{' '}
                                                                    <strong className="text-rose-600 dark:text-rose-400">
                                                                        {Number(a.nilai_aktual).toLocaleString('id-ID')}
                                                                    </strong>
                                                                </span>
                                                                <span>
                                                                    Rekomendasi:{' '}
                                                                    <strong className="text-emerald-600 dark:text-emerald-400">
                                                                        {Number(a.rekomendasi).toLocaleString('id-ID')}
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Tombol terapkan / undo */}
                                                        <div className="flex shrink-0 flex-col gap-1">
                                                            {isFixed ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => undoSingle(jenis, a.periode)}
                                                                    className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                                                >
                                                                    Undo
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => applySingle(jenis, a.periode, a.rekomendasi)}
                                                                    className="rounded-full border border-emerald-400/60 bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-emerald-400 dark:border-emerald-400/40 dark:bg-emerald-500/80"
                                                                >
                                                                    Terapkan
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-4 pb-4 pt-2 text-center text-[11px] text-[#94A3B8] dark:text-slate-500">
                                        Tidak ada anomali untuk <span className="notranslate" translate="no">{jenis}</span>.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
