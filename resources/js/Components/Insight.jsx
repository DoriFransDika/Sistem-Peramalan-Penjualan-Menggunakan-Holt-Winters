export default function Insight({ message }) {
    return (
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 via-[#FAFBFD] to-[#F4FAF8] p-4 text-xs leading-relaxed text-[#0B1220] shadow-[0_10px_36px_-12px_rgba(15,23,42,0.12),0_3px_12px_-6px_rgba(5,100,70,0.07)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14)] dark:border-emerald-400/40 dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-slate-950/90 dark:text-emerald-50 dark:shadow-[0_18px_50px_rgba(16,185,129,0.45)] dark:hover:translate-y-0 dark:hover:shadow-[0_18px_50px_rgba(16,185,129,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900 dark:text-emerald-200">
                Ringkasan Peramalan
            </p>
            <p className="mt-2.5 font-medium text-[#1E293B] dark:font-normal dark:text-emerald-50/95">{message}</p>
        </div>
    );
}
