<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class SequentialIdGenerator
{
    public static function next(string $prefix, string $table, string $column = 'id'): string
    {
        $pattern = $prefix.'%';
        $rows = DB::table($table)
            ->where($column, 'like', $pattern)
            ->pluck($column);

        $max = 0;
        foreach ($rows as $id) {
            if (preg_match('/^'.preg_quote($prefix, '/').'(\d+)$/', (string) $id, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        return $prefix.($max + 1);
    }
}
