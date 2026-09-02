import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ auth, loginUrl, dashboardUrl }) {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const navClasses = [
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300 backdrop-blur',
        scrolled ? 'bg-white/80 shadow-md shadow-slate-200/50 dark:bg-slate-950/80 dark:shadow-slate-900/40' : 'bg-transparent',
    ].join(' ');

    const scrollToId = (id) => {
        const el = document.getElementById(id);
        if (!el) return;

        const offset = 80;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        setOpen(false);
    };

    return (
        <header className={navClasses}>
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <img
                        src="/Logo.jpeg"
                        alt="Logo AGRORRA KOERINTJI"
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200 shadow-sm shadow-slate-200/50 dark:ring-slate-700/70 dark:shadow-lg dark:shadow-slate-900/60"
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/90 dark:text-emerald-300/90">
                            AGRORRA
                        </span>
                        <span className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-50">
                            KOERINTJI
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 lg:hidden">
                    <ThemeToggle />
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm shadow-slate-200/50 transition hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-md dark:shadow-slate-900/70 dark:hover:bg-slate-800"
                        onClick={() => setOpen((prev) => !prev)}
                        aria-label="Toggle navigation"
                    >
                        <span className="sr-only">Toggle navigation</span>
                        <span className="h-0.5 w-4 rounded-full bg-slate-800 dark:bg-slate-100 transition-all" />
                    </button>
                </div>

                <div className="hidden items-center gap-8 text-sm font-medium text-slate-800 dark:text-slate-100 lg:flex">
                    <button
                        type="button"
                        onClick={() => scrollToId('tentang')}
                        className="transition hover:text-emerald-600 dark:hover:text-emerald-300"
                    >
                        Tentang Kami
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToId('alur')}
                        className="transition hover:text-emerald-600 dark:hover:text-emerald-300"
                    >
                        Alur Proses
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToId('fitur')}
                        className="transition hover:text-emerald-600 dark:hover:text-emerald-300"
                    >
                        Fitur Sistem
                    </button>
                    {loginUrl && (
                        <Link
                            href={auth?.user && dashboardUrl ? dashboardUrl : loginUrl}
                            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-slate-200/40 transition hover:-translate-y-0.5 hover:bg-emerald-600 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-900/40 dark:hover:bg-emerald-300 dark:hover:text-slate-950"
                        >
                            Login Sistem
                        </Link>
                    )}
                    <ThemeToggle />
                </div>
            </nav>

            {open && (
                <div className="border-t border-slate-200 bg-white/95 dark:border-slate-800/80 dark:bg-slate-950/95 lg:hidden">
                    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-sm font-medium text-slate-800 dark:text-slate-100">
                        <button
                            type="button"
                            onClick={() => scrollToId('tentang')}
                            className="text-left transition hover:text-emerald-600 dark:hover:text-emerald-300"
                        >
                            Tentang Kami
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToId('alur')}
                            className="text-left transition hover:text-emerald-600 dark:hover:text-emerald-300"
                        >
                            Alur Proses
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToId('fitur')}
                            className="text-left transition hover:text-emerald-600 dark:hover:text-emerald-300"
                        >
                            Fitur Sistem
                        </button>
                        {loginUrl && (
                            <Link
                                href={auth?.user && dashboardUrl ? dashboardUrl : loginUrl}
                                className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-200/40 transition hover:-translate-y-0.5 hover:bg-emerald-600 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-900/40 dark:hover:bg-emerald-300 dark:hover:text-slate-950"
                            >
                                Login Sistem
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

