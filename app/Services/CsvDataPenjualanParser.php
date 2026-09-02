<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use RuntimeException;

class CsvDataPenjualanParser
{
    /**
     * Parse CSV rows into normalized preview: periode, jenis_kopi_slug, quantity.
     *
     * @return array<int, array{periode: string, jenis_kopi_slug: string, quantity: float}>
     */
    public function parseFile(string $absolutePath): array
    {
        if (! is_readable($absolutePath)) {
            throw new RuntimeException('Berkas CSV tidak dapat dibaca.');
        }

        $handle = fopen($absolutePath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Gagal membuka berkas CSV.');
        }

        $firstLine = fgets($handle);
        if ($firstLine === false) {
            fclose($handle);
            throw new RuntimeException('Berkas CSV kosong.');
        }

        $delimiter = $this->detectDelimiter($firstLine);
        rewind($handle);

        $headerLine = fgetcsv($handle, 0, $delimiter);
        if ($headerLine === false || $headerLine === [null] || $headerLine === ['']) {
            fclose($handle);
            throw new RuntimeException('Header CSV tidak ditemukan.');
        }

        $headers = array_map(fn ($h) => $this->normalizeHeader((string) $h), $headerLine);

        $wide = $this->detectWideFormat($headers);
        $map = $wide ? null : $this->mapColumns($headers);

        $out = [];
        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            if ($this->rowIsEmpty($row)) {
                continue;
            }

            if ($wide !== null) {
                $parsed = $this->parseWideRow($row, $wide);
                foreach ($parsed as $item) {
                    $out[] = $item;
                }

                continue;
            }

            $item = $this->parseLongRow($row, $map);
            if ($item !== null) {
                $out[] = $item;
            }
        }

        fclose($handle);

        if ($out === []) {
            throw new RuntimeException('Tidak ada baris data valid yang dapat dibaca dari CSV.');
        }

