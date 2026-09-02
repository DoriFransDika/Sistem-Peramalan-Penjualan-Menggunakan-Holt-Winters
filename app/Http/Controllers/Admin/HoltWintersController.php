<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreHasilPeramalanRequest;
use App\Models\DataPenjualan;
use App\Services\DashboardChartService;
use App\Services\ForecastPersistenceService;
use App\Services\JenisKopiService;
use App\Services\FastApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class HoltWintersController extends Controller
{
    public function __construct(
        private readonly JenisKopiService $jenisKopiService,
        private readonly ForecastPersistenceService $forecastPersistence,
        private readonly FastApiService $fastApiService,
        private readonly DashboardChartService $dashboardChartService,
    ) {
    }

    public function index(Request $request): Response|RedirectResponse
    {
        $jenisKopiList = $this->jenisKopiService->listForUi();
        $ids = collect($jenisKopiList)->pluck('id');

        $requestedId = $request->string('jenis_kopi_id')->toString();
        $jenisKopiId = $requestedId;

        if ($ids->isNotEmpty()) {
            if (! $ids->contains($requestedId) || $requestedId === '') {
                $jenisKopiId = (string) $ids->first();
            }
        } else {
            $jenisKopiId = '';
        }

        if ($ids->isNotEmpty() && $requestedId !== $jenisKopiId) {
            return redirect()->route('admin.forecast', [
                'jenis_kopi_id' => $jenisKopiId,
            ]);
        }

        $from = Carbon::create(2023, 1, 1)->startOfMonth();

        $modelingQuery = DataPenjualan::query()
            ->where('periode', '>=', $from)
            ->when($jenisKopiId !== '', fn ($q) => $q->where('jenis_kopi_id', $jenisKopiId))
            ->orderBy('periode');

        $modelingSeries = $modelingQuery->get()->map(fn ($r) => [
            'periode' => $r->periode->format('Y-m-d'),
            'quantity' => (float) $r->quantity,
        ]);

        $selectedJenis = collect($jenisKopiList)->firstWhere('id', $jenisKopiId);
        $filterName = $selectedJenis ? $selectedJenis['nama_jenis'] : 'Semua';
        $dashboardData = $this->dashboardChartService->build($filterName);

        return Inertia::render('Admin/Forecast', [
            'modelingSeries' => $modelingSeries,
            'filters' => [
                'jenis_kopi_id' => $jenisKopiId,
            ],
            'jenisKopi' => $jenisKopiList,
            'initialDashboardData' => $dashboardData,
        ]);
    }

    public function preprocessCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        try {
            $result = $this->fastApiService->preprocessCsv($request->file('file'));
            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['detail' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['detail' => 'Gagal memproses CSV: ' . $e->getMessage()], 500);
        }
    }

    public function generateForecast(Request $request)
    {
        $request->validate([
            'mode' => 'required|in:manual,rekomendasi,otomatis',
            'jenis_kopi_id' => 'nullable|string',
            'alpha' => 'nullable|numeric|between:0.0001,0.9999',
            'beta' => 'nullable|numeric|between:0.0001,0.9999',
            'gamma' => 'nullable|numeric|between:0.0001,0.9999',
            'custom_data' => 'nullable|array',
            'custom_data.*.periode' => 'required_with:custom_data',
            'custom_data.*.quantity' => 'required_with:custom_data',
        ]);

        $mode = $request->input('mode');
        $jenisKopiId = $request->input('jenis_kopi_id');
        $alpha = $request->input('alpha');
        $beta = $request->input('beta');
        $gamma = $request->input('gamma');
        $customData = $request->input('custom_data');

        $requests = [];

        if (!empty($customData)) {
            // Mode Uji Peramalan dengan data CSV
            $requests[] = [
                'jenis_kopi' => 'uji_csv',
                'data' => $customData,
                'mode' => $mode,
                'alpha' => $alpha,
                'beta' => $beta,
                'gamma' => $gamma,
            ];
        } else {
            // Mode Data Asli dari Database
            $query = DataPenjualan::query()
                ->with('jenisKopi')
                ->orderBy('periode');

            if (!empty($jenisKopiId)) {
                $query->where('jenis_kopi_id', $jenisKopiId);
            }

            $allData = $query->get();

            $grouped = $allData->groupBy(function ($item) {
                return $item->jenisKopi ? strtolower($item->jenisKopi->nama_jenis) : strtolower($item->jenis_kopi_id);
            });

            foreach ($grouped as $jenisKopi => $items) {
                $dataPoints = [];
                foreach ($items as $item) {
                    $dataPoints[] = [
                        'periode' => $item->periode->format('Y-m-d'),
                        'quantity' => (float) $item->quantity,
                    ];
                }

                $requests[] = [
                    'jenis_kopi' => $jenisKopi,
                    'data' => $dataPoints,
                    'mode' => $mode,
                    'alpha' => $alpha,
                    'beta' => $beta,
                    'gamma' => $gamma,
                ];
            }
        }

        $payload = ['requests' => $requests];

        try {
            // Kirim data tersebut (format JSON) ke endpoint FastAPI
            $result = $this->fastApiService->generateForecast($payload);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function storeResult(StoreHasilPeramalanRequest $request): RedirectResponse
    {
        $this->forecastPersistence->store($request->validated());

        return redirect()->back()->with('success', 'Hasil peramalan disimpan ke hasil_peramalan dan rincian_peramalan.');
    }
}
