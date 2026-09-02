<?php

namespace Database\Seeders;

use App\Models\RincianPeramalan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class RincianPeramalanSeeder extends Seeder
{
    public function run(): void
    {
        $forecastByHasil = [
            'HP1' => [520.0, 540.0, 555.0, 570.0, 585.0, 600.0],
            'HP2' => [820.0, 835.0, 850.0, 865.0, 880.0, 895.0],
            'HP3' => [380.0, 375.0, 370.0, 365.0, 360.0, 355.0],
        ];

        $counter = 1;
        $startPrediksi = Carbon::create(2025, 7, 1)->startOfMonth();

        foreach ($forecastByHasil as $hasilId => $values) {
            foreach ($values as $offset => $nilai) {
                $periode = $startPrediksi->copy()->addMonths($offset);

                RincianPeramalan::query()->updateOrCreate(
                    [
                        'hasil_peramalan_id' => $hasilId,
                        'periode' => $periode->toDateString(),
                    ],
                    [
                        'id' => 'RP'.$counter,
                        'tahun' => (int) $periode->year,
                        'bulan' => (int) $periode->month,
                        'nilai_peramalan' => $nilai,
                    ],
                );

                $counter++;
            }
        }
    }
}
