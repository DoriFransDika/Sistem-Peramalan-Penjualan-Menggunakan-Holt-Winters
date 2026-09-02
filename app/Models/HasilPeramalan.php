<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HasilPeramalan extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'hasil_peramalan';

    protected $fillable = [
        'id',
        'jenis_kopi_id',
        'metode_parameter',
        'alpha',
        'beta',
        'gamma',
        'mape',
        'trend_persen',
        'status_akurasi',
        'status_trend',
        'rekomendasi_tindakan',
        'periode_data_terakhir',
        'periode_awal_grafik',
        'periode_akhir_grafik',
        'periode_awal_prediksi',
        'periode_akhir_prediksi',
        'jumlah_bulan_aktual_grafik',
        'jumlah_bulan_prediksi',
        'tanggal_peramalan',
    ];

    protected $casts = [
        'alpha' => 'decimal:4',
        'beta' => 'decimal:4',
        'gamma' => 'decimal:4',
        'mape' => 'decimal:2',
        'trend_persen' => 'decimal:2',
        'periode_data_terakhir' => 'date',
        'periode_awal_grafik' => 'date',
        'periode_akhir_grafik' => 'date',
        'periode_awal_prediksi' => 'date',
        'periode_akhir_prediksi' => 'date',
        'tanggal_peramalan' => 'datetime',
        'jumlah_bulan_aktual_grafik' => 'integer',
        'jumlah_bulan_prediksi' => 'integer',
    ];

    public function jenisKopi(): BelongsTo
    {
        return $this->belongsTo(JenisKopi::class, 'jenis_kopi_id');
    }

    public function rincianPeramalan(): HasMany
    {
        return $this->hasMany(RincianPeramalan::class, 'hasil_peramalan_id');
    }
}
