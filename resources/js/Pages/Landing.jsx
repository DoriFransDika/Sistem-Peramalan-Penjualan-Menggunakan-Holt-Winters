import { Head } from '@inertiajs/react';
import Footer from '../Components/Footer';
import Hero from '../Components/Hero';
import Navbar from '../Components/Navbar';

function SectionWrapper({ id, eyebrow, title, description, children }) {
    return (
        <section
            id={id}
            className="border-t border-slate-200 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/90 py-14 text-slate-800 dark:border-slate-800/60 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950/95 dark:text-slate-100 transition-colors duration-300"
        >
            <div className="mx-auto max-w-6xl px-4 lg:px-6">
                <div className="max-w-2xl">
                    {eyebrow && (
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/90">
                            {eyebrow}
                        </p>
                    )}
                    <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300/90">
                            {description}
                        </p>
                    )}
                </div>
                {children}
            </div>
        </section>
    );
}

export default function Landing({ auth, loginUrl, dashboardUrl }) {
    return (
        <>
            <Head title="Optimasi Persediaan Kopi" />

            <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
                <Navbar auth={auth} loginUrl={loginUrl} dashboardUrl={dashboardUrl} />
                <main className="pt-20">
                    <Hero dashboardUrl={dashboardUrl} />

                    <SectionWrapper
                        id="fitur"
                        eyebrow="Fitur Sistem"
                        title="Fitur utama untuk operasional kopi yang lebih presisi"
                        description="Didesain untuk membantu pengelolaan stok dari kebun hingga gudang dengan data yang selalu diperbarui."
                    >
                        <div className="mt-8 grid gap-6 md:grid-cols-3">
                            {[
                                {
                                    title: 'Pemantauan Stok Real-time',
                                    body: 'Pantau ketersediaan biji kopi berdasarkan varietas, grade, dan lokasi penyimpanan secara langsung.',
                                },
                                {
                                    title: 'Peramalan Otomatis',
                                    body: 'Model peramalan berbasis histori transaksi, musim panen, dan pola permintaan mitra.',
                                },
                                {
                                    title: 'Peringatan Dini',
                                    body: 'Notifikasi ketika stok berada di bawah batas aman atau terjadi lonjakan permintaan.',
                                },
                                {
                                    title: 'Segmentasi Gudang',
                                    body: 'Kelola multi-gudang dengan visibilitas stok yang jelas untuk tiap titik distribusi.',
                                },
                                {
                                    title: 'Pelacakan Mutu Biji',
                                    body: 'Catat hasil cupping, kadar air, dan standar mutu lainnya dalam satu sistem.',
                                },
                                {
                                    title: 'Laporan & Dashboard',
                                    body: 'Visualisasi ringkas untuk membantu pengambilan keputusan produksi dan distribusi.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:border-emerald-300/70 hover:bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-950/60 dark:shadow-[0_16px_40px_rgba(15,23,42,0.8)] dark:hover:bg-slate-950"
                                >
                                    <div className="mb-4 h-8 w-fit px-3 rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 flex items-center justify-center text-[11px] font-bold tracking-wide group-hover:bg-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-300/40 dark:group-hover:bg-emerald-400/25">
                                        {item.title.split(' ')[0]}
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300/90">
                                        {item.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </SectionWrapper>

                    <SectionWrapper
                        id="alur"
                        eyebrow="Cara Kerja Sistem"
                        title="Alur kerja sederhana dari data hingga rekomendasi"
                        description="Setiap langkah dioptimalkan agar petani, pengelola gudang, dan manajemen dapat bekerja dengan tenang."
                    >
                        <div className="mt-8 grid gap-6 md:grid-cols-4">
                            {[
                                {
                                    step: '01',
                                    title: 'Input & Sinkronisasi Data',
                                    body: 'Data stok, transaksi keluar-masuk, dan histori panen dicatat atau diimpor ke sistem.',
                                },
                                {
                                    step: '02',
                                    title: 'Proses Peramalan',
                                    body: 'Model peramalan mengolah data untuk memperkirakan kebutuhan stok pada periode tertentu.',
                                },
                                {
                                    step: '03',
                                    title: 'Analisis Risiko Stok',
                                    body: 'Sistem mengidentifikasi potensi kelebihan atau kekurangan stok berdasarkan skenario permintaan.',
                                },
                                {
                                    step: '04',
                                    title: 'Rekomendasi Tindakan',
                                    body: 'Pengguna mendapatkan rekomendasi produksi, pembelian, atau distribusi untuk menjaga stok ideal.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.step}
                                    className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-[0_18px_50px_rgba(15,23,42,0.8)]"
                                >
                                    <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-300/50">
                                        {item.step}
                                    </span>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300/90">
                                        {item.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </SectionWrapper>

                    <SectionWrapper
                        id="tentang"
                        eyebrow="Tentang Kami"
                        title="AGRORRA KOERINTJI"
                        description="Inisiatif digital untuk memperkuat ekosistem kopi di lereng Gunung Kerinci melalui teknologi dan kolaborasi."
                    >
                        <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_minmax(0,1fr)]">
                            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-200/90">
                                <p>
                                    Sistem iKopi dikembangkan untuk membantu komunitas petani dan pengelola kopi
                                    di Koerintji agar dapat mengelola stok dengan lebih presisi, meminimalkan
                                    kehilangan mutu, dan memastikan kontinuitas suplai ke mitra.
                                </p>
                                <p className="mt-3">
                                    Dengan pendekatan agroforestry dan pemanfaatan data, kami ingin menjembatani
                                    kebutuhan di lapangan dengan ekspektasi pasar specialty coffee yang terus
                                    meningkat.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-5 text-xs text-slate-700 shadow-[0_8px_30px_rgba(16,185,129,0.1)] dark:border-emerald-300/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900/60 dark:text-slate-100 dark:shadow-[0_18px_50px_rgba(16,185,129,0.35)]">
                                <p className="font-semibold text-emerald-700 dark:text-emerald-200">
                                    Fokus utama pengembangan sistem:
                                </p>
                                <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600 dark:text-slate-200/90">
                                    <li>Memberikan visibilitas menyeluruh terhadap stok dan mutu biji kopi.</li>
                                    <li>
                                        Mengurangi risiko kehabisan atau penumpukan stok yang berdampak pada
                                        kualitas.
                                    </li>
                                    <li>
                                        Menjadi fondasi integrasi ke modul analitik dan forecasting berbasis
                                        FastAPI.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </SectionWrapper>
                </main>

                <Footer />
            </div>
        </>
    );
}

