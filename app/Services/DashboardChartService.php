<?php

namespace App\Services;

use App\Models\DataPenjualan;
use App\Models\HasilPeramalan;
use App\Models\JenisKopi;
use App\Models\RincianPeramalan;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardChartService
{
    public const COFFEE_TYPES = ['Arabica', 'Robusta', 'Asalan'];

    public const FILTER_ALL = 'Semua';

    public function __construct(
        private readonly JenisKopiService $jenisKopiService,
    ) {
    }

    public function build(string $filter): array
    {
        $this->jenisKopiService->ensureDefaults();

        if ($filter === self::FILTER_ALL) {
            $rekomendasiPerJenis = [];
            foreach (self::COFFEE_TYPES as $type) {
                $hasil = $this->latestHasilPeramalan($type);
                if ($hasil?->rekomendasi_tindakan) {
                    $rekomendasiPerJenis[strtolower($type)] = $hasil->rekomendasi_tindakan;
                }
            }
            // Gabungkan rekomendasi semua jenis sebagai satu string
            $rekomendasiGabungan = collect($rekomendasiPerJenis)
                ->map(fn ($rek, $jenis) => '[' . strtoupper($jenis) . '] ' . $rek)
                ->values()
                ->implode(' | ');

            return [
                'filter'    => self::FILTER_ALL,
                'chartMode' => 'multi',
                'chartData' => $this->buildMultiForecastChart(),
                'stats'     => $this->buildStatsForAll(),
                'rekomendasi'           => $rekomendasiGabungan ?: '',
                'rekomendasi_per_jenis' => $rekomendasiPerJenis,
            ];
        }

        if (! in_array($filter, self::COFFEE_TYPES, true)) {
            $filter = self::FILTER_ALL;
            $rekomendasiPerJenis = [];
            foreach (self::COFFEE_TYPES as $type) {
                $hasil = $this->latestHasilPeramalan($type);
                if ($hasil?->rekomendasi_tindakan) {
                    $rekomendasiPerJenis[strtolower($type)] = $hasil->rekomendasi_tindakan;
                }
            }
            $rekomendasiGabungan = collect($rekomendasiPerJenis)
                ->map(fn ($rek, $jenis) => '[' . strtoupper($jenis) . '] ' . $rek)
                ->values()
                ->implode(' | ');

            return [
                'filter'    => self::FILTER_ALL,
                'chartMode' => 'multi',
                'chartData' => $this->buildMultiForecastChart(),
                'stats'     => $this->buildStatsForAll(),
                'rekomendasi'           => $rekomendasiGabungan ?: '',
                'rekomendasi_per_jenis' => $rekomendasiPerJenis,
            ];
        }

        $hasil = $this->latestHasilPeramalan($filter);

        return [
            'filter'      => $filter,
            'chartMode'   => 'single',
            'chartData'   => $this->buildSingleChart($filter),
            'stats'       => $this->buildStatsForType($filter),
            'rekomendasi' => $hasil?->rekomendasi_tindakan ?? '',
        ];
    }

    protected function buildMultiForecastChart(): array
    {
        // Ambil data aktual (penjualan nyata) dan forecast (peramalan) per jenis kopi
        $actualByType   = [];
        $forecastByType = [];

        foreach (self::COFFEE_TYPES as $type) {
            $key                    = strtolower($type);
            $actualByType[$key]   = $this->actualSalesSeries($type);
            $forecastByType[$key] = $this->latestForecastSeries($type);
        }

        // ── Kumpulkan semua tanggal unik (Full Outer Join) ───────────────────
        //
        // BUG SEBELUMNYA:
        //   collect($actualByType)->merge($forecastByType)->flatMap(...)
        //   → merge() menimpa key 'arabica'/'robusta'/'asalan' dari actualByType
        //     dengan nilai dari forecastByType, sehingga tanggal historis aktual HILANG.
        //     periodKeys hanya berisi tanggal dari forecastByType (April 2025 ke depan).
        //
        // FIX: Kumpulkan tanggal dari actualByType dan forecastByType secara TERPISAH,
        //      lalu gabungkan hasilnya SETELAH flatten — tidak ada Collection yang tertimpa.
        // ─────────────────────────────────────────────────────────────────────

        // Tanggal dari seluruh data AKTUAL (semua jenis, dari awal hingga akhir)
        $actualKeys = collect($actualByType)
            ->flatMap(fn (Collection $rows) => $rows->keys());

        // Tanggal dari seluruh data FORECAST (semua jenis, termasuk masa depan)
        $forecastKeys = collect($forecastByType)
            ->flatMap(fn (Collection $rows) => $rows->keys());

        // Gabungkan, ambil yang unik, urutkan ascending
        $periodKeys = $actualKeys
            ->merge($forecastKeys)
            ->unique()
            ->sort()
            ->values();

        // Setiap titik tanggal menghasilkan 6 nilai:
        //   {jenis}_aktual   = data penjualan nyata (null jika tidak ada)
        //   {jenis}_forecast = nilai peramalan dari rincian_peramalan (null jika tidak ada)
        return $periodKeys->map(function (string $sortKey) use ($actualByType, $forecastByType) {
            $date = Carbon::parse($sortKey);

            return [
                'tanggal'          => $this->formatMonthLabel($date),
                'sort_date'        => $sortKey,
                'arabica_aktual'   => $actualByType['arabica'][$sortKey]   ?? null,
                'arabica_forecast' => $forecastByType['arabica'][$sortKey] ?? null,
                'robusta_aktual'   => $actualByType['robusta'][$sortKey]   ?? null,
                'robusta_forecast' => $forecastByType['robusta'][$sortKey] ?? null,
                'asalan_aktual'    => $actualByType['asalan'][$sortKey]    ?? null,
                'asalan_forecast'  => $forecastByType['asalan'][$sortKey]  ?? null,
            ];
        })->values()->all();
    }


    protected function buildSingleChart(string $type): array
    {
        $actual   = $this->actualSalesSeries($type);   // ['2024-01-01' => 2800, ...]
        $forecast = $this->latestForecastSeries($type); // ['2025-07-01' => 3100, ...] future only

        // ── Tanpa manipulasi overlap ─────────────────────────────────────────
        // Data dikirim apa adanya dari database:
        //   - actual  : nilai penjualan nyata (data_penjualan)
        //   - forecast: nilai peramalan dari rincian_peramalan (hanya bulan masa depan)
        //   - in_sample: null (fitted values tidak disimpan di DB;
        //                hanya tersedia saat Python menjalankan peramalan via API)
        //
        // Jika forecast kosong (belum ada peramalan untuk jenis kopi ini),
        // semua key forecast akan bernilai null → frontend hanya render garis aktual.
        // ─────────────────────────────────────────────────────────────────────

        $periodKeys = $actual->keys()
            ->merge($forecast->keys())
            ->unique()
            ->sort()
            ->values();

        return $periodKeys->map(function (string $sortKey) use ($actual, $forecast) {
            $date = Carbon::parse($sortKey);

            return [
                'tanggal'   => $this->formatMonthLabel($date),
                'sort_date' => $sortKey,
                'aktual'    => $actual[$sortKey] ?? null,
                'forecast'  => $forecast[$sortKey] ?? null,
            ];
        })->values()->all();
    }

    protected function buildStatsForType(string $type): array
    {
        $actual = $this->actualSalesSeries($type);
        $forecast = $this->latestForecastSeries($type);
        $hasil = $this->latestHasilPeramalan($type);

        $totalSales = (float) $actual->sum();
        $sortedActual = $actual->sortKeys();
        $actualValues = $sortedActual->values()->all();
        $lastActual = end($actualValues) ?: null;
        $prevActual = count($actualValues) >= 2 ? $actualValues[count($actualValues) - 2] : null;

        $trend = 0;
        if ($lastActual !== null && $prevActual !== null && $prevActual > 0) {
            $trend = round((($lastActual - $prevActual) / $prevActual) * 100, 1);
        }

        $nextForecast = null;
        if ($forecast->isNotEmpty()) {
            $lastActualKey = $sortedActual->keys()->last();
            $future = $forecast->filter(fn ($_, $key) => $lastActualKey === null || $key > $lastActualKey);
            $nextForecast = $future->isNotEmpty()
                ? (float) $future->first()
                : (float) $forecast->last();
        }

        return [
            'totalSales' => round($totalSales, 2),
            'nextForecast' => $nextForecast !== null ? round($nextForecast, 2) : null,
            'mape' => $hasil?->mape !== null ? (float) $hasil->mape : null,
            'trend' => $hasil?->trend_persen !== null ? (float) $hasil->trend_persen : $trend,
            'hasForecast' => $forecast->isNotEmpty(),
            'hasActual' => $actual->isNotEmpty(),
        ];
    }

    protected function buildStatsForAll(): array
    {
        $totalSales        = 0.0;
        $forecastSum       = 0.0;
        $mapeValues        = [];
        $trendValues       = [];
        $missingForecast   = [];   // jenis kopi yang belum punya data peramalan
        $anyActual         = false;
        $anyForecast       = false;

        foreach (self::COFFEE_TYPES as $type) {
            // ── Aktual ──────────────────────────────────────────────────────
            $actual = $this->actualSalesSeries($type);
            if ($actual->isNotEmpty()) {
                $totalSales += (float) $actual->sum();
                $anyActual = true;
            }

            // ── Peramalan ───────────────────────────────────────────────────
            $forecast = $this->latestForecastSeries($type);
            $hasil    = $this->latestHasilPeramalan($type);

            if ($forecast->isEmpty()) {
                $missingForecast[] = $type;
                continue;
            }

            $anyForecast = true;

            // Ambil nilai peramalan bulan pertama setelah data aktual terakhir
            $sortedActual   = $actual->sortKeys();
            $lastActualKey  = $sortedActual->keys()->last();
            $futureForecast = $forecast->filter(
                fn ($_, $key) => $lastActualKey === null || $key > $lastActualKey
            );
            $nextVal = $futureForecast->isNotEmpty()
                ? (float) $futureForecast->first()
                : (float) $forecast->last();
            $forecastSum += $nextVal;

            // MAPE dan Trend dari hasil_peramalan
            if ($hasil?->mape !== null) {
                $mapeValues[] = (float) $hasil->mape;
            }
            if ($hasil?->trend_persen !== null) {
                $trendValues[] = (float) $hasil->trend_persen;
            }
        }

        // Rata-rata MAPE dan Trend — hanya dari jenis yang tersedia
        $avgMape  = count($mapeValues)  > 0
            ? round(array_sum($mapeValues)  / count($mapeValues),  1)
            : null;
        $avgTrend = count($trendValues) > 0
            ? round(array_sum($trendValues) / count($trendValues), 1)
            : null;

        return [
            'totalSales'          => $anyActual   ? round($totalSales, 2)   : null,
            'nextForecast'        => $anyForecast ? round($forecastSum, 2)  : null,
            'mape'                => $avgMape,
            'trend'               => $avgTrend,
            'hasForecast'         => $anyForecast,
            'hasActual'           => $anyActual,
            // Daftar jenis kopi yang belum memiliki data peramalan (untuk peringatan di frontend)
            'missingForecastTypes' => $missingForecast,
        ];
    }

    public function actualSalesSeries(string $type): Collection
    {
        $jenis = $this->jenisKopiService->findByNama($type);
        if (! $jenis) {
            return collect();
        }

        return DataPenjualan::query()
            ->where('jenis_kopi_id', $jenis->id)
            ->orderBy('periode')
            ->get(['periode', 'quantity'])
            ->mapWithKeys(fn ($row) => [
                Carbon::parse($row->periode)->startOfMonth()->toDateString() => (float) $row->quantity,
            ]);
    }

    public function latestForecastSeries(string $type): Collection
    {
        $hasil = $this->latestHasilPeramalan($type);
        if (! $hasil) {
            return collect();
        }

        return RincianPeramalan::query()
            ->where('hasil_peramalan_id', $hasil->id)
            ->orderBy('periode')
            ->get(['periode', 'nilai_peramalan'])
            ->mapWithKeys(fn ($row) => [
                Carbon::parse($row->periode)->startOfMonth()->toDateString() => (float) $row->nilai_peramalan,
            ]);
    }

    public function latestHasilPeramalan(string $type): ?HasilPeramalan
    {
        $jenis = $this->jenisKopiService->findByNama($type);
        if (! $jenis) {
            return null;
        }

        return HasilPeramalan::query()
            ->where('jenis_kopi_id', $jenis->id)
            ->orderByDesc('tanggal_peramalan')
            ->orderByDesc('created_at')
            ->first();
    }

    public function formatMonthLabel(Carbon $date): string
    {
        $namaBulan = $date->locale('id')->translatedFormat('M');
        $namaBulan = str_replace('.', '', $namaBulan);

        return ucfirst($namaBulan).' '.$date->year;
    }
}
