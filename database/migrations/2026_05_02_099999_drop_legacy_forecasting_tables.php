<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        $legacyTables = [
            'rincian_peramalan',
            'hasil_peramalan',
            'data_penjualan',
            'peramalan',
            'penjualan',
            'monthly_sales',
            'raw_material_types',
            'forecast_results',
            'forecast_logs',
            'jenis_kopi',
        ];

        foreach ($legacyTables as $table) {
            Schema::dropIfExists($table);
        }

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // Tidak mengembalikan skema lama; gunakan migrate:fresh jika perlu rollback penuh.
    }
};
