<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHasilPeramalanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'jenis_kopi_id' => ['required', 'string', 'exists:jenis_kopi,id'],
            'metode_parameter' => ['required', Rule::in(['otomatis', 'manual'])],
            'alpha' => ['required', 'numeric', 'between:0.0001,0.9999'],
            'beta' => ['required', 'numeric', 'between:0.0001,0.9999'],
            'gamma' => ['required', 'numeric', 'between:0.0001,0.9999'],
            'mape' => ['required', 'numeric', 'min:0', 'max:999.99'],
            'trend_persen' => ['nullable', 'numeric'],
            'status_akurasi' => ['required', Rule::in(['sangat_baik', 'baik', 'cukup', 'buruk'])],
            'status_trend' => ['required', Rule::in(['naik', 'turun', 'stabil'])],
            'rekomendasi_tindakan' => ['required', 'string', 'max:255'],
            'rincian' => ['required', 'array', 'min:1'],
            'rincian.*.periode' => ['required', 'date'],
            'rincian.*.nilai_peramalan' => ['required', 'numeric', 'min:0'],
            'periode_data_terakhir' => ['nullable', 'date'],
            'periode_awal_grafik' => ['nullable', 'date'],
            'periode_akhir_grafik' => ['nullable', 'date'],
            'periode_awal_prediksi' => ['nullable', 'date'],
            'periode_akhir_prediksi' => ['nullable', 'date'],
            'jumlah_bulan_aktual_grafik' => ['nullable', 'integer', 'min:0'],
            'jumlah_bulan_prediksi' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
