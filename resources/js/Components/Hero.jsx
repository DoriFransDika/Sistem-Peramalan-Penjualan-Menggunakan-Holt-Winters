import { Link } from '@inertiajs/react';

export default function Hero({ dashboardUrl }) {
    return (
        <section
            id="hero"
            className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50 pt-28 pb-20 text-slate-900 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900/70 dark:text-slate-50"
        >
            <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
                <div className="absolute -left-32 -top-40 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute bottom-0 right-[-6rem] h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
            </div>

            <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 lg:flex-row lg:items-center lg:px-6">
                <div className="relative z-10 max-w-xl space-y-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/90 dark:text-emerald-300/90">
                        AGROFORESTRY GOENOENG RAJA KOERINTJI
                    </p>

                    <h1 className="text-balance text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl">
                        Optimasi Persediaan{' '}
                        <span className="bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-600 dark:from-emerald-300 dark:via-amber-200 dark:to-emerald-400 bg-clip-text text-transparent">
                            Kopi Berkualitas
                        </span>
                    </h1>

                    <p className="max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-200/80 sm:text-base">
                        Sistem informasi cerdas untuk memantau stok dan melakukan peramalan kebutuhan biji kopi guna
                        menjaga kualitas mutu dan kelancaran distribusi.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                        {dashboardUrl && (
                            <Link
                                href={dashboardUrl}
                                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-[0_18px_45px_rgba(16,185,129,0.45)] dark:hover:bg-emerald-300 dark:focus-visible:ring-emerald-300/80"
                            >
                                Mulai Peramalan
                            </Link>
                        )}
                        <a
                            href="#alur"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-600 dark:border-emerald-300/60 dark:bg-slate-950/20 dark:text-emerald-100 dark:shadow-lg dark:shadow-slate-950/70 dark:hover:border-emerald-200 dark:hover:text-emerald-200"
                        >
                            Pelajari Metode
                        </a>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300/80">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700/70">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            Monitoring stok real-time
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:ring-slate-800/70">
                            Peramalan permintaan harian & mingguan
                        </span>
                    </div>
                </div>

                <div className="relative z-10 flex flex-1 items-center justify-center">
                    <div className="group relative w-full max-w-md">
                        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-emerald-500/40 via-amber-400/10 to-slate-900/0 blur-2xl transition duration-700 group-hover:scale-110" />

                        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-emerald-200/20 dark:bg-gradient-to-b dark:from-slate-900/70 dark:to-slate-950/90 dark:shadow-[0_30px_80px_rgba(15,23,42,0.9)]">
                            <div className="flex items-center justify-between px-4 py-3 text-[10px] text-slate-500 dark:text-slate-300/80">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                    <span className="uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-200/80">
                                        Kontrol Mutu
                                    </span>
                                </div>
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-700 dark:bg-slate-900/70 dark:text-amber-200/90">
                                    Terstandarisasi
                                </span>
                            </div>

                            <div className="grid gap-4 border-t border-slate-100 bg-slate-50 px-4 py-5 dark:border-slate-800/80 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/80 sm:grid-cols-[1.15fr_minmax(0,1fr)]">
                                <div className="space-y-4">
                                    <div className="rounded-2xl bg-white p-3 text-[11px] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/70 dark:shadow-inner dark:shadow-slate-950/60 dark:ring-slate-800/80">
                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                            Perkebunan Kopi Koerintji
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-300/80">
                                            Peramalan stok aman <span className="font-semibold text-slate-700 dark:text-white">14 hari</span>{' '}
                                            ke depan.
                                        </p>
                                        <div className="mt-3 flex items-center justify-between text-[10px]">
                                            <span className="text-slate-500 dark:text-slate-400">Stok saat ini</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-300">1.240 kg</span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                                        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/80 dark:shadow-none dark:ring-slate-800/80">
                                            <p className="text-slate-600 dark:text-slate-300/90">Peramalan panen</p>
                                            <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-300">
                                                +18%
                                            </p>
                                            <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
                                                Dibanding rata-rata 3 bulan terakhir.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/80 dark:shadow-none dark:ring-slate-800/80">
                                            <p className="text-slate-600 dark:text-slate-300/90">Risiko kehabisan stok</p>
                                            <p className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-300">
                                                Rendah
                                            </p>
                                            <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
                                                Sistem akan memberi peringatan dini.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-100 p-3 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800/80">
                                    <div className="relative flex min-h-[140px] items-center justify-center rounded-xl bg-slate-200/50 text-xs text-slate-400 ring-1 ring-slate-300/50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-emerald-900/60 dark:ring-emerald-200/20">
                                        <span className="select-none text-[11px] tracking-wide text-slate-400 dark:text-slate-500/80">
                                            // iklan & banner kopi
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-[10px]">
                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                            Integrasi ke sistem distribusi dan gudang.
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400">
                                            Optimalkan alur suplai dari kebun, gudang, hingga mitra
                                            roasting dan kafe.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

