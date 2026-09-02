<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataPenjualan extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'data_penjualan';

    protected $fillable = [
        'id',
        'periode',
        'tahun',
        'bulan',
        'jenis_kopi_id',
        'quantity',
    ];

    protected $casts = [
        'periode' => 'date',
        'quantity' => 'decimal:2',
        'tahun' => 'integer',
        'bulan' => 'integer',
    ];

    public function jenisKopi(): BelongsTo
    {
        return $this->belongsTo(JenisKopi::class, 'jenis_kopi_id');
    }
}
