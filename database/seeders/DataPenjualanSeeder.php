<?php

namespace Database\Seeders;

use App\Models\DataPenjualan;
use App\Models\JenisKopi;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DataPenjualanSeeder extends Seeder
{
    public function run(): void
    {
        $baseQuantities = [
            JenisKopi::ARABICA => 420.0,
            JenisKopi::ROBUSTA => 680.0,
            JenisKopi::ASALAN => 310.0,
        ];

        $amplitudes = [
            JenisKopi::ARABICA => 120.0,
            JenisKopi::ROBUSTA => 180.0,
            JenisKopi::ASALAN => 90.0,
        ];

        $counter = 1;
        $start = Carbon::create(2023, 1, 1)->startOfMonth();
        $end = Carbon::create(2025, 6, 1)->startOfMonth();
        $monthIndex = 0;

        for ($periode = $start->copy(); $periode->lte($end); $periode->addMonth()) {
            foreach ($baseQuantities as $jenisKopiId => $base) {
                $season = sin(($monthIndex / 12) * 2 * M_PI) * ($amplitudes[$jenisKopiId] ?? 50);
                $trend = $monthIndex * 2.5;
                $quantity = round(
                    max(50, $base + $season + $trend + (($monthIndex + ord($jenisKopiId[2])) % 7) * 3),
                    2,
                );

                $row = DataPenjualan::query()->firstOrNew([
                    'jenis_kopi_id' => $jenisKopiId,
                    'periode' => $periode->toDateString(),
                ]);

                if (! $row->exists) {
                    $row->id = 'DP'.$counter;
                    $counter++;
                }

                $row->tahun = (int) $periode->year;
                $row->bulan = (int) $periode->month;
                $row->quantity = $quantity;
                $row->save();
            }

            $monthIndex++;
        }
    }
}
