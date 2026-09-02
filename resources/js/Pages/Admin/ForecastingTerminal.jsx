/**
 * ForecastingTerminal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Komponen modal terminal real-time yang menampilkan pipeline peramalan
 * Holt-Winters tahap demi tahap via Server-Sent Events (SSE) dari FastAPI.
 *
 * Pola identik dengan PreprocessingTerminal.jsx:
 *   1. User klik "Mulai Peramalan" → POST JSON ke FastAPI /api/forecast-stream
 *   2. Baca SSE stream → update step progress & terminal log
 *   3. Setelah "result" event → tampilkan ringkasan + tombol "Simpan"
 *   4. "Simpan" → POST ke Laravel /admin/forecast/results
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

const FASTAPI_URL = window.FASTAPI_URL || import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8001';

// ─── Konfigurasi 6 Tahap Pipeline Forecasting ────────────────────────────────
const STEP_CONFIG = {
    SPLIT_DATA: { label: 'Pembagian Data Training dan Testing', desc: 'Validasi dan pembagian split' },
    CALC_PARAMS: { label: 'Penentuan Parameter α, β, dan γ', desc: 'Grid search atau input manual' },
    CALC_SMOOTHING: { label: 'Perhitungan Level, Trend, dan Seasonal', desc: 'Smoothing Exponential model' },
    CALC_FORECAST: { label: 'Perhitungan Forecast', desc: 'Holt-Winters forecast 9 periode' },
    EVAL_MAPE: { label: 'Perhitungan Error dan MAPE', desc: 'Evaluasi 3 bulan terakhir' },
    SHOW_RESULT: { label: 'Menampilkan Hasil Forecast', desc: 'Rakit timeline data akhir' },
};

const STEP_ORDER = ['SPLIT_DATA', 'CALC_PARAMS', 'CALC_SMOOTHING', 'CALC_FORECAST', 'EVAL_MAPE', 'SHOW_RESULT'];

// ─── Icon Status Step ─────────────────────────────────────────────────────────
function StepStatusIcon({ status }) {
    if (status === 'running') return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 ring-1 ring-blue-500/40">
            <div className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-blue-400/40 border-t-blue-400" />
        </div>
    );
    if (status === 'done') return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
        </div>
    );
    if (status === 'error') return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/30">
            <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
    );
    return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        </div>
    );
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────
function StatBadge({ label, value }) {
    const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px]">
            <span className="text-slate-500">{label}:</span>
            <span className="text-slate-300">{display}</span>
        </span>
    );
}

// ─── Panel Detail Accordion ──────────────────────────────────────────────────
function StepDetailPanel({ preview }) {
    if (!preview) return null;

    const label = preview.label || 'Cuplikan Data';
    const countInfo = preview.total_rows != null
        ? `Menampilkan ${preview.shown} dari ${preview.total_rows} baris`
        : null;

    // raw_text (rekomendasi)
    if (preview.type === 'raw_text') {
        return (
            <div className="mt-2 rounded-md border border-slate-700/60 bg-[#0d1117] p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                </div>
                <div className="space-y-1 font-mono text-[9px] leading-relaxed text-slate-400">
                    {(preview.lines || []).map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all rounded bg-slate-800/50 px-2 py-1">
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // table
    const headers = preview.headers || [];
    const rows = preview.rows || [];

    return (
        <div className="mt-2 rounded-md border border-slate-700/60 bg-[#0d1117] p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                {countInfo && (
                    <span className="text-[8px] text-slate-600">{countInfo}</span>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[9px]">
                    <thead>
                        <tr className="border-b border-slate-800">
                            {headers.map((h, i) => (
                                <th key={i} className="px-2 py-1 font-semibold text-slate-400">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30">
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-2 py-1 text-slate-300">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Helper: build rekomendasi text dari statusTrend ─────────────────────────
function rekomendasiFromTrend(statusTrend) {
    if (statusTrend === 'naik') return 'Persediaan disarankan ditambah secara bertahap untuk mengantisipasi peningkatan permintaan.';
    if (statusTrend === 'turun') return 'Penambahan stok perlu dikurangi agar tidak terjadi penumpukan persediaan.';
    return 'Persediaan dapat dipertahankan mengikuti pola penjualan sebelumnya.';
}

// ─── Komponen Utama ──────────────────────────────────────────────────────────
/**
 * @param {Array}    modelingSeries  - data historis [{periode, quantity}, ...]
 * @param {string}   jenisKopiId     - ID jenis kopi
 * @param {string}   jenisKopiNama   - Nama jenis kopi (untuk label)
 * @param {string}   mode            - 'otomatis' | 'manual'
 * @param {number}   alpha           - parameter alpha (jika manual)
 * @param {number}   beta            - parameter beta  (jika manual)
 * @param {number}   gamma           - parameter gamma (jika manual)
 * @param {Function} onCancel        - Callback saat user klik Batal
 * @param {Function} onComplete      - Callback setelah berhasil simpan (opsional)
 */
