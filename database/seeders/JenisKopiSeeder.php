<?php

namespace Database\Seeders;

use App\Models\JenisKopi;
use Illuminate\Database\Seeder;

class JenisKopiSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['id' => JenisKopi::ARABICA, 'nama_jenis' => 'Arabica', 'status' => 'aktif'],
            ['id' => JenisKopi::ROBUSTA, 'nama_jenis' => 'Robusta', 'status' => 'aktif'],
            ['id' => JenisKopi::ASALAN, 'nama_jenis' => 'Asalan', 'status' => 'aktif'],
        ];

        foreach ($rows as $row) {
            JenisKopi::query()->updateOrCreate(
                ['id' => $row['id']],
                ['nama_jenis' => $row['nama_jenis'], 'status' => $row['status']],
            );
        }
    }
}
