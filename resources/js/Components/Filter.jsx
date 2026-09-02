const defaultOptions = ['Semua', 'Arabica', 'Robusta', 'Asalan'];

export default function Filter({ value, onChange, options = defaultOptions }) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-emerald-300/55 bg-[#FAFBFD]/95 px-3 py-1.5 text-xs text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:border-emerald-300/40 dark:bg-slate-950/60 dark:text-slate-200 dark:shadow-none">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900/90 dark:text-emerald-300/90">
                Filter Jenis Kopi
            </span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                translate="no"
                className="notranslate ml-2 rounded-full border border-[#D6DEE8] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#0F172A] outline-none ring-1 ring-[#D6DEE8] focus:border-emerald-400 focus:ring-emerald-400/50 dark:border-transparent dark:bg-slate-900/80 dark:text-emerald-100 dark:ring-slate-700/70 dark:focus:border-emerald-300 dark:focus:ring-emerald-300/70"
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    );
}
