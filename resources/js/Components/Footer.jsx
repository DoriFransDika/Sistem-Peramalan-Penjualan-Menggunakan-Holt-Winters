export default function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-slate-50 pt-16 pb-8 text-sm text-slate-600 transition-colors duration-300 dark:border-slate-800/70 dark:bg-slate-950 dark:text-slate-400">
            <div className="mx-auto max-w-6xl px-4 lg:px-6">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <img
                                src="/Logo.jpeg"
                                alt="Logo AGRORRA KOERINTJI"
                                className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200 shadow-sm dark:ring-slate-700/70"
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
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            Sistem informasi cerdas untuk memantau stok dan melakukan peramalan kebutuhan biji kopi guna
                            menjaga kualitas mutu dan kelancaran distribusi.
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                            Tautan
                        </h3>
                        <ul className="space-y-3 text-xs">
                            <li>
                                <a href="#tentang" className="transition hover:text-emerald-600 dark:hover:text-emerald-300">
                                    Tentang Kami
                                </a>
                            </li>
                            <li>
                                <a href="#alur" className="transition hover:text-emerald-600 dark:hover:text-emerald-300">
                                    Alur Proses
                                </a>
                            </li>
                            <li>
                                <a href="#fitur" className="transition hover:text-emerald-600 dark:hover:text-emerald-300">
                                    Fitur Sistem
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                            Kontak
                        </h3>
                        <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                            <li>📍 Kerinci, Jambi, Indonesia</li>
                            <li>✉️ info@agrorra.id</li>
                            <li>📞 +62 811 2233 4455</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs sm:flex-row dark:border-slate-800/80">
                    <p className="text-center sm:text-left">
                        © {new Date().getFullYear()} AGRORRA KOERINTJI. Semua hak cipta dilindungi.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <span>Dibangun dengan Laravel, React & Inertia.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

