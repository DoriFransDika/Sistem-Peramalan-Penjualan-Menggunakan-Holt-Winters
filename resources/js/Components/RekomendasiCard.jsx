/**
 * RekomendasiCard
 * Menampilkan teks rekomendasi bisnis DSS dari backend.
 * Props:
 *  - teks     : string dari API (rekomendasi_bisnis)
 *  - jenis    : nama jenis kopi (opsional, untuk header multi)
 *  - isLoading: bool — tampilkan skeleton "Menganalisis tren masa depan..."
 */
export default function RekomendasiCard({ teks, jenis, isLoading = false }) {
    const getIcon = (seg) => {
        if (seg.includes("KENAIKAN"))   return { icon: "📈", color: "emerald" };
        if (seg.includes("PENURUNAN"))  return { icon: "📉", color: "rose" };
        if (seg.includes("STABIL"))     return { icon: "➡️", color: "sky" };
        if (seg.includes("Puncak"))     return { icon: "⚠️", color: "amber" };
        if (seg.includes("Peringatan")) return { icon: "🚨", color: "rose" };
        return { icon: "💡", color: "slate" };
    };

    const colorMap = {
        emerald: {
            bg:     "bg-emerald-50 dark:bg-emerald-950/30",
            border: "border-emerald-300/60 dark:border-emerald-600/30",
            text:   "text-emerald-900 dark:text-emerald-200",
        },
        rose: {
            bg:     "bg-rose-50 dark:bg-rose-950/30",
            border: "border-rose-300/60 dark:border-rose-500/30",
            text:   "text-rose-900 dark:text-rose-200",
        },
        amber: {
            bg:     "bg-amber-50 dark:bg-amber-950/30",
            border: "border-amber-300/60 dark:border-amber-500/30",
            text:   "text-amber-900 dark:text-amber-200",
        },
        sky: {
            bg:     "bg-sky-50 dark:bg-sky-950/30",
            border: "border-sky-300/60 dark:border-sky-500/30",
            text:   "text-sky-900 dark:text-sky-200",
        },
        slate: {
            bg:     "bg-slate-50 dark:bg-slate-900/50",
            border: "border-slate-200 dark:border-slate-700",
            text:   "text-slate-800 dark:text-slate-300",
        },
    };

    // Fallback: jika tidak ada teks rekomendasi, tampilkan pesan statis
    const hasTeks = Boolean(teks && teks.trim());
    const segments = hasTeks ? teks.split(" | ").filter(Boolean) : [];

    return (
        <div className="rounded-2xl border border-[#D6DEE8] bg-gradient-to-br from-[#FAFBFD] to-[#F1F5F9] p-3.5 shadow-md transition-colors duration-300 dark:border-slate-700/60 dark:from-slate-900/60 dark:to-slate-950/80 dark:shadow-lg dark:shadow-black/25">
            {/* ── Header ── */}
            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                        Rekomendasi Keputusan Bisnis
                        {jenis ? <span className="notranslate ml-1.5 text-xs font-normal normal-case tracking-normal capitalize text-[#64748B] dark:text-slate-400" translate="no">({jenis})</span> : null}
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Analisis otomatis berbasis 6 bulan prediksi ke depan
                    </p>
                </div>
            </div>

            {/* ── Loading skeleton ── */}
            {isLoading ? (
                <div className="space-y-2.5">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <span className="mt-0.5 shrink-0 text-base leading-none">
                            <svg className="h-5 w-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium text-[#64748B] dark:text-slate-400 italic">
                            Menganalisis tren masa depan...
                        </span>
                    </div>
                    {/* Shimmer bars */}
                    <div className="h-10 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
                    <div className="h-10 animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-800/40" style={{ animationDelay: "150ms" }} />
                </div>
            ) : !hasTeks ? (
                /* ── Fallback: belum ada data peramalan ── */
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    <span className="mt-0.5 shrink-0 text-base leading-none">ℹ️</span>
                    <span>Belum ada data peramalan untuk jenis kopi ini. Silakan klik <strong>"Jalankan Peramalan"</strong> untuk menghasilkan rekomendasi.</span>
                </div>
            ) : (
                /* ── Segmen Rekomendasi ── */
                <div className="space-y-2.5">
                    {segments.map((seg, idx) => {
                        const { icon, color } = getIcon(seg);
                        const cls = colorMap[color] ?? colorMap.slate;
                        return (
                            <div
                                key={idx}
                                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-xs font-medium leading-relaxed ${cls.bg} ${cls.border} ${cls.text}`}
                            >
                                <span className="mt-0.5 shrink-0 text-base leading-none">{icon}</span>
                                <span>{seg.replace(/^[📈📉➡️⚠️🚨💡]\s*/, "")}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Footer note ── */}
            <p className="mt-2 text-[10px] text-[#94A3B8] dark:text-slate-500">
                ⓘ Rekomendasi ini bersifat indikatif. Keputusan akhir tetap pada pertimbangan manajerial.
            </p>
        </div>
    );
}