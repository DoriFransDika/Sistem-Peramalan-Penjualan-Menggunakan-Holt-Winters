export default function AppFooter() {
    return (
        <footer className="mt-auto border-t border-slate-200/60 bg-white/50 px-4 py-4 backdrop-blur-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/50 print:hidden sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 sm:flex-row">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    Sistem Peramalan Persediaan Kopi Terintegrasi
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    &copy; 2026 Agrorra Koerintji. All Rights Reserved.
                </span>
            </div>
        </footer>
    );
}
