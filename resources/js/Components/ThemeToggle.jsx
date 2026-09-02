import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';
import TranslateWidget from './TranslateWidget';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className={`flex items-center gap-2 shrink-0 ${className}`}>
            <TranslateWidget />
            <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-[#C9D4E3] bg-[#FAFBFD] px-2.5 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:border-emerald-300/70 hover:bg-[#F4FAF8] hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)] active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-200 dark:shadow-none dark:hover:border-emerald-500/35 dark:hover:bg-slate-800/90"
                aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            aria-pressed={isDark}
        >
            <span className="sr-only">{isDark ? 'Mode terang' : 'Mode gelap'}</span>
            {isDark ? (
                <SunIcon className="h-3.5 w-3.5 text-amber-300/95 transition-transform duration-300 ease-out" />
            ) : (
                <MoonIcon className="h-3.5 w-3.5 text-emerald-700 transition-transform duration-300 ease-out" />
            )}
        </button>
        </div>
    );
}
