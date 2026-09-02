export default function Notification({ message, title = 'Notifikasi Model', variant = 'info' }) {
    const isWarning = variant === 'warning';

    const containerCls = isWarning
        ? 'border-rose-300/70 from-rose-50/95 to-[#FFF0F2] dark:border-rose-500/40 dark:from-rose-500/10 dark:to-rose-500/5 dark:text-rose-50 dark:shadow-[0_18px_50px_rgba(225,29,72,0.3)] dark:hover:shadow-[0_18px_50px_rgba(225,29,72,0.3)]'
        : 'border-sky-200/90 from-sky-50/95 to-[#F5F9FC] dark:border-sky-400/40 dark:from-sky-500/10 dark:to-sky-500/5 dark:text-sky-50 dark:shadow-[0_18px_50px_rgba(56,189,248,0.4)] dark:hover:shadow-[0_18px_50px_rgba(56,189,248,0.4)]';

    const titleCls = isWarning
        ? 'text-rose-900 dark:text-rose-200'
        : 'text-sky-900 dark:text-sky-200';

    const textCls = isWarning
        ? 'text-rose-800 dark:font-normal dark:text-rose-50/95'
        : 'text-[#1E293B] dark:font-normal dark:text-sky-50/95';

    return (
        <div className={`rounded-2xl border bg-gradient-to-br p-3 text-xs leading-relaxed text-[#0B1220] shadow-[0_10px_36px_-12px_rgba(15,23,42,0.12),0_3px_12px_-6px_rgba(14,116,144,0.08)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14)] dark:hover:translate-y-0 ${containerCls}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${titleCls}`}>
                {isWarning ? '🚨 ' : ''}{title}
            </p>
            <p className={`mt-1.5 font-medium ${textCls}`}>{message}</p>
        </div>
    );
}
