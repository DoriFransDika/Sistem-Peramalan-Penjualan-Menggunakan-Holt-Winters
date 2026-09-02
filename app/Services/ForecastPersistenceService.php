<?php

namespace App\Services;

use App\Models\DataPenjualan;
use App\Models\HasilPeramalan;
use App\Models\RincianPeramalan;
use App\Support\SequentialIdGenerator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ForecastPersistenceService
{
    public function store(array $payload): HasilPeramalan
    {
        return DB::transaction(function () use ($payload) {
            $hasilId = SequentialIdGenerator::next('HP', 'hasil_peramalan');

            $rincianRows = $payload['rincian'] ?? [];
            $periodePrediksi = collect($rincianRows)
                ->map(fn (array $r) => Carbon::parse($r['periode'])->startOfMonth())
                ->sort()
                ->values();

            $actualRows = DataPenjualan::query()
                ->where('jenis_kopi_id', $payload['jenis_kopi_id'])
                ->orderBy('periode')
                ->get();

            $periodeAktual = $actualRows->pluck('periode')->map(fn ($d) => Carbon::parse($d)->startOfMonth());

            $hasil = HasilPeramalan::query()->create([
                'id' => $hasilId,
                'jenis_kopi_id' => $payload['jenis_kopi_id'],
                'metode_parameter' => $payload['metode_parameter'],
                'alpha' => $payload['alpha'],
                'beta' => $payload['beta'],
                'gamma' => $payload['gamma'],
                'mape' => $payload['mape'],
                'trend_persen' => $payload['trend_persen'] ?? null,
                'status_akurasi' => $payload['status_akurasi'],
                'status_trend' => $payload['status_trend'],
                'rekomendasi_tindakan' => $payload['rekomendasi_tindakan'],
                'periode_data_terakhir' => $payload['periode_data_terakhir'] ?? $periodeAktual->last()?->toDateString(),
                'periode_awal_grafik' => $payload['periode_awal_grafik'] ?? $periodeAktual->first()?->toDateString(),
                'periode_akhir_grafik' => $payload['periode_akhir_grafik'] ?? $periodeAktual->last()?->toDateString(),
                'periode_awal_prediksi' => $payload['periode_awal_prediksi'] ?? $periodePrediksi->first()?->toDateString(),
                'periode_akhir_prediksi' => $payload['periode_akhir_prediksi'] ?? $periodePrediksi->last()?->toDateString(),
                'jumlah_bulan_aktual_grafik' => $payload['jumlah_bulan_aktual_grafik'] ?? $periodeAktual->count(),
                'jumlah_bulan_prediksi' => $payload['jumlah_bulan_prediksi'] ?? count($rincianRows),
                'tanggal_peramalan' => $payload['tanggal_peramalan'] ?? now(),
            ]);

            foreach ($rincianRows as $row) {
                $periode = Carbon::parse($row['periode'])->startOfMonth();

                RincianPeramalan::query()->create([
                    'id' => SequentialIdGenerator::next('RP', 'rincian_peramalan'),
                    'hasil_peramalan_id' => $hasil->id,
                    'periode' => $periode->toDateString(),
                    'tahun' => (int) $periode->year,
                    'bulan' => (int) $periode->month,
                    'nilai_peramalan' => $row['nilai_peramalan'],
                ]);
            }

            return $hasil->load('rincianPeramalan');
        });
    }

    public static function statusAkurasiFromMape(float $mape): string
    {
        if ($mape < 8) {
            return 'sangat_baik';
        }
        if ($mape < 15) {
            return 'baik';
        }
        if ($mape < 25) {
            return 'cukup';
        }

        return 'buruk';
    }

    public static function statusTrendFromPercent(?float $trend): string
    {
        if ($trend === null) {
            return 'stabil';
        }
        if ($trend > 8) {
            return 'naik';
        }
        if ($trend < -8) {
            return 'turun';
        }

        return 'stabil';
    }

    public static function rekomendasiFromTrend(string $statusTrend): string
    {
        return match ($statusTrend) {
            'naik' => 'Persediaan disarankan ditambah secara bertahap untuk mengantisipasi peningkatan permintaan.',
            'turun' => 'Penambahan stok perlu dikurangi agar tidak terjadi penumpukan persediaan.',
            default => 'Persediaan dapat dipertahankan mengikuti pola penjualan sebelumnya.',
        };
    }
}
