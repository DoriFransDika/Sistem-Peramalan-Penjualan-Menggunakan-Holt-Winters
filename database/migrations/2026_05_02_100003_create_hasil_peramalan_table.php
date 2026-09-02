<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hasil_peramalan', function (Blueprint $table) {
            $table->string('id', 10)->primary();
            $table->string('jenis_kopi_id', 10);
            $table->enum('metode_parameter', ['otomatis', 'manual']);
            $table->decimal('alpha', 5, 4);
            $table->decimal('beta', 5, 4);
            $table->decimal('gamma', 5, 4);
            $table->decimal('mape', 5, 2);
            $table->decimal('trend_persen', 5, 2)->nullable();
            $table->enum('status_akurasi', ['sangat_baik', 'baik', 'cukup', 'buruk']);
            $table->enum('status_trend', ['naik', 'turun', 'stabil']);
            $table->string('rekomendasi_tindakan', 255);
            $table->date('periode_data_terakhir')->nullable();
            $table->date('periode_awal_grafik')->nullable();
            $table->date('periode_akhir_grafik')->nullable();
            $table->date('periode_awal_prediksi')->nullable();
            $table->date('periode_akhir_prediksi')->nullable();
            $table->integer('jumlah_bulan_aktual_grafik')->nullable();
            $table->integer('jumlah_bulan_prediksi')->nullable();
            $table->dateTime('tanggal_peramalan');
            $table->timestamps();

            $table->foreign('jenis_kopi_id')
                ->references('id')
                ->on('jenis_kopi')
                ->cascadeOnDelete();

            $table->index('jenis_kopi_id');
            $table->index('tanggal_peramalan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hasil_peramalan');
    }
};
