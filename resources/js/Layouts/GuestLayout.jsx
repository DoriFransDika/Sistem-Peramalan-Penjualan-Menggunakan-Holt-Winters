import { Link } from '@inertiajs/react';
import ThemeToggle from '@/Components/ThemeToggle';

export default function GuestLayout({ children }) {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50 text-slate-900 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900/70 dark:text-slate-50">
            {/* Theme Toggle di pojok kanan atas */}
            <div className="absolute right-4 top-4 z-20">
                <ThemeToggle />
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-multiply dark:mix-blend-screen transition-all duration-300">
                <div className="absolute -left-32 -top-40 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl dark:bg-emerald-500/25" />
                <div className="absolute bottom-0 right-[-6rem] h-96 w-96 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/15" />
            </div>

            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
                <div className="mb-6 flex flex-col items-center gap-3">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/Logo.jpeg"
                            alt="Logo AGRORRA KOERINTJI"
                            className="h-11 w-11 rounded-full object-cover ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-900/20 dark:shadow-emerald-900/60"
                        />
                        <div className="flex flex-col">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300/90">
                                AGRORRA
                            </span>
                            <span className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-50">
                                KOERINTJI
                            </span>
                        </div>
                    </Link>
                    <p className="text-xs text-slate-600 dark:text-slate-300/80">
                        Masuk ke sistem forecasting persediaan kopi.
                    </p>
                </div>

                <div className="w-full max-w-md rounded-2xl border border-emerald-300/60 bg-white/95 px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur transition-colors duration-300 dark:border-emerald-300/30 dark:bg-slate-950/90 dark:shadow-[0_24px_60px_rgba(15,23,42,0.9)]">
                    {children}
                </div>
            </div>
        </div>
    );
}
