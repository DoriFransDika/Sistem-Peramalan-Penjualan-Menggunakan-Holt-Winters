<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\DashboardChartService;
use App\Services\LaporanService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LaporanController extends Controller
{
    public function __invoke(
        Request $request,
        LaporanService $laporanService,
        DashboardChartService $chartService,
    ): Response {
        $filterJenis = $request->string('filter')->toString();
        if ($filterJenis === '' || $filterJenis === 'Total') {
            $filterJenis = DashboardChartService::FILTER_ALL;
        }

        $filterPeriode = $request->string('periode')->toString();
        if ($filterPeriode === '') {
            $filterPeriode = 'semua';
        }

        // Ambil stats agregat: untuk per-jenis atau Semua
        if ($filterJenis !== DashboardChartService::FILTER_ALL) {
            $stats = $chartService->build($filterJenis)['stats'];
        } else {
            $built = $chartService->build(DashboardChartService::FILTER_ALL);
            $stats = $built['stats'];
        }

        // Stats per jenis kopi (untuk PDF Section B & C)
        // Berisi nextForecast, mape, trend, dan rekomendasi masing-masing jenis
        $statsPerJenis = [];
        foreach (DashboardChartService::COFFEE_TYPES as $type) {
            $built = $chartService->build($type);
            $hasil = $chartService->latestHasilPeramalan($type);
            $statsPerJenis[strtolower($type)] = [
                'nextForecast' => $built['stats']['nextForecast'] ?? null,
                'mape'         => $built['stats']['mape'] ?? null,
                'trend'        => $built['stats']['trend'] ?? null,
                'rekomendasi'  => $built['rekomendasi'] ?? '',
                'alpha'        => $hasil?->alpha ?? null,
                'beta'         => $hasil?->beta ?? null,
                'gamma'        => $hasil?->gamma ?? null,
            ];
        }

        return Inertia::render('Manager/Laporan', [
            'filter'         => $filterJenis,
            'filterPeriode'  => $filterPeriode,
            'laporanRows'    => $laporanService->buildRows($filterJenis, $filterPeriode),
            'stats'          => $stats,
            'statsPerJenis'  => $statsPerJenis,
            'filterOptions'  => [
                DashboardChartService::FILTER_ALL,
                ...DashboardChartService::COFFEE_TYPES,
            ],
            'periodeOptions' => $laporanService->periodeOptions(),
        ]);
    }
}

