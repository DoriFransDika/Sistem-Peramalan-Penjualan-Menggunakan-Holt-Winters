import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import ManagerLayout from '@/Layouts/ManagerLayout';
import StatCard from '@/Components/StatCard';
import Filter from '@/Components/Filter';
import ForecastChart from '@/Components/Chart';
import RekomendasiCard from '@/Components/RekomendasiCard';
import Notification from '@/Components/Notification';
import QuickAction from '@/Components/QuickAction';
import ThemeToggle from '@/Components/ThemeToggle';
import { formatKg } from '@/lib/forecastDisplay';
import { useMemo } from 'react';


export default function DashboardPage({
    filter = 'Semua',
    chartMode = 'multi',
    chartData = [],
    stats = null,
    rekomendasi = null,
    rekomendasi_per_jenis = {},
    filterOptions = ['Semua', 'Arabica', 'Robusta', 'Asalan'],
}) {
    // Ambil role dari shared auth Inertia (dikirim oleh HandleInertiaRequests)
    const { auth } = usePage().props;
    const isManager = auth?.user?.role === 'manager';

    const isSemua = filter === 'Semua';
    const fullChartData = useMemo(() => chartData ?? [], [chartData]);

    const handleFilterChange = (value) => {
        const routeName = isManager ? 'manager.dashboard' : 'admin.dashboard';
        router.get(route(routeName), { filter: value }, { preserveState: true, replace: true });
    };

    // ── Stat Card values ─────────────────────────────────────────────────────
    // Untuk mode "Semua": gunakan stats agregat dari backend (SUM/AVG)
    // Untuk mode per jenis: gunakan stats individual seperti biasa
    const missing = isSemua ? (stats?.missingForecastTypes ?? []) : [];
    const hasPartialData = missing.length > 0;
    const missingWarning = hasPartialData
        ? `Belum diramalkan: ${missing.join(', ')}`
        : null;

    // Deteksi apakah forecast BELUM ada sama sekali
    const noForecast = stats?.hasForecast === false;
    const noForecastWarning = 'Belum diramalkan';

    // Jika di mode semua ada yang kurang, ATAU di mode single tidak ada peramalan
    const isForecastIncomplete = (isSemua && hasPartialData) || (!isSemua && noForecast);

    // Warning untuk stat cards per-jenis (single mode)
    const singleForecastWarning = !isSemua && noForecast ? noForecastWarning : null;

    const statTotal = formatKg(stats?.totalSales);
    
    // Kosongkan nilai jika peramalan belum lengkap
    const statForecast = isForecastIncomplete ? '—' : (stats?.nextForecast != null ? formatKg(stats.nextForecast) : '—');
    const statMape = isForecastIncomplete ? '—' : (stats?.mape != null ? `${Number(stats.mape).toLocaleString('id-ID')}%` : '—');
    const statTrend = isForecastIncomplete ? '—' : (stats?.trend != null
        ? `${stats.trend >= 0 ? '↑' : '↓'} ${Number(Math.abs(stats.trend)).toLocaleString('id-ID')}%`
        : '—');

    const filterLabel = isSemua ? 'Semua jenis' : <span className="notranslate" translate="no">{filter}</span>;

    // ── Teks helper ──────────────────────────────────────────────────────────
    const chartHelperText = isSemua
        ? 'Mode Semua: 6 garis — Solid (tebal) = Aktual, Putus-putus = Peramalan per jenis kopi.'
        : 'Garis solid = aktual · Garis putus-putus = overlap 3 bln + peramalan (titik temu terjamin).';

    // ── Notification: info atau warning tergantung status forecast ────────
    const anyMissing = noForecast || hasPartialData;
    const notificationVariant = anyMissing ? 'warning' : 'info';
    const notificationTitle = anyMissing ? 'Peringatan Data' : 'Notifikasi Model';
    const notificationMessage = anyMissing
        ? (isSemua
            ? `Peramalan belum dilakukan untuk: ${missing.length > 0 ? missing.join(', ') : 'semua jenis kopi'}. Silakan buka menu "Peramalan Holt-Winters" untuk menjalankan peramalan terlebih dahulu.`
            : <>Peramalan belum dilakukan untuk jenis kopi <span className="notranslate" translate="no">{filter}</span>. Silakan buka menu "Peramalan Holt-Winters" untuk menjalankan peramalan agar data prediksi, MAPE, dan rekomendasi dapat ditampilkan.</>
        )
        : (isSemua
            ? 'Data prediksi diambil dari hasil_peramalan dan rincian_peramalan terbaru per jenis.'
            : <>Data <span className="notranslate" translate="no">{filter}</span>: aktual dari data_penjualan, peramalan dari rincian_peramalan.</>
        );

    // ── Pilih Layout berdasarkan role ────────────────────────────────────────
    const Layout = isManager ? ManagerLayout : AdminLayout;
    const pageTitle = isManager ? 'Dashboard Manager' : 'Dashboard Admin';
    const pageSubtitle = isManager
        ? 'Monitoring hasil peramalan persediaan kopi (read-only, sumber data identik dengan Admin).'
        : 'Ringkasan penjualan dan performa peramalan kopi (database agrorra_forecasting).';

    return (
        <Layout>
            <Head title={pageTitle} />

            {/* ── Header ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 pr-2">
                    <h1 className="text-xl font-bold tracking-tight text-[#0B1220] dark:text-lg dark:font-semibold dark:text-slate-50">
                        {pageTitle}
                    </h1>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-[#475569] dark:font-normal dark:text-slate-300/80">
                        {pageSubtitle}
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
                    <Filter value={filter} onChange={handleFilterChange} options={filterOptions} />
                    <ThemeToggle />
                </div>
            </div>


            {/* ── Stat Cards ── */}
            <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Penjualan"
                    value={statTotal}
                    caption={isSemua ? 'Gabungan semua jenis' : <>Periode {filterLabel}</>}
                />
                <StatCard
                    title="Peramalan Bulan Depan"
                    value={statForecast}
                    caption={isSemua ? 'Total volume gabungan' : 'Model Holt-Winters'}
                    warning={isSemua && hasPartialData ? missingWarning : singleForecastWarning}
                />
                <StatCard
                    title="MAPE"
                    value={statMape}
                    caption={isSemua ? 'Rata-rata akurasi model' : 'Akurasi rata-rata'}
                    warning={isSemua && hasPartialData ? missingWarning : singleForecastWarning}
                />
                <StatCard
                    title="Trend"
                    value={statTrend}
                    caption={isSemua ? 'Rata-rata tren semua jenis' : 'Dibanding bulan lalu'}
                    accent="emerald"
                    warning={isSemua && hasPartialData ? missingWarning : singleForecastWarning}
                />
            </div>

            {/* ── Grafik + Side Panel ──────────────────────────────────────────────────
                Kiri  : Chart (2fr)
                Kanan : Notification + RekomendasiCard + QuickAction (Admin only)
            ─────────────────────────────────────────────────────────────────────────── */}
            <div className="grid items-start gap-4 lg:grid-cols-[2fr_minmax(0,1fr)]">
                {/* Kiri: Grafik */}
                <div className="space-y-3">
                    <ForecastChart
                        data={fullChartData}
                        mode={chartMode}
                        multiKeyStyle="forecast_aktual"
                        xDataKey="tanggal"
                        actualKey="aktual"
                        forecastKey="forecast"
                        chartBodyClassName="h-[280px] w-full min-w-0 sm:h-[300px] md:h-[320px]"
                        subtitle={isSemua
                            ? 'Arabica · Robusta · Asalan — Solid = Aktual, Putus-putus = Peramalan'
                            : undefined}
                    />
                    <p className="text-[11px] font-medium leading-relaxed text-[#475569] dark:font-normal dark:text-slate-400">
                        {chartHelperText}
                    </p>
                </div>

                {/* Kanan: Panel Info */}
                <div className="flex flex-col gap-4">
                    <Notification
                        message={notificationMessage}
                        title={notificationTitle}
                        variant={notificationVariant}
                    />

                    {/* RekomendasiCard: selalu tampil untuk semua role */}
                    <RekomendasiCard
                        teks={rekomendasi}
                        jenis={isSemua ? null : filter.toLowerCase()}
                    />

                    {/* QuickAction: HANYA untuk Admin — disembunyikan dari Manager */}
                    {!isManager && <QuickAction />}
                </div>
            </div>
        </Layout>
    );
}
