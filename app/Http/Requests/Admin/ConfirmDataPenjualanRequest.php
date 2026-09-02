<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmDataPenjualanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'data' => ['required', 'array', 'min:1'],
            'data.*.periode' => ['required', 'date'],
            'data.*.quantity' => ['required', 'numeric', 'gt:0'],
            'data.*.jenis_kopi_id' => ['nullable', 'string', 'exists:jenis_kopi,id'],
            'data.*.jenis_kopi_slug' => ['nullable', 'string'],
            'overwrite' => ['sometimes', 'boolean'],
            'file_name' => ['nullable', 'string'],
        ];
    }
}