export default function ForecastingTerminal({
    modelingSeries,
    jenisKopiId,
    jenisKopiNama = '',
    mode = 'otomatis',
    alpha,
    beta,
    gamma,
    onCancel,
    onComplete,
}) {
    const [phase, setPhase] = useState('idle');
    const [steps, setSteps] = useState(() =>
        STEP_ORDER.reduce((acc, k) => ({
            ...acc,
            [k]: { status: 'pending', message: '', stats: null, preview: null },
        }), {})
    );
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [expandedStep, setExpandedStep] = useState(null);

    const logsEndRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const appendLog = useCallback((line, type = 'info') => {
        const ts = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev, { id: Date.now() + Math.random(), ts, line, type }]);
    }, []);

    // ── Start SSE Stream ──────────────────────────────────────────────────
    const startProcessing = useCallback(async () => {
        if (!modelingSeries || modelingSeries.length === 0) return;

        setPhase('processing');
        setLogs([]);
        setResult(null);
        setErrorMsg('');
        setSteps(STEP_ORDER.reduce((acc, k) => ({
            ...acc,
            [k]: { status: 'pending', message: '', stats: null, preview: null },
        }), {}));
        setExpandedStep(null);

        appendLog(`Memulai peramalan Holt-Winters: "${jenisKopiNama || jenisKopiId}"`, 'info');
        appendLog(`Mode: ${mode} | Data: ${modelingSeries.length} bulan`, 'info');
        appendLog(`Menghubungi FastAPI → ${FASTAPI_URL}/api/forecast-stream`, 'dim');
        appendLog('─'.repeat(48), 'dim');

        const payload = {
            jenis_kopi: jenisKopiNama?.toLowerCase() || jenisKopiId,
            data: modelingSeries,
            mode,
            alpha: mode === 'manual' ? alpha : null,
            beta: mode === 'manual' ? beta : null,
            gamma: mode === 'manual' ? gamma : null,
        };

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const response = await fetch(`${FASTAPI_URL}/api/forecast-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
                throw new Error(errBody.detail || `HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const raw of lines) {
                    if (!raw.startsWith('data: ')) continue;
                    const jsonStr = raw.slice(6).trim();
                    if (!jsonStr) continue;

                    let event;
                    try { event = JSON.parse(jsonStr); }
                    catch { continue; }

                    if (event.type === 'step') {
                        const { step, status, message, stats, preview } = event;

                        setSteps(prev => ({
                            ...prev,
                            [step]: { status, message, stats: stats || null, preview: preview || null },
                        }));

                        const icon = status === 'done' ? '✓' : status === 'error' ? '✗' : '›';
                        const lType = status === 'error' ? 'error' : status === 'done' ? 'success' : 'running';
                        appendLog(`[${step}] ${icon} ${message}`, lType);

                        if (stats && status === 'done') {
                            Object.entries(stats).forEach(([k, v]) => {
                                const display = typeof v === 'object' ? JSON.stringify(v) : String(v);
                                appendLog(`        · ${k}: ${display}`, 'dim');
                            });
                        }

                    } else if (event.type === 'result') {
                        setResult(event);
                        setPhase('done');
                        appendLog('─'.repeat(48), 'dim');
                        appendLog(`✓ Peramalan selesai! MAPE: ${event.summary?.mape ?? '?'}%`, 'success');
                        if (event.summary) {
                            const s = event.summary;
                            appendLog(`  α=${s.alpha} β=${s.beta} γ=${s.gamma} | Tren: ${s.trend}`, 'dim');
                        }

                    } else if (event.type === 'error') {
                        setErrorMsg(event.message || 'Terjadi kesalahan tidak terduga.');
                        setPhase('error');
                        appendLog(`✗ ERROR: ${event.message}`, 'error');
                    }
                }
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                appendLog('⚠ Proses dibatalkan oleh pengguna.', 'warn');
                setPhase('idle');
            } else {
                const msg = err.message || 'Gagal terhubung ke FastAPI.';
                setErrorMsg(msg);
                setPhase('error');
                appendLog(`✗ ERROR: ${msg}`, 'error');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelingSeries, jenisKopiId, jenisKopiNama, mode, alpha, beta, gamma, appendLog]);

    const handleAbort = () => abortRef.current?.abort();

    // ── Teruskan hasil ke parent (Forecast.jsx) ───────────────────────────
    const handleSave = useCallback(() => {
        if (!result) return;
        if (onComplete) {
            onComplete(result);
        }
    }, [result, onComplete]);

    // ── Derived ───────────────────────────────────────────────────────────
    const doneCount = STEP_ORDER.filter(k => steps[k].status === 'done').length;
    const progress = Math.round((doneCount / STEP_ORDER.length) * 100);

    const statusLabel = {
        idle: 'Siap',
        processing: 'Memproses...',
        done: 'Selesai',
        error: 'Error',
    }[phase];

    const statusColor = {
        idle: 'bg-slate-500',
        processing: 'animate-pulse bg-blue-400',
        done: 'bg-emerald-400',
        error: 'bg-red-400',
    }[phase];

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-3">

            {/* ── Header Status ── */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                    <span className="text-xs font-semibold text-slate-300">{statusLabel}</span>
                    {phase === 'processing' && (
                        <span className="text-[10px] text-slate-500">— {doneCount}/{STEP_ORDER.length} tahap</span>
                    )}
                </div>
                <span className="max-w-[200px] truncate font-mono text-[10px] text-slate-600" title={jenisKopiNama || jenisKopiId}>
                    {jenisKopiNama || jenisKopiId} | {mode}
                </span>
            </div>

            {/* ── Progress Bar ── */}
            <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* ── Steps Grid ── */}
            <div className="grid grid-cols-1 gap-1 overflow-y-auto max-h-[40vh] scrollbar-thin scrollbar-thumb-slate-700 pr-1">
                {STEP_ORDER.map((key) => {
                    const s = steps[key];
                    const cfg = STEP_CONFIG[key];
                    const isPending = s.status === 'pending';
                    const hasPreview = s.status === 'done' && s.preview != null;
                    const isExpanded = expandedStep === key;

                    return (
                        <div key={key}>
                            <div
                                className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition-all duration-300 ${s.status === 'running' ? 'bg-blue-950/60 ring-1 ring-blue-500/30' :
                                        s.status === 'done' ? 'bg-emerald-950/40' :
                                            s.status === 'error' ? 'bg-red-950/60 ring-1 ring-red-500/30' :
                                                'opacity-35'
                                    } ${hasPreview ? 'cursor-pointer' : ''}`}
                                onClick={() => hasPreview && setExpandedStep(isExpanded ? null : key)}
                                role={hasPreview ? 'button' : undefined}
                                tabIndex={hasPreview ? 0 : undefined}
                                onKeyDown={(e) => hasPreview && (e.key === 'Enter' || e.key === ' ') && setExpandedStep(isExpanded ? null : key)}
                            >
                                <StepStatusIcon status={s.status} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                                        <span className={`text-xs font-semibold ${isPending ? 'text-slate-500' : 'text-slate-200'}`}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-[10px] text-slate-600">{cfg.desc}</span>
                                    </div>
                                    {s.message && !isPending && (
                                        <p className={`mt-0.5 text-[10px] leading-tight ${s.status === 'error' ? 'text-red-400' :
                                                s.status === 'done' ? 'text-emerald-400/80' :
                                                    'text-blue-400/70'
                                            }`}>
                                            {s.message}
                                        </p>
                                    )}
                                    {s.stats && s.status === 'done' && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {Object.entries(s.stats)
                                                .filter(([, v]) => typeof v !== 'object')
                                                .map(([k, v]) => (
                                                    <StatBadge key={k} label={k} value={v} />
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* View Detail toggle */}
                                {hasPreview && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedStep(isExpanded ? null : key);
                                        }}
                                        className="mt-0.5 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                                        aria-label={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                                        title={isExpanded ? 'Tutup detail' : 'Klik untuk melihat cuplikan data'}
                                    >
                                        <span className="hidden sm:inline">{isExpanded ? 'Tutup' : 'Detail'}</span>
                                        <svg
                                            className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Accordion Panel */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                {isExpanded && <StepDetailPanel preview={s.preview} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Terminal Log ── */}
            <div
                className="h-40 overflow-y-auto rounded-lg bg-[#0d1117] px-3 py-2.5 font-mono text-[10px] shadow-inner ring-1 ring-slate-800/80 scrollbar-thin scrollbar-thumb-slate-700"
                aria-label="Log terminal peramalan"
            >
                {logs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-700">
                        <span>$ menunggu proses dimulai...</span>
                    </div>
                ) : (
                    logs.map((l) => (
                        <div
                            key={l.id}
                            className={`leading-[1.6] whitespace-pre-wrap break-all ${l.type === 'error' ? 'text-red-400' :
                                    l.type === 'success' ? 'text-emerald-400' :
                                        l.type === 'warn' ? 'text-amber-400' :
                                            l.type === 'running' ? 'text-blue-400' :
                                                l.type === 'dim' ? 'text-slate-700' :
                                                    'text-slate-400'
                                }`}
                        >
                            <span className="mr-2 select-none text-slate-800">{l.ts}</span>
                            {l.line}
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>

            {/* ── Error Banner ── */}
            {phase === 'error' && errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/50 px-3 py-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs leading-relaxed text-red-300">{errorMsg}</p>
                </div>
            )}

            {/* ── Result Summary ── */}
            {phase === 'done' && result?.summary && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-3 py-2">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">Ringkasan Peramalan</p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            ['MAPE', `${Number(result.summary.mape).toLocaleString('id-ID')}%`],
                            ['Akurasi', result.summary.akurasi_label],
                            ['Alpha', result.summary.alpha],
                            ['Beta', result.summary.beta],
                            ['Gamma', result.summary.gamma],
                            ['Tren', result.summary.trend],
                            ['Prediksi', `${result.summary.total_prediksi} bln`],
                        ].map(([k, v]) => (
                            <div key={k} className="text-center">
                                <div className="text-sm font-bold text-emerald-300">{v}</div>
                                <div className="text-[9px] text-slate-500">{k}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="rounded-full border border-slate-700 px-4 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300 disabled:opacity-40"
                >
                    {phase === 'done' ? 'Lewati' : 'Batal'}
                </button>

                <div className="flex items-center gap-2">
                    {phase === 'idle' && (
                        <button
                            type="button"
                            onClick={startProcessing}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                            Mulai Peramalan
                        </button>
                    )}

                    {phase === 'processing' && (
                        <button
                            type="button"
                            onClick={handleAbort}
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 px-4 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-950/50"
                        >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                            </svg>
                            Stop
                        </button>
                    )}

                    {phase === 'done' && (
                        <button
                            type="button"
                            onClick={handleSave}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-teal-500"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Tampilkan Hasil
                        </button>
                    )}

                    {phase === 'error' && (
                        <button
                            type="button"
                            onClick={startProcessing}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-600"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Coba Ulang
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
