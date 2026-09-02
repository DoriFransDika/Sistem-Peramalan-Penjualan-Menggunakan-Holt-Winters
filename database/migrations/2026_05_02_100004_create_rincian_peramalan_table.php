<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rincian_peramalan', function (Blueprint $table) {
            $table->string('id', 10)->primary();
            $table->string('hasil_peramalan_id', 10);
            $table->date('periode');
            $table->integer('tahun');
            $table->integer('bulan');
            $table->decimal('nilai_peramalan', 10, 2);
            $table->timestamps();

            $table->foreign('hasil_peramalan_id')
                ->references('id')
                ->on('hasil_peramalan')
                ->cascadeOnDelete();

            $table->index('hasil_peramalan_id');
            $table->index('periode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rincian_peramalan');
    }
};
