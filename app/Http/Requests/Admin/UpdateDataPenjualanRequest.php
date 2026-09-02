<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDataPenjualanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'periode' => ['required', 'date'],
            'jenis_kopi_id' => ['required', 'string', 'exists:jenis_kopi,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
