<?php

namespace App\Services;

use Illuminate\Support\Carbon;

class LaporanService
{
    public function __construct(
        private readonly DashboardChartService $chartService,
    ) {
    }

    /** @return list<array{value: string, label: string}> */
    public function periodeOptions(): array
    {
        return [
            ['value' => 'semua', 'label' => 'Semua periode'],
            ['value' => '2025-prediksi', 'label' => 'Jul – Des 2025 (prediksi)'],
            ['value' => '2025-s1', 'label' => 'Jan – Jun 2025'],
            ['value' => '2024', 'label' => 'Tahun 2024'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildRows(string $filterJenis, string $filterPeriode): array
    {
        $types = $filterJenis === DashboardChartService::FILTER_ALL
            ? DashboardChartService::COFFEE_TYPES
            : [$filterJenis];

        $rows = [];

        foreach ($types as $type) {
            if (! in_array($type, DashboardChartService::COFFEE_TYPES, true)) {
                continue;
            }

            $actual = $this->chartService->actualSalesSeries($type);
            $forecast = $this->chartService->latestForecastSeries($type);
            $hasil = $this->chartService->latestHasilPeramalan($type);
            $mape = $hasil?->mape !== null ? (float) $hasil->mape : null;

            $periodKeys = $actual->keys()
                ->merge($forecast->keys())
                ->unique()
                ->sort()
                ->values();

            $prevVal = null;

            foreach ($periodKeys as $sortKey) {
                if (! $this->matchesPeriodeFilter($sortKey, $filterPeriode)) {
                    continue;
                }

                $aktual = $actual[$sortKey] ?? null;
                $peramalan = $forecast[$sortKey] ?? null;
                $currentVal = $peramalan ?? $aktual;

                $trendPct = null;
                $trendDirection = 'stabil';

                if ($currentVal !== null && $prevVal !== null && $prevVal > 0) {
                    $trendPct = (int) round((($currentVal - $prevVal) / $prevVal) * 100);
                    if ($trendPct > 8) {
                        $trendDirection = 'naik';
                    } elseif ($trendPct < -8) {
                        $trendDirection = 'turun';
                    }
                }

                if ($currentVal !== null) {
                    $prevVal = $currentVal;
                }

                $rows[] = [
                    'periode' => $this->chartService->formatMonthLabel(Carbon::parse($sortKey)),
                    'periodeSort' => $sortKey,
                    'jenisKopi' => $type,
                    'aktual' => $aktual,
                    'peramalan' => $peramalan,
                    'mape' => $mape,
                    'trend' => $trendPct,
                    'trendDirection' => $trendDirection,
                    'rekomendasi' => ForecastPersistenceService::rekomendasiFromTrend(
                        ForecastPersistenceService::statusTrendFromPercent($trendPct !== null ? (float) $trendPct : null),
                    ),
                ];
            }
        }

        usort($rows, function (array $a, array $b) {
            $cmp = strcmp($a['periodeSort'], $b['periodeSort']);

            return $cmp !== 0 ? $cmp : strcmp($a['jenisKopi'], $b['jenisKopi']);
        });

        return array_map(function (array $row) {
            unset($row['periodeSort']);

            return $row;
        }, $rows);
    }

    protected function matchesPeriodeFilter(string $isoDate, string $filter): bool
    {
        if ($filter === '' || $filter === 'semua') {
            return true;
        }

        $date = Carbon::parse($isoDate)->startOfMonth();

        return match ($filter) {
            '2025-prediksi' => $date->year === 2025 && $date->month >= 7,
            '2025-s1' => $date->year === 2025 && $date->month <= 6,
            '2024' => $date->year === 2024,
            default => true,
        };
    }
}
