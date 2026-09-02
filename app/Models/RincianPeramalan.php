<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RincianPeramalan extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'rincian_peramalan';

    protected $fillable = [
        'id',
        'hasil_peramalan_id',
        'periode',
        'tahun',
        'bulan',
        'nilai_peramalan',
    ];

    protected $casts = [
        'periode' => 'date',
        'nilai_peramalan' => 'decimal:2',
        'tahun' => 'integer',
        'bulan' => 'integer',
    ];

    public function hasilPeramalan(): BelongsTo
    {
        return $this->belongsTo(HasilPeramalan::class, 'hasil_peramalan_id');
    }
}
