export default function ManagementRecommendation({ message }) {
    return (
        <div className="rounded-2xl border border-[#D0DAE6] bg-gradient-to-br from-[#FAFBFD] via-white to-emerald-50/40 p-4 text-xs leading-relaxed text-[#0B1220] shadow-[0_10px_36px_-12px_rgba(15,23,42,0.12),0_3px_12px_-6px_rgba(5,100,70,0.06)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14)] dark:border-slate-800/80 dark:from-slate-950/90 dark:via-slate-950 dark:to-emerald-950/30 dark:text-slate-100 dark:shadow-[0_18px_50px_rgba(15,23,42,0.9)] dark:hover:translate-y-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900 dark:text-emerald-300/90">
                Rekomendasi Manajemen
            </p>
            <p className="mt-2.5 font-medium text-[#1E293B] dark:font-normal dark:text-slate-200">{message}</p>
        </div>
    );
}
