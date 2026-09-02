@echo off
echo =========================================
echo Menghidupkan Server Agrorra Koerintji...
echo =========================================

echo 1. Menjalankan Laravel...
start cmd /k "php artisan serve"

echo 2. Menjalankan React (Vite)...
start cmd /k "npm run dev"

echo 3. Menjalankan FastAPI (Python)...
start cmd /k ".\venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"

echo Semua server sedang dihidupkan di jendela baru!
exit