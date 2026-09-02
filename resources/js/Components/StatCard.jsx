export default function StatCard({ title, value, caption, warning, accent = 'default' }) {
    const accentClasses =
        accent === 'emerald'
            ? 'border-emerald-300/70 bg-gradient-to-br from-emerald-50/95 to-[#FAFBFD] dark:border-emerald-300/50 dark:bg-emerald-500/10 dark:bg-none'
            : 'border-[#D0DAE6] bg-[#FAFBFD] dark:border-slate-700/80 dark:bg-slate-900/70';

    const shadowLight =
        'shadow-[0_10px_40px_-12px_rgba(15,23,42,0.14),0_4px_16px_-6px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16),0_6px_20px_-8px_rgba(15,23,42,0.1)]';
    const shadowDark = 'dark:shadow-[0_18px_40px_rgba(15,23,42,0.9)] dark:hover:shadow-[0_20px_44px_rgba(15,23,42,0.92)]';

    return (
        <div
            className={`group rounded-2xl border ${accentClasses} p-4 ${shadowLight} ${shadowDark} transition-all duration-300 ease-out hover:-translate-y-0.5 dark:hover:translate-y-0 dark:hover:shadow-[0_18px_40px_rgba(15,23,42,0.9)]`}
        >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800/95 dark:text-emerald-300/80">
                {title}
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#0B1220] dark:text-xl dark:font-semibold dark:text-slate-50">
                {value}
            </p>
            {caption && (
                <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[#475569] dark:font-normal dark:text-slate-400/90">
                    {caption}
                </p>
            )}
            {warning && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] font-medium leading-snug text-rose-600 dark:text-rose-400/90">
                    <span>🚨</span>
                    <span>{warning}</span>
                </p>
            )}
        </div>
    );
}

