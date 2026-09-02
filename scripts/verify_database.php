<?php

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$dbName = DB::connection()->getDatabaseName();
echo "Database aktif: {$dbName}\n\n";

$tables = ['jenis_kopi', 'data_penjualan', 'hasil_peramalan', 'rincian_peramalan'];

foreach ($tables as $table) {
    $exists = Schema::hasTable($table);
    $count = $exists ? DB::table($table)->count() : 0;
    echo sprintf("%-20s exists=%s count=%d\n", $table, $exists ? 'yes' : 'no', $count);
}

echo "\njenis_kopi:\n";
foreach (DB::table('jenis_kopi')->orderBy('id')->get() as $row) {
    echo "  {$row->id} | {$row->nama_jenis} | {$row->status}\n";
}
