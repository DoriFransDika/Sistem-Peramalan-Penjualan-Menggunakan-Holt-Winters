<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            ManagerUserSeeder::class,
            JenisKopiSeeder::class,
            DataPenjualanSeeder::class,
            HasilPeramalanSeeder::class,
            RincianPeramalanSeeder::class,
        ]);
    }
}
