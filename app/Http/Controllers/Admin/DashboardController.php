<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DashboardChartService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardChartService $chartService): Response
    {
        $filter = $request->string('filter')->toString();
        if ($filter === '' || $filter === 'Total') {
            $filter = DashboardChartService::FILTER_ALL;
        }

        $payload = $chartService->build($filter);

        $page = $request->routeIs('manager.*') ? 'Manager/Dashboard' : 'Admin/Dashboard';

        return Inertia::render($page, [
            'filter'                => $payload['filter'],
            'chartMode'             => $payload['chartMode'],
            'chartData'             => $payload['chartData'],
            'stats'                 => $payload['stats'],
            'rekomendasi'           => $payload['rekomendasi'] ?? null,
            'rekomendasi_per_jenis' => $payload['rekomendasi_per_jenis'] ?? [],
            'filterOptions'         => [
                DashboardChartService::FILTER_ALL,
                ...DashboardChartService::COFFEE_TYPES,
            ],
        ]);
    }
}
