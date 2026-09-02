<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisKopi extends Model
{
    public const ARABICA = 'JK1';

    public const ROBUSTA = 'JK2';

    public const ASALAN = 'JK3';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'jenis_kopi';

    protected $fillable = [
        'id',
        'nama_jenis',
        'status',
    ];

    public function dataPenjualan(): HasMany
    {
        return $this->hasMany(DataPenjualan::class, 'jenis_kopi_id');
    }

    public function hasilPeramalan(): HasMany
    {
        return $this->hasMany(HasilPeramalan::class, 'jenis_kopi_id');
    }
}
