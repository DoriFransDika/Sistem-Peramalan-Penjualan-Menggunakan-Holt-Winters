@echo off
echo ==================================================
echo Menghidupkan Server Agrorra Koerintji (Mode Publik)
echo ==================================================

echo 1. Menjalankan FastAPI (Python)...
start cmd /k ".\venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"

echo 2. Menjalankan Laravel...
start cmd /k "php artisan serve"

echo 3. Mengekspos Laravel ke Internet (Ngrok)...
start cmd /k "ngrok http 8000 --domain=prodigy-anywhere-buckshot.ngrok-free.dev"

set PATH=%PATH%;C:\Program Files (x86)\cloudflared

echo 4. Mengekspos FastAPI ke Internet (Cloudflare Tunnel)...
start cmd /k "cloudflared tunnel --url http://localhost:8001"

echo.
echo ==================================================
echo SEMUA SERVER SEDANG BERJALAN DI 4 JENDELA BARU!
echo ==================================================
echo.
echo URL LARAVEL (Tetap):
echo   https://prodigy-anywhere-buckshot.ngrok-free.dev
echo.
echo URL FASTAPI:
echo   Buka jendela Cloudflare Tunnel, cari baris bertuliskan:
echo   "https://xxxxx-xxxxx-xxxxx.trycloudflare.com"
echo   COPY URL tersebut, lalu paste ke file .env:
echo   VITE_FASTAPI_URL=https://xxxxx-xxxxx-xxxxx.trycloudflare.com
echo   Kemudian jalankan: npm run build
echo   Lalu Refresh Browser!
echo.
pause
