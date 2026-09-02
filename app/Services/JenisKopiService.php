<?php

namespace App\Services;

use App\Models\JenisKopi;
use Illuminate\Support\Collection;

class JenisKopiService
{
    public function ensureDefaults(): void
    {
        $defaults = [
            JenisKopi::ARABICA => 'Arabica',
            JenisKopi::ROBUSTA => 'Robusta',
            JenisKopi::ASALAN => 'Asalan',
        ];

        foreach ($defaults as $id => $nama) {
            JenisKopi::query()->updateOrCreate(
                ['id' => $id],
                ['nama_jenis' => $nama, 'status' => 'aktif'],
            );
        }
    }

    public function listActive(): Collection
    {
        $this->ensureDefaults();

        return JenisKopi::query()
            ->where('status', 'aktif')
            ->orderBy('id')
            ->get(['id', 'nama_jenis']);
    }

    /** @return list<array{id: string, nama_jenis: string}> */
    public function listForUi(): array
    {
        return $this->listActive()
            ->map(fn (JenisKopi $j) => ['id' => $j->id, 'nama_jenis' => $j->nama_jenis])
            ->values()
            ->all();
    }

    public function resolveBySlug(string $slug): ?JenisKopi
    {
        $this->ensureDefaults();
        $slug = strtolower(trim($slug));

        if ($slug === '') {
            return null;
        }

        $map = [
            'arabica' => JenisKopi::ARABICA,
            'robusta' => JenisKopi::ROBUSTA,
            'asalan' => JenisKopi::ASALAN,
        ];

        if (isset($map[$slug])) {
            return JenisKopi::query()->find($map[$slug]);
        }

        return JenisKopi::query()
            ->where('status', 'aktif')
            ->get()
            ->first(fn (JenisKopi $j) => str_contains(strtolower($j->nama_jenis), $slug));
    }

    public function findByNama(string $nama): ?JenisKopi
    {
        $this->ensureDefaults();

        return JenisKopi::query()
            ->where('nama_jenis', $nama)
            ->first();
    }
}
