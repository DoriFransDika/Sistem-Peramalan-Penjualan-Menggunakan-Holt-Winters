<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_penjualan', function (Blueprint $table) {
            $table->string('id', 10)->primary();
            $table->date('periode');
            $table->integer('tahun');
            $table->integer('bulan');
            $table->string('jenis_kopi_id', 10);
            $table->decimal('quantity', 10, 2);
            $table->timestamps();

            $table->foreign('jenis_kopi_id')
                ->references('id')
                ->on('jenis_kopi')
                ->cascadeOnDelete();

            $table->unique(['jenis_kopi_id', 'periode']);
            $table->index('periode');
            $table->index(['tahun', 'bulan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_penjualan');
    }
};