        return $out;
    }

    private function detectDelimiter(string $firstLine): string
    {
        $semi = substr_count($firstLine, ';');
        $comma = substr_count($firstLine, ',');

        return $semi > $comma ? ';' : ',';
    }

    private function normalizeHeader(string $h): string
    {
        $h = preg_replace('/^\xEF\xBB\xBF/', '', $h) ?? $h;

        return strtolower(trim($h));
    }

    /**
     * @param  array<int, string>  $headers
     * @return array{period: int, arabica: int, robusta: int, asalan: int}|null
     */
    private function detectWideFormat(array $headers): ?array
    {
        $idx = [];
        foreach ($headers as $i => $h) {
            $idx[$h] = $i;
        }

        $periodCol = $this->findPeriodColumnIndex($headers);
        if ($periodCol === null) {
            return null;
        }

        $hasArabica = array_key_exists('arabica', $idx);
        $hasRobusta = array_key_exists('robusta', $idx);
        $hasAsalan = array_key_exists('asalan', $idx);

        if ($hasArabica && $hasRobusta && $hasAsalan) {
            return [
                'periode' => $periodCol,
                'arabica' => $idx['arabica'],
                'robusta' => $idx['robusta'],
                'asalan' => $idx['asalan'],
            ];
        }

        return null;
    }

    /**
     * @param  array<int, string|null>  $row
     * @param  array{period: int, arabica: int, robusta: int, asalan: int}  $wide
     * @return list<array{period: string, raw_material: string, quantity: float}>
     */
    private function parseWideRow(array $row, array $wide): array
    {
        $periodCell = $row[$wide['periode']] ?? '';
        $period = $this->parsePeriod((string) $periodCell);
        if ($period === null) {
            return [];
        }

        $out = [];
        foreach (['arabica', 'robusta', 'asalan'] as $type) {
            $qty = $this->parseQuantity($row[$wide[$type]] ?? null);
            if ($qty !== null && $qty > 0) {
                $out[] = [
                    'periode' => $period,
                    'jenis_kopi_slug' => $type,
                    'quantity' => $qty,
                ];
            }
        }

        return $out;
    }

    /**
     * @param  array<int, string>  $headers
     * @return array{period: int, type: int, quantity: int}|null
     */
    private function mapColumns(array $headers): ?array
    {
        $periodCol = $this->findPeriodColumnIndex($headers);
        $typeCol = $this->findTypeColumnIndex($headers);
        $qtyCol = $this->findQuantityColumnIndex($headers);

        if ($periodCol === null || $typeCol === null || $qtyCol === null) {
            return null;
        }

        return [
            'periode' => $periodCol,
            'type' => $typeCol,
            'quantity' => $qtyCol,
        ];
    }

    /**
     * @param  array<int, string>  $headers
     */
    private function findPeriodColumnIndex(array $headers): ?int
    {
        $keys = ['tanggal', 'tgl', 'date', 'bulan', 'periode', 'month', 'period', 'tahun', 'tahun_bulan'];

        foreach ($headers as $i => $h) {
            foreach ($keys as $k) {
                if ($h === $k || str_contains($h, $k)) {
                    return $i;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $headers
     */
    private function findTypeColumnIndex(array $headers): ?int
    {
        $keys = ['jenis', 'jenis_kopi', 'tipe', 'type', 'barang', 'kopi', 'bahan', 'material', 'raw_material', 'variant', 'kategori'];

        foreach ($headers as $i => $h) {
            foreach ($keys as $k) {
                if ($h === $k || str_contains($h, $k)) {
                    return $i;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $headers
     */
    private function findQuantityColumnIndex(array $headers): ?int
    {
        $keys = ['qty', 'quantity', 'kuantitas', 'jumlah', 'berat', 'kg', 'total', 'volume', 'jml'];

        foreach ($headers as $i => $h) {
            foreach ($keys as $k) {
                if ($h === $k || str_contains($h, $k)) {
                    return $i;
                }
            }
        }

        // fallback: first column that looks numeric-heavy in sample — pick last numeric-ish header word
        foreach ($headers as $i => $h) {
            if (preg_match('/\d/', $h) === 1) {
                return $i;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string|null>  $row
     * @param  array{period: int, type: int, quantity: int}  $map
     * @return array{period: string, raw_material: string, quantity: float}|null
     */
    private function parseLongRow(array $row, ?array $map): ?array
    {
        if ($map === null) {
            // fallback: first 3 columns as period, type, qty
            if (count($row) < 3) {
                return null;
            }
            $period = $this->parsePeriod((string) ($row[0] ?? ''));
            $type = $this->normalizeType((string) ($row[1] ?? ''));
            $qty = $this->parseQuantity($row[2] ?? null);
        } else {
            $period = $this->parsePeriod((string) ($row[$map['periode']] ?? ''));
            $type = $this->normalizeType((string) ($row[$map['type']] ?? ''));
            $qty = $this->parseQuantity($row[$map['quantity']] ?? null);
        }

        if ($period === null || $type === null || $qty === null || $qty <= 0) {
            return null;
        }

        return [
            'periode' => $period,
            'jenis_kopi_slug' => $type,
            'quantity' => $qty,
        ];
    }

    private function parsePeriod(string $cell): ?string
    {
        $cell = trim($cell);
        if ($cell === '') {
            return null;
        }

        try {
            $c = Carbon::parse($cell)->startOfMonth()->toDateString();
        } catch (\Throwable) {
            return null;
        }

        return $c;
    }

    private function normalizeType(string $cell): ?string
    {
        $s = strtolower(trim($cell));
        if ($s === '') {
            return null;
        }
        if (str_contains($s, 'arabica')) {
            return 'arabica';
        }
        if (str_contains($s, 'robusta')) {
            return 'robusta';
        }
        if (str_contains($s, 'asalan')) {
            return 'asalan';
        }

        return null;
    }

    private function parseQuantity(mixed $cell): ?float
    {
        if ($cell === null) {
            return null;
        }
        $s = str_replace([' ', ','], ['', '.'], trim((string) $cell));
        if ($s === '') {
            return null;
        }
        if (! is_numeric($s)) {
            return null;
        }

        return (float) $s;
    }

    /**
     * @param  array<int, string|null>  $row
     */
    private function rowIsEmpty(array $row): bool
    {
        foreach ($row as $v) {
            if ($v !== null && trim((string) $v) !== '') {
                return false;
            }
        }

        return true;
    }
}
