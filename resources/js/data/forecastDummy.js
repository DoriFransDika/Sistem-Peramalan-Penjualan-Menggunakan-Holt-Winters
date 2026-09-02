export const baseData = {
    Arabica: {
        totalSales: 980,
        nextForecast: 640,
        mape: 7.1,
        trend: 88,
    },
    Robusta: {
        totalSales: 2230,
        nextForecast: 980,
        mape: 9.4,
        trend: 26,
    },
    Asalan: {
        totalSales: 900,
        nextForecast: 560,
        mape: 10.2,
        trend: 308,
    },
};

export const semuaChartData = [
    { periode: 'Jun 2026', arabica: 240, robusta: 850, asalan: 490 },
    { periode: 'Jul 2026', arabica: 280, robusta: 900, asalan: 580 },
    { periode: 'Agu 2026', arabica: 260, robusta: 880, asalan: 540 },
    { periode: 'Sep 2026', arabica: 200, robusta: 860, asalan: 430 },
    { periode: 'Okt 2026', arabica: 480, robusta: 920, asalan: 580 },
    { periode: 'Nov 2026', arabica: 640, robusta: 980, asalan: 560 },
];

export const chartPerJenis = {
    Arabica: [
        { periode: 'Mar 2026', aktual: 520, peramalan: null },
        { periode: 'Apr 2026', aktual: 160, peramalan: null },
        { periode: 'Mei 2026', aktual: 300, peramalan: 300 },
        { periode: 'Jun 2026', aktual: null, peramalan: 240 },
        { periode: 'Jul 2026', aktual: null, peramalan: 280 },
        { periode: 'Agu 2026', aktual: null, peramalan: 260 },
        { periode: 'Sep 2026', aktual: null, peramalan: 200 },
        { periode: 'Okt 2026', aktual: null, peramalan: 480 },
        { periode: 'Nov 2026', aktual: null, peramalan: 640 },
    ],
    Robusta: [
        { periode: 'Mar 2026', aktual: 760, peramalan: null },
        { periode: 'Apr 2026', aktual: 650, peramalan: null },
        { periode: 'Mei 2026', aktual: 820, peramalan: 820 },
        { periode: 'Jun 2026', aktual: null, peramalan: 850 },
        { periode: 'Jul 2026', aktual: null, peramalan: 900 },
        { periode: 'Agu 2026', aktual: null, peramalan: 880 },
        { periode: 'Sep 2026', aktual: null, peramalan: 860 },
        { periode: 'Okt 2026', aktual: null, peramalan: 920 },
        { periode: 'Nov 2026', aktual: null, peramalan: 980 },
    ],
    Asalan: [
        { periode: 'Mar 2026', aktual: 240, peramalan: null },
        { periode: 'Apr 2026', aktual: 130, peramalan: null },
        { periode: 'Mei 2026', aktual: 530, peramalan: 530 },
        { periode: 'Jun 2026', aktual: null, peramalan: 490 },
        { periode: 'Jul 2026', aktual: null, peramalan: 580 },
        { periode: 'Agu 2026', aktual: null, peramalan: 540 },
        { periode: 'Sep 2026', aktual: null, peramalan: 430 },
        { periode: 'Okt 2026', aktual: null, peramalan: 580 },
        { periode: 'Nov 2026', aktual: null, peramalan: 560 },
    ],
};

export const COFFEE_TYPES = ['Arabica', 'Robusta', 'Asalan'];

export const PERIODE_LAPORAN_OPTIONS = [
    { value: 'semua', label: 'Semua periode' },
    { value: '2026-q2', label: 'Apr – Jun 2026' },
    { value: '2026-q3', label: 'Jul – Sep 2026' },
    { value: '2026-q4', label: 'Okt – Nov 2026' },
];
