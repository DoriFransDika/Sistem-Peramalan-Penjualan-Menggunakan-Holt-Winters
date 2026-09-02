<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class FastApiService
{
    private string $baseUrl;

    public function __construct(string $baseUrl = '')
    {
        $this->baseUrl = $baseUrl
            ?: rtrim(
                config('services.fastapi.url', config('fastapi.url', env('FASTAPI_URL', 'http://127.0.0.1:8001'))),
                '/'
            );
    }

    /**
     * Send sales file to FastAPI cleaning service.
     *
     * @throws RequestException
     */
    public function cleanSales(UploadedFile $file): array
    {
        $response = Http::timeout(30)
            ->attach(
                'file',
                file_get_contents($file->getRealPath()),
                $file->getClientOriginalName()
            )
            ->post($this->baseUrl.'/clean-sales');

        if ($response->status() === 400) {
            $body = $response->json();

            $raw = is_array($body) && isset($body['detail'])
                ? (is_string($body['detail']) ? $body['detail'] : json_encode($body['detail']))
                : 'File is not valid for cleaning.';

            $message = $this->normalizeCleaningError($raw);
            throw new \RuntimeException($message);
        }

        if ($response->failed()) {
            $response->throw();
        }

        return $response->json();
    }

    /**
     * Send CSV file to FastAPI for preprocessing (cleaning, aggregation, anomaly detection).
     *
     * @return array{status: string, data_tabel: array, anomali_terdeteksi: array}
     *
     * @throws \RuntimeException
     * @throws RequestException
     */
    public function preprocessCsv(UploadedFile $file): array
    {
        $response = Http::timeout(60)
            ->attach(
                'file',
                file_get_contents($file->getRealPath()),
                $file->getClientOriginalName()
            )
            ->post($this->baseUrl.'/api/preprocess');

        if ($response->status() === 400 || $response->status() === 422) {
            $body = $response->json();

            $raw = is_array($body) && isset($body['detail'])
                ? (is_string($body['detail']) ? $body['detail'] : json_encode($body['detail']))
                : 'File CSV tidak valid untuk preprocessing.';

            throw new \RuntimeException($raw);
        }

        if ($response->failed()) {
            $response->throw();
        }

        return $response->json();
    }

    /**
     * Convert FastAPI/pandas errors into user-friendly messages.
     */
    private function normalizeCleaningError(string $raw): string
    {
        if (str_contains($raw, 'not in index') || str_contains($raw, 'tanggal') && str_contains($raw, 'qty')) {
            return 'File Excel harus berisi kolom dengan nama tepat: "tanggal" dan "qty" (huruf kecil). '
                . 'Pastikan header baris pertama sama persis. Jika pakai "Tanggal" atau "Qty", ubah menjadi "tanggal" dan "qty".';
        }

        return $raw;
    }

    /**
     * Generate forecast by calling FastAPI.
     * 
     * @param array $payload Payload JSON yang sesuai dengan ForecastBulkRequest di FastAPI.
     * @return array
     * @throws \RuntimeException
     * @throws RequestException
     */
    public function generateForecast(array $payload): array
    {
        $response = Http::timeout(120) // Holt-Winters grid search might take longer
            ->post($this->baseUrl . '/api/forecast', $payload);

        if ($response->status() === 400 || $response->status() === 422) {
            $body = $response->json();
            $raw = is_array($body) && isset($body['detail'])
                ? (is_string($body['detail']) ? $body['detail'] : json_encode($body['detail']))
                : 'Data tidak valid untuk peramalan.';
            throw new \RuntimeException($raw);
        }

        if ($response->failed()) {
            $response->throw();
        }

        return $response->json();
    }
}

