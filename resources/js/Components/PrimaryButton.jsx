export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center rounded-full border border-emerald-600/20 bg-emerald-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_4px_14px_rgba(5,120,85,0.28),0_1px_2px_rgba(15,23,42,0.06)] transition duration-200 ease-out hover:-translate-y-px hover:bg-emerald-600 hover:shadow-[0_6px_20px_rgba(5,120,85,0.32),0_2px_4px_rgba(15,23,42,0.08)] focus:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0 active:translate-y-0 active:bg-emerald-700 dark:border-transparent dark:bg-emerald-400 dark:text-slate-950 dark:shadow-[0_16px_40px_rgba(16,185,129,0.45)] dark:hover:-translate-y-0.5 dark:hover:bg-emerald-300 dark:hover:shadow-[0_18px_44px_rgba(16,185,129,0.5)] dark:focus:ring-emerald-300/80 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
