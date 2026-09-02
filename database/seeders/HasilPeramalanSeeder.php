<?php

namespace Database\Seeders;

use App\Models\HasilPeramalan;
use App\Models\JenisKopi;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class HasilPeramalanSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'id' => 'HP1',
                'jenis_kopi_id' => JenisKopi::ARABICA,
                'metode_parameter' => 'otomatis',
                'alpha' => 0.3500,
                'beta' => 0.1200,
                'gamma' => 0.2800,
                'mape' => 8.50,
                'trend_persen' => 6.20,
                'status_akurasi' => 'sangat_baik',
                'status_trend' => 'naik',
                'rekomendasi_tindakan' => 'Persediaan Arabica disarankan ditambah secara bertahap untuk mengantisipasi peningkatan permintaan.',
                'periode_data_terakhir' => '2025-06-01',
                'periode_awal_grafik' => '2023-01-01',
                'periode_akhir_grafik' => '2025-06-01',
                'periode_awal_prediksi' => '2025-07-01',
                'periode_akhir_prediksi' => '2025-12-01',
                'jumlah_bulan_aktual_grafik' => 30,
                'jumlah_bulan_prediksi' => 6,
            ],
            [
                'id' => 'HP2',
                'jenis_kopi_id' => JenisKopi::ROBUSTA,
                'metode_parameter' => 'otomatis',
                'alpha' => 0.3800,
                'beta' => 0.1500,
                'gamma' => 0.2600,
                'mape' => 11.20,
                'trend_persen' => 4.80,
                'status_akurasi' => 'baik',
                'status_trend' => 'stabil',
                'rekomendasi_tindakan' => 'Persediaan Robusta dapat dipertahankan mengikuti pola penjualan sebelumnya.',
                'periode_data_terakhir' => '2025-06-01',
                'periode_awal_grafik' => '2023-01-01',
                'periode_akhir_grafik' => '2025-06-01',
                'periode_awal_prediksi' => '2025-07-01',
                'periode_akhir_prediksi' => '2025-12-01',
                'jumlah_bulan_aktual_grafik' => 30,
                'jumlah_bulan_prediksi' => 6,
            ],
            [
                'id' => 'HP3',
                'jenis_kopi_id' => JenisKopi::ASALAN,
                'metode_parameter' => 'manual',
                'alpha' => 0.3200,
                'beta' => 0.1000,
                'gamma' => 0.3000,
                'mape' => 14.75,
                'trend_persen' => -3.50,
                'status_akurasi' => 'baik',
                'status_trend' => 'stabil',
                'rekomendasi_tindakan' => 'Persediaan Asalan dapat dipertahankan mengikuti pola penjualan sebelumnya.',
                'periode_data_terakhir' => '2025-06-01',
                'periode_awal_grafik' => '2023-01-01',
                'periode_akhir_grafik' => '2025-06-01',
                'periode_awal_prediksi' => '2025-07-01',
                'periode_akhir_prediksi' => '2025-12-01',
                'jumlah_bulan_aktual_grafik' => 30,
                'jumlah_bulan_prediksi' => 6,
            ],
        ];

        foreach ($rows as $row) {
            HasilPeramalan::query()->updateOrCreate(
                ['id' => $row['id']],
                array_merge($row, [
                    'tanggal_peramalan' => Carbon::create(2025, 6, 15, 10, 0, 0),
                ]),
            );
        }
    }
}
