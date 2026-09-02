<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmDataPenjualanRequest;
use App\Http\Requests\Admin\StoreDataPenjualanRequest;
use App\Http\Requests\Admin\UpdateDataPenjualanRequest;
use App\Http\Requests\Admin\UploadSalesFileRequest;
use App\Models\DataPenjualan;
use App\Models\HasilPeramalan;
use App\Models\JenisKopi;
use App\Models\RincianPeramalan;
use App\Models\UploadLog;
use App\Services\CsvDataPenjualanParser;
use App\Services\FastApiService;
use App\Services\JenisKopiService;
use App\Support\SequentialIdGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DataPenjualanController extends Controller
{
    public const SESSION_UPLOAD_PREVIEW = 'data_penjualan_upload_preview';
    public const SESSION_PREPROCESSED = 'data_penjualan_preprocessed';

    /**
     * Daftar nama bulan dalam Bahasa Indonesia untuk pesan error yang ramah.
     */
    private const BULAN_INDONESIA = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public function __construct(
        private readonly CsvDataPenjualanParser $csvParser,
        private readonly JenisKopiService $jenisKopiService,
        private readonly FastApiService $fastApiService,
    ) {
    }

    public function index(Request $request): Response
    {
        // ── 1. Ambil daftar tahun unik dari database (dinamis) ────────────────
        $daftarTahun = DataPenjualan::query()
            ->selectRaw('YEAR(periode) as tahun')
            ->distinct()
            ->orderByDesc('tahun')
            ->pluck('tahun')
            ->map(fn ($y) => (int) $y)
            ->values()
            ->all();

        // ── 2. Filter tahun: 'semua' atau kosong → ambil semua, angka → filter ─
        $yearParam = $request->input('year', '');   // baca sebagai string

        $isSemua = ($yearParam === 'semua' || $yearParam === '');

        if ($isSemua) {
            $selectedYear = 'semua';
        } else {
            $selectedYear = (int) $yearParam;
            // Fallback ke tahun terbaru jika angka tidak valid
            if (!$selectedYear) {
                $selectedYear = !empty($daftarTahun) ? $daftarTahun[0] : now()->year;
            }
        }

        // ── 3. Tarik data: semua tahun atau hanya tahun terpilih ─────────────
        //    Filter search & jenis_kopi TIDAK dilakukan di sini (client-side).
        $query = DataPenjualan::query()->with('jenisKopi')->orderByDesc('periode');

        if (!$isSemua) {
            $query->whereYear('periode', $selectedYear);
        }

        $dataPenjualan = $query->get();

        // ── 4. Summary agregat ────────────────────────────────────────────────
        $totalQuantityYear = $dataPenjualan->sum('quantity');
        $latestPeriode     = $dataPenjualan->max('periode');

        $uploadPreview    = $request->session()->get(self::SESSION_UPLOAD_PREVIEW);
        $preprocessedData = $request->session()->get(self::SESSION_PREPROCESSED);
        $totalData        = DataPenjualan::query()->count();

        return Inertia::render('Admin/Sales/Index', [
            'data_penjualan'   => $dataPenjualan,
            'daftar_tahun'     => $daftarTahun,
            'selected_year'    => $selectedYear,   // 'semua' | int
            'jenisKopi'        => $this->jenisKopiService->listForUi(),
            'summary'          => [
                'total_quantity_year' => $totalQuantityYear,
                'latest_periode'      => $latestPeriode,
            ],
            'uploadPreview'    => $uploadPreview,
            'preprocessedData' => $preprocessedData,
            'total_data'       => $totalData,
        ]);
    }


    public function store(StoreDataPenjualanRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $periode = Carbon::parse($data['periode'])->startOfMonth();
        $jenisKopiId = $data['jenis_kopi_id'];

        // ══════════════════════════════════════════════════════════════════════
        //  LAPISAN 1: Validasi Duplikasi Data (Unique Constraint)
        //  Cek apakah sudah ada data dengan periode & jenis_kopi yang sama.
        // ══════════════════════════════════════════════════════════════════════
        $sudahAda = DataPenjualan::query()
            ->where('jenis_kopi_id', $jenisKopiId)
            ->whereDate('periode', $periode->toDateString())
            ->exists();

        if ($sudahAda) {
            throw ValidationException::withMessages([
                'periode' => 'Gagal: Data penjualan untuk jenis kopi ini pada periode tersebut sudah terdaftar.',
            ]);
        }

        // ══════════════════════════════════════════════════════════════════════
        //  LAPISAN 2: Validasi Urutan Kronologis (Cegah Lompat Bulan)
        //  Ambil data terakhir untuk jenis kopi ini, lalu pastikan inputan
        //  user adalah bulan berikutnya secara berurutan.
        // ══════════════════════════════════════════════════════════════════════
        $dataTermutakhir = DataPenjualan::query()
            ->where('jenis_kopi_id', $jenisKopiId)
            ->orderByDesc('periode')
            ->first();

        if ($dataTermutakhir) {
            // Ada data sebelumnya → hitung "Bulan Target Ideal" (bulan terakhir + 1)
            $periodeTermutakhir = Carbon::parse($dataTermutakhir->periode)->startOfMonth();
            $bulanTargetIdeal = $periodeTermutakhir->copy()->addMonth();

            // Jika user memasukkan bulan yang LEBIH JAUH dari bulan target ideal,
            // berarti ada bulan yang dilompati.
            if ($periode->greaterThan($bulanTargetIdeal)) {
                $namaBulanTarget = self::BULAN_INDONESIA[$bulanTargetIdeal->month] . ' ' . $bulanTargetIdeal->year;

                throw ValidationException::withMessages([
                    'periode' => "Peringatan Anomali: Anda melompati bulan. Silakan isi data penjualan untuk bulan {$namaBulanTarget} terlebih dahulu.",
                ]);
            }
        }
        // Jika $dataTermutakhir === null → database masih kosong untuk jenis kopi ini.
        // Izinkan inputan bulan berapapun sebagai Data Initialization (data pertama).

        // ══════════════════════════════════════════════════════════════════════
        //  LAPISAN 3: Simpan Data (Create)
        //  Semua validasi lolos → buat record baru dengan aman.
        // ══════════════════════════════════════════════════════════════════════
        DataPenjualan::query()->create([
            'id'            => SequentialIdGenerator::next('DP', 'data_penjualan'),
            'periode'       => $periode->toDateString(),
            'tahun'         => $periode->year,
            'bulan'         => $periode->month,
            'jenis_kopi_id' => $jenisKopiId,
            'quantity'      => (float) $data['quantity'],
        ]);

        return redirect()
            ->route('admin.sales.index', [
                'year' => $periode->year,
                'jenis_kopi_id' => $request->string('jenis_kopi_id')->toString() ?: null,
            ])
            ->with('success', 'Data penjualan berhasil disimpan.');
    }

    public function update(UpdateDataPenjualanRequest $request, DataPenjualan $dataPenjualan): RedirectResponse
    {
        $data = $request->validated();
        $periode = Carbon::parse($data['periode'])->startOfMonth();

        $dataPenjualan->update([
            'periode' => $periode,
            'tahun' => $periode->year,
            'bulan' => $periode->month,
            'jenis_kopi_id' => $data['jenis_kopi_id'],
            'quantity' => $data['quantity'],
        ]);

        return redirect()
            ->back()
            ->with('success', 'Data penjualan berhasil diperbarui.');
    }

    public function destroy(DataPenjualan $dataPenjualan): RedirectResponse
    {
        $dataPenjualan->delete();

        return redirect()
            ->back()
            ->with('success', 'Data penjualan berhasil dihapus.');
    }

    public function upload(UploadSalesFileRequest $request): RedirectResponse
    {
        $file = $request->file('file');
        if (strtolower((string) $file->getClientOriginalExtension()) !== 'csv') {
            return back()->withErrors(['file' => 'Hanya file .csv yang diperbolehkan.']);
        }

        $path = $file->getRealPath();
        if ($path === false || $path === '') {
            $path = $file->getPathname();
        }
        if ($path === '' || ! is_readable($path)) {
            return back()->withErrors(['file' => 'Gagal membaca berkas (path tidak valid).']);
        }

        try {
            $rows = $this->csvParser->parseFile($path);
        } catch (\Throwable $e) {
            return back()->withErrors([
                'file' => $e->getMessage(),
            ]);
        }

        $request->session()->put(self::SESSION_UPLOAD_PREVIEW, [
            'upload_id' => (string) Str::uuid(),
            'status' => 'parsed',
            'data' => $rows,
            'file_name' => $file->getClientOriginalName(),
        ]);

        return redirect()
            ->route('admin.sales.index', $request->only(['year', 'jenis_kopi_id']));
    }

    public function cancelUpload(Request $request): RedirectResponse
    {
        $request->session()->forget(self::SESSION_UPLOAD_PREVIEW);
        $request->session()->forget(self::SESSION_PREPROCESSED);

        return redirect()
            ->route('admin.sales.index', $request->only(['year', 'jenis_kopi_id']))
            ->with('success', 'Pratinjau unggahan dibatalkan.');
    }

    /**
     * Upload CSV and send to FastAPI for preprocessing + anomaly detection.
     * Result is stored in session and displayed via Inertia for review.
     */
    public function previewCsv(UploadSalesFileRequest $request): RedirectResponse
    {
        $file = $request->file('file');
        $ext = strtolower((string) $file->getClientOriginalExtension());

        if ($ext !== 'csv') {
            return back()->withErrors(['file' => 'Hanya file .csv yang diperbolehkan.']);
        }

        try {
            $result = $this->fastApiService->preprocessCsv($file);
        } catch (\Throwable $e) {
            return back()->withErrors([
                'file' => 'Gagal memproses CSV via FastAPI: '.$e->getMessage(),
            ]);
        }

        if (! is_array($result) || !isset($result['data_bersih'])) {
            return back()->withErrors([
                'file' => 'FastAPI mengembalikan response tidak valid.',
            ]);
        }

        $request->session()->put(self::SESSION_PREPROCESSED, [
            'upload_id' => (string) Str::uuid(),
            'file_name' => $file->getClientOriginalName(),
            'data_bersih' => $result['data_bersih'] ?? [],
            'anomalies' => $result['anomalies'] ?? [
                'arabica' => [],
                'robusta' => [],
                'asalan' => [],
            ],
        ]);

        return redirect()
            ->route('admin.sales.index', $request->only(['year', 'jenis_kopi_id']));
    }

    public function confirm(ConfirmDataPenjualanRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $rows = $validated['data'];
        $overwrite = $validated['overwrite'] ?? false;

        $maxYear = collect($rows)
            ->map(fn (array $r) => Carbon::parse($r['periode'])->year)
            ->max() ?? now()->year;

        DB::transaction(function () use ($rows, $overwrite, $request) {
            $totalRows = count($rows);

            foreach ($rows as $row) {
                $periode = Carbon::parse($row['periode'])->startOfMonth();
                $jenisKopiId = $row['jenis_kopi_id'] ?? null;

                if (! $jenisKopiId && isset($row['jenis_kopi_slug'])) {
                    $jenis = $this->jenisKopiService->resolveBySlug((string) $row['jenis_kopi_slug']);
                    $jenisKopiId = $jenis?->id;
                }

                if (! $jenisKopiId) {
                    continue;
                }

                if ($overwrite) {
                    $this->upsertPenjualan($periode, $jenisKopiId, (float) $row['quantity']);
                } else {
                    $exists = DataPenjualan::query()
                        ->where('jenis_kopi_id', $jenisKopiId)
                        ->whereDate('periode', $periode->toDateString())
                        ->exists();

                    if (! $exists) {
                        $this->upsertPenjualan($periode, $jenisKopiId, (float) $row['quantity']);
                    }
                }
            }

            UploadLog::create([
                'user_id' => $request->user()->id,
                'file_name' => $request->input('file_name', 'upload'),
                'total_rows' => $totalRows,
                'status' => 'success',
            ]);
        });

        $request->session()->forget(self::SESSION_UPLOAD_PREVIEW);

        return redirect()
            ->route('admin.sales.index', ['year' => $maxYear])
            ->with('success', 'Data dari CSV berhasil disimpan ke data_penjualan.');
    }

    /**
     * Receive corrected pivot data from AnomalyPreview and save to database.
     * Each row contains: tanggal (e.g. "Jan-23"), arabica, robusta, asalan.
     * Expands into 3 records per row (one per jenis kopi).
     */
    public function storeBulk(Request $request): RedirectResponse
    {
        $request->validate([
            'data' => ['required', 'array', 'min:1'],
            'data.*.tanggal' => ['required', 'string'],
            'data.*.arabica' => ['required', 'numeric', 'min:0'],
            'data.*.robusta' => ['required', 'numeric', 'min:0'],
            'data.*.asalan' => ['required', 'numeric', 'min:0'],
        ]);

        $rows = $request->input('data');

        $jenisMap = [
            'arabica' => JenisKopi::ARABICA,
            'robusta' => JenisKopi::ROBUSTA,
            'asalan' => JenisKopi::ASALAN,
        ];

        $maxYear = 0;

        DB::transaction(function () use ($rows, $jenisMap, &$maxYear, $request) {
            $totalRows = 0;

            foreach ($rows as $row) {
                $periode = $this->parsePeriode($row['tanggal']);
                if (! $periode) {
                    continue;
                }

                if ($periode->year > $maxYear) {
                    $maxYear = $periode->year;
                }

                foreach ($jenisMap as $slug => $jenisKopiId) {
                    $qty = (float) ($row[$slug] ?? 0);
                    $this->upsertPenjualan($periode, $jenisKopiId, $qty);
                    $totalRows++;
                }
            }

            UploadLog::create([
                'user_id' => $request->user()->id,
                'file_name' => $request->input('file_name', 'bulk-upload'),
                'total_rows' => $totalRows,
                'status' => 'success',
            ]);
        });

        // Clear preview sessions
        $request->session()->forget(self::SESSION_PREPROCESSED);
        $request->session()->forget(self::SESSION_UPLOAD_PREVIEW);

        return redirect()
            ->route('admin.sales.index', ['year' => $maxYear])
            ->with('success', 'Data dari preview berhasil disimpan ke database (' . count($rows) . ' periode).');
    }

    /**
     * Parse various date string formats into a Carbon instance.
     * Supports: "Jan-23", "Jan-2023", "2023-01", "2023-01-01", etc.
     */
    private function parsePeriode(string $raw): ?Carbon
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        // "Jan-23" or "Jan-2023" — MMM-YY / MMM-YYYY
        if (preg_match('/^([A-Za-z]{3,})[\-\/\s](\d{2,4})$/i', $raw, $m)) {
            $year = (int) $m[2];
            if ($year < 100) {
                $year += 2000;
            }
            try {
                return Carbon::createFromFormat('M Y', $m[1] . ' ' . $year)->startOfMonth();
            } catch (\Throwable) {
                // Try English month parse
            }
        }

        // "2023-01" — YYYY-MM
        if (preg_match('/^(\d{4})[\-\/](\d{1,2})$/', $raw, $m)) {
            return Carbon::createFromDate((int) $m[1], (int) $m[2], 1)->startOfMonth();
        }

        // Fallback: let Carbon try to parse it
        try {
            return Carbon::parse($raw)->startOfMonth();
        } catch (\Throwable) {
            return null;
        }
    }

    private function upsertPenjualan(Carbon $periode, string $jenisKopiId, float $quantity): void
    {
        $existing = DataPenjualan::query()
            ->where('jenis_kopi_id', $jenisKopiId)
            ->whereDate('periode', $periode->toDateString())
            ->first();

        if ($existing) {
            $existing->update([
                'tahun' => $periode->year,
                'bulan' => $periode->month,
                'quantity' => $quantity,
            ]);

            return;
        }

        DataPenjualan::query()->create([
            'id' => SequentialIdGenerator::next('DP', 'data_penjualan'),
            'periode' => $periode->toDateString(),
            'tahun' => $periode->year,
            'bulan' => $periode->month,
            'jenis_kopi_id' => $jenisKopiId,
            'quantity' => $quantity,
        ]);
    }

    public function truncate(Request $request): RedirectResponse
    {
        DB::transaction(function () {
            // Urutan: tabel anak dihapus lebih dulu, baru tabel induk.
            // 1. Rincian Peramalan (anak dari hasil_peramalan)
            DB::table('rincian_peramalan')->delete();

            // 2. Hasil Peramalan (anak dari jenis_kopi)
            DB::table('hasil_peramalan')->delete();

            // 3. Data Penjualan (tabel utama)
            DB::table('data_penjualan')->delete();
        });

        return redirect()
            ->route('admin.sales.index')
            ->with('success', 'Sistem berhasil di-reset. Seluruh data penjualan dan riwayat peramalan telah dikosongkan.');
    }

    /**
     * Terima hasil preprocessing SSE dari React (data_bersih JSON),
     * simpan ke session SESSION_PREPROCESSED agar AnomalyPreview dapat dirender.
     *
     * Alur baru (SSE):
     *   React → FastAPI /api/preprocess-stream (SSE) → React → Laravel (sini) → session → AnomalyPreview
     */
    public function confirmPreprocessed(Request $request): RedirectResponse
    {
        $request->validate([
            'data_bersih' => ['required', 'array', 'min:1'],
            'file_name'   => ['required', 'string', 'max:255'],
        ]);

        $request->session()->forget(self::SESSION_UPLOAD_PREVIEW);

        $request->session()->put(self::SESSION_PREPROCESSED, [
            'upload_id'   => (string) Str::uuid(),
            'file_name'   => $request->input('file_name'),
            'data_bersih' => $request->input('data_bersih'),
            // Anomali dikosongkan dulu — user bisa menjalankan detect-anomaly
            // via tombol di AnomalyPreview seperti biasa.
            'anomalies'   => [
                'arabica' => [],
                'robusta' => [],
                'asalan'  => [],
            ],
        ]);

        return redirect()
            ->route('admin.sales.index', $request->only(['year', 'jenis_kopi_id']))
            ->with('success', 'Data berhasil diproses via preprocessing real-time. Silakan periksa dan deteksi anomali.');
    }
}

