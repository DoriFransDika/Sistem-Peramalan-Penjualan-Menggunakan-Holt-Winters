import { useState, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

// ── Warna Kontras Tinggi per Jenis Kopi ──────────────────────────────────────
// Aktual  = warna solid/gelap + strokeWidth tebal
// Forecast = warna pudar/muda + putus-putus
const KOPI_COLORS = {
    arabica: { solid: "#1f77b4", dash: "#85c1e9" }, // Biru Tua → Biru Muda/Cyan
    robusta: { solid: "#ff7f0e", dash: "#f8c471" }, // Oranye Tua → Kuning/Oranye Muda
    asalan: { solid: "#d62728", dash: "#f1948a" }, // Merah Tua → Pink/Merah Muda
};

const TIME_RANGE_OPTIONS = [
    { label: "9 Bln", months: 9 },
    { label: "1 Thn", months: 12 },
    { label: "2 Thn", months: 24 },
    { label: "3 Thn", months: 36 },
];

function TimeRangeFilter({ value, onChange }) {
    return (
        <div className="flex items-center gap-1">
            {TIME_RANGE_OPTIONS.map((opt) => {
                const isActive = value === opt.months;
                return (
                    <button
                        key={opt.months}
                        type="button"
                        onClick={() => onChange(opt.months)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${isActive
                                ? "bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-400/40"
                                : "text-[#64748B] hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function CustomTooltip({ active, payload, label, isDark }) {
    if (!active || !payload?.length) return null;
    const bg = isDark ? "#020617" : "#F8FAFC";
    const border = isDark ? "#1e293b" : "#D6DEE8";
    const clr = isDark ? "#e2e8f0" : "#1E293B";
    return (
        <div className="notranslate" style={{ backgroundColor: bg, borderColor: border, borderWidth: 1, borderStyle: "solid", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: clr, minWidth: 170, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
            {payload.map((entry) => {
                if (entry.value === null || entry.value === undefined) return null;
                return (
                    <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
                        <span style={{ color: isDark ? "#94a3b8" : "#475569" }}>{entry.name}:</span>
                        <span style={{ fontWeight: 600, marginLeft: "auto", paddingLeft: 8 }}>
                            {typeof entry.value === "number"
                                ? entry.value.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                : entry.value} kg
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// KOPI_LABELS: nama tampilan per jenis untuk legend ringkas (3 label saja)
const KOPI_LABELS = [
    { key: "arabica", label: "Arabica", color: KOPI_COLORS.arabica.solid },
    { key: "robusta", label: "Robusta", color: KOPI_COLORS.robusta.solid },
    { key: "asalan", label: "Asalan", color: KOPI_COLORS.asalan.solid },
];

function CustomLegend({ payload, tickFill }) {
    if (!payload?.length) return null;

    // Deteksi apakah payload menggunakan key 6-garis (forecast_aktual multi mode)
    // yaitu ada entry dengan dataKey berformat "{jenis}_aktual" atau "{jenis}_forecast"
    const isSixLine = payload.some(
        (e) => e.dataKey && (e.dataKey.endsWith("_aktual") || e.dataKey.endsWith("_forecast"))
    );

    // Mode 6 garis → tampilkan hanya 3 label ringkas (Arabica, Robusta, Asalan)
    // dengan ikon: warna solid (kotak) + garis putus di sebelahnya
    if (isSixLine) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    fontSize: 11,
                    fontWeight: 500,
                    color: tickFill,
                    paddingTop: 6,
                }}
            >
                {KOPI_LABELS.map(({ key, label, color }) => (
                    <span
                        key={key}
                        className="notranslate"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                        {/* Warna aktual: garis solid */}
                        <span style={{ display: "inline-block", width: 12, height: 3, borderRadius: 2, backgroundColor: color }} />
                        {/* Warna forecast: garis putus */}
                        <span style={{
                            display: "inline-block", width: 10, height: 3, borderRadius: 1,
                            background: `repeating-linear-gradient(to right, ${KOPI_COLORS[key].dash} 0px, ${KOPI_COLORS[key].dash} 4px, transparent 4px, transparent 7px)`,
                        }} />
                        {label}
                    </span>
                ))}
            </div>
        );
    }

    // Mode default: tampilkan semua entry apa adanya (mode single atau simple)
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                flexWrap: "wrap",
                fontSize: 11,
                fontWeight: 500,
                color: tickFill,
                paddingTop: 6,
            }}
        >
            {payload.map((entry, idx) => (
                <span
                    key={`legend-${idx}`}
                    className="notranslate"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            width: 14,
                            height: 3,
                            borderRadius: 2,
                            backgroundColor: entry.color,
                        }}
                    />
                    {entry.value}
                </span>
            ))}
        </div>
    );
}

// ── Hitung interval dinamis untuk XAxis ─────────────────────────────────────
// Agar jarak antar label bulan selalu equidistant (tidak dempet, tidak lompat-lompat).
function computeXInterval(dataLength) {
    if (dataLength <= 8) return 0;      // tampilkan semua
    if (dataLength <= 14) return 1;     // loncat 1
    if (dataLength <= 24) return 2;     // loncat 2
    return Math.ceil(dataLength / 10);  // fallback proporsional
}

export default function ForecastChart({
    data,
    mode = "single",
    // multiKeyStyle: 'forecast_aktual' (Forecast.jsx) → arabica_aktual + arabica_forecast
    //               'simple'          (Dashboard)    → arabica (satu nilai, forecast dari DB)
    multiKeyStyle = "forecast_aktual",
    xDataKey = "tanggal",
    actualKey = "aktual",
    forecastKey = "forecast",
    headerRight,
    chartBodyClassName = "min-h-0 flex-1",
    subtitle,
}) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const isMulti = mode === "multi";

    const [timeRange, setTimeRange] = useState(9);

    const gridStroke = isDark ? "#1f2937" : "#E8EDF4";
    const axisStroke = isDark ? "#9ca3af" : "#64748b";
    const tickFill = isDark ? "#9ca3af" : "#475569";

    const title = isMulti
        ? "Grafik Multi-Series per Jenis Kopi"
        : "Grafik Penjualan vs Peramalan";
    const defaultSubtitle = isMulti
        ? "Garis solid = Data Aktual  ·  Garis putus-putus = Forecast (overlap 3 bln + prediksi 6 bln)"
        : "Hijau solid = Aktual  ·  Kuning putus = In-Sample Overlap + Forecast";
    const subtitleText = subtitle !== undefined ? subtitle : defaultSubtitle;

    const slicedData = useMemo(() => {
        if (!data?.length) return [];

        // ── Strategi pemotongan berdasarkan sort_date ─────────────────────────
        // sort_date tersedia dari backend pada setiap row (format: "YYYY-MM-DD").
        // Pendekatan ini akurat untuk data dengan celah (gap) antar bulan.
        //
        // Aturan:
        //  1. Anchor  = tanggal paling akhir di array (elemen terakhir).
        //  2. Start   = anchor mundur N bulan sesuai tombol timeRange.
        //  3. Filter  = simpan row dengan sort_date >= startDate (TANPA batas akhir).
        //               Garis forecast masa depan tetap muncul utuh.
        // ─────────────────────────────────────────────────────────────────────

        const lastRow = data[data.length - 1];
        const anchorStr = lastRow?.sort_date;

        if (anchorStr) {
            // ── Path utama: gunakan sort_date untuk presisi tanggal ──────────
            // Aturan 2: Anchor = tanggal paling akhir di array (bukan new Date())
            //
            // PENTING: sort_date format "YYYY-MM-DD" — jangan gunakan new Date(string)
            // karena ISO string diperlakukan sebagai UTC midnight dan akan bergeser
            // menjadi hari sebelumnya di timezone UTC+7 (WIB).
            // Solusi: gunakan Date.UTC() dengan split manual → timezone-safe.
            const parseDate = (str) => {
                const [y, m, d] = str.split('-').map(Number);
                return new Date(Date.UTC(y, m - 1, d ?? 1));
            };

            const anchor = parseDate(anchorStr);

            // Aturan 3: Hitung startDate mundur dari anchor
            // Operasi setMonth pada UTC date — gunakan UTC methods untuk konsistensi
            const startDate = new Date(anchor);
            startDate.setUTCMonth(startDate.getUTCMonth() - timeRange);
            startDate.setUTCDate(1); // normalisasi ke hari pertama bulan

            // Aturan 4: Filter tanpa batas akhir — simpan semua row >= startDate
            return data.filter((row) => {
                if (!row.sort_date) return true; // baris tanpa sort_date tetap tampil
                const rowDate = parseDate(row.sort_date);
                return rowDate >= startDate;
                // Tidak ada endDate → garis forecast masa depan tidak terpotong
            });
        }

        // ── Fallback: sort_date tidak tersedia, gunakan slice berbasis index ──
        // (Dipertahankan untuk kompatibilitas dengan data lama / Forecast.jsx)
        const isForecastAktualMulti = mode === "multi" && multiKeyStyle === "forecast_aktual";
        const isSimpleMulti = mode === "multi" && multiKeyStyle === "simple";
        let forecastCount = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            const row = data[i];
            let hasActual;
            if (isSimpleMulti) {
                hasActual = ["arabica", "robusta", "asalan"]
                    .some((k) => row[k] !== null && row[k] !== undefined);
            } else if (isForecastAktualMulti) {
                hasActual = ["arabica_aktual", "robusta_aktual", "asalan_aktual"]
                    .some((k) => row[k] !== null && row[k] !== undefined);
            } else {
                hasActual = row[actualKey] !== null && row[actualKey] !== undefined;
            }
            if (!hasActual) forecastCount++;
            else break;
        }
        return data.slice(Math.max(0, data.length - (timeRange + forecastCount)));
    }, [data, timeRange, actualKey, mode, multiKeyStyle]);

    // ── Data langsung tanpa manipulasi ────────────────────────────────────────
    // Tidak ada lagi "fake overlap" (menyalin aktual → forecast).
    // Semua nilai actual, in_sample, dan forecast 100% berasal dari backend.
    // Jika forecast belum ada di DB → key-nya null → garis kuning tidak muncul.
    // Jika in_sample ada (fitted value dari model) → garis kuning overlap tampil natural.
    const chartReadyData = slicedData;

    return (
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#D0DAE6] bg-[#FAFBFD] p-4 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12),0_4px_16px_-6px_rgba(15,23,42,0.07)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-12px_rgba(15,23,42,0.14)] dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-[0_24px_60px_rgba(15,23,42,0.9)] dark:hover:translate-y-0 dark:hover:shadow-[0_24px_60px_rgba(15,23,42,0.9)]">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800/95 dark:text-xs dark:font-medium dark:tracking-[0.2em] dark:text-emerald-300/80">
                        {title}
                    </p>
                    {subtitleText ? (
                        <p className="notranslate mt-1 text-[11px] font-medium leading-relaxed text-[#475569] dark:font-normal dark:text-slate-400/90" translate="no">
                            {subtitleText}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
                    {headerRight ? <div className="flex items-center text-[11px]">{headerRight}</div> : null}
                </div>
            </div>

            <div className={chartBodyClassName}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartReadyData} margin={{ left: -12, right: 8, top: 4, bottom: 22 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis
                            dataKey={xDataKey}
                            stroke={axisStroke}
                            tick={{ fill: tickFill, fontSize: 11, fontWeight: 500 }}
                            tickLine={{ stroke: axisStroke }}
                            axisLine={{ stroke: gridStroke }}
                            interval={computeXInterval(chartReadyData?.length ?? 0)}
                        />
                        <YAxis
                            stroke={axisStroke}
                            tick={{ fill: tickFill, fontSize: 11, fontWeight: 500 }}
                            tickLine={{ stroke: axisStroke }}
                            axisLine={{ stroke: gridStroke }}
                            tickFormatter={(v) =>
                                typeof v === "number" ? v.toLocaleString("id-ID") : v
                            }
                        />
                        <Tooltip content={<CustomTooltip isDark={isDark} />} />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            height={32}
                            content={<CustomLegend tickFill={tickFill} />}
                        />

                        {isMulti ? (
                            <>
                                {multiKeyStyle === "simple" ? (
                                    // ── Dashboard mode: satu garis per kopi (hanya forecast dari DB) ──
                                    // Menggunakan key langsung: arabica, robusta, asalan
                                    // connectNulls=true agar garis tidak putus jika ada bulan kosong
                                    ["arabica", "robusta", "asalan"].map((kopi) => (
                                        <Line
                                            key={kopi}
                                            type="monotone"
                                            dataKey={kopi}
                                            name={kopi.charAt(0).toUpperCase() + kopi.slice(1)}
                                            stroke={KOPI_COLORS[kopi].solid}
                                            strokeWidth={2.5}
                                            strokeDasharray="6 4"
                                            dot={{ r: 3, strokeWidth: 2, stroke: KOPI_COLORS[kopi].solid, fill: KOPI_COLORS[kopi].solid }}
                                            activeDot={{ r: 5 }}
                                            connectNulls={true}
                                        />
                                    ))
                                ) : (
                                    // ── Forecast.jsx mode: aktual solid + forecast putus-putus ──
                                    // Key: arabica_aktual + arabica_forecast
                                    <>
                                        {/* Garis Aktual: solid, tebal */}
                                        {["arabica", "robusta", "asalan"].map((kopi) => (
                                            <Line
                                                key={`${kopi}_aktual`}
                                                type="monotone"
                                                dataKey={`${kopi}_aktual`}
                                                name={`${kopi.charAt(0).toUpperCase() + kopi.slice(1)} (Aktual)`}
                                                stroke={KOPI_COLORS[kopi].solid}
                                                strokeWidth={2.5}
                                                dot={{ r: 3, strokeWidth: 2, stroke: KOPI_COLORS[kopi].solid, fill: KOPI_COLORS[kopi].solid }}
                                                activeDot={{ r: 5 }}
                                                connectNulls={false}
                                            />
                                        ))}
                                        {/* Garis Forecast: putus-putus, warna pudar, connectNulls=true */}
                                        {["arabica", "robusta", "asalan"].map((kopi) => (
                                            <Line
                                                key={`${kopi}_forecast`}
                                                type="monotone"
                                                dataKey={`${kopi}_forecast`}
                                                name={`${kopi.charAt(0).toUpperCase() + kopi.slice(1)} (Forecast)`}
                                                stroke={KOPI_COLORS[kopi].dash}
                                                strokeWidth={2}
                                                strokeDasharray="6 4"
                                                dot={{ r: 2.5, strokeWidth: 2, stroke: KOPI_COLORS[kopi].dash, fill: KOPI_COLORS[kopi].dash }}
                                                activeDot={{ r: 4 }}
                                                connectNulls={true}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Garis Aktual: hijau solid */}
                                <Line
                                    type="monotone"
                                    dataKey={actualKey}
                                    name="Data Aktual"
                                    stroke="#22c55e"
                                    strokeWidth={2.4}
                                    dot={{ r: 3.5, strokeWidth: 2, stroke: "#22c55e", fill: "#22c55e" }}
                                    activeDot={{ r: 5 }}
                                    connectNulls={false}
                                />
                                {/* Garis Forecast: kuning putus-putus, connectNulls=true
                                    agar nilai overlap 3 bln → 6 bln prediksi menyambung */}
                                <Line
                                    type="monotone"
                                    dataKey={forecastKey}
                                    name="Forecast"
                                    stroke="#f59e0b"
                                    strokeWidth={2.2}
                                    strokeDasharray="6 4"
                                    dot={{ r: 3.5, strokeWidth: 2, stroke: "#f59e0b", fill: "#f59e0b" }}
                                    activeDot={{ r: 5 }}
                                    connectNulls={true}
                                />
                            </>
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}