"""
Agrorra Koerintji — FastAPI Preprocessing Engine
=================================================
Pipeline (2 tahap):
  1. POST /api/preprocess    → Cleaning + Agregasi Bulanan + Pivot
                               (mengembalikan data_bersih JSON saja)
  2. POST /api/detect-anomaly → Menerima data_bersih dari frontend,
                               memanggil anomaly_detector, mengembalikan anomalies.

Desain ini menghindari timeout pada satu endpoint monolitik.
"""

import json
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd

# Memanggil File Eksekusi ( Services)
from services.preprocessing import process_csv_data, process_csv_stream
from services.forecasting import _run_holtwinters_single, merge_multi_timeline, forecast_stream
from services.anomaly_detector import detect_time_series_anomalies

app = FastAPI(
    title="Agrorra Koerintji - Preprocessing Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
#  Pintu Masuk 1: Terima File CSV & Bersihkan Data
# ---------------------------------------------------------------------------
@app.post("/api/preprocess")
async def preprocess_csv(file: UploadFile = File(...)):
    """
    Menerima file CSV, membaca bytes-nya, lalu melemparnya ke service 
    preprocessing.py agar main.py tetap bersih.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak ditemukan.")

    try:
        raw_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {str(e)}")

    # Panggil fungsi processing dari service
    return process_csv_data(raw_bytes, file.filename)


# ---------------------------------------------------------------------------
#  Pintu Masuk 1B: Terima File CSV (Secara Live/Langsung)
# ---------------------------------------------------------------------------
@app.post("/api/preprocess-stream")
async def preprocess_csv_stream_endpoint(file: UploadFile = File(...)):
    """
    SSE endpoint: stream pipeline preprocessing tahap demi tahap.
    Response: text/event-stream
    Setiap event: data: {json}\n\n
    Event types:
      - type='step'   → progress per tahap
      - type='result' → hasil akhir data_bersih
      - type='error'  → pesan error terminal
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak ditemukan.")

    try:
        raw_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {str(e)}")

    filename = file.filename

    async def event_stream():
        try:
            async for event in process_csv_stream(raw_bytes, filename):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            error_event = {
                "type": "error",
                "message": f"Kesalahan tidak terduga: {str(e)}"
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
#  Struktur Data: Syarat Input Deteksi Anomali
# ---------------------------------------------------------------------------
class DetectAnomalyRequest(BaseModel):
    data_bersih: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
#  Pintu Masuk 2: Jalankan Deteksi Anomali
# ---------------------------------------------------------------------------
@app.post("/api/detect-anomaly")
async def detect_anomaly(payload: DetectAnomalyRequest):
    if not payload.data_bersih:
        raise HTTPException(status_code=400, detail="Payload data_bersih kosong.")

    try:
        df_pivot = pd.DataFrame(payload.data_bersih)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Gagal mengonversi data_bersih ke DataFrame: {str(e)}"
        )

    try:
        anomalies = detect_time_series_anomalies(df_pivot)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat deteksi anomali: {str(e)}"
        )

    return {"anomalies": anomalies}


# ---------------------------------------------------------------------------
#  Struktur Data: Syarat Input Peramalan (Forecasting)
# ---------------------------------------------------------------------------
class TimeSeriesPoint(BaseModel):
    periode: str
    quantity: float

class ForecastRequestItem(BaseModel):
    jenis_kopi: str
    data: List[TimeSeriesPoint]
    mode: str
    alpha: Optional[float] = None
    beta: Optional[float] = None
    gamma: Optional[float] = None

class ForecastBulkRequest(BaseModel):
    requests: List[ForecastRequestItem]


# ---------------------------------------------------------------------------
#  Pintu Masuk 3: Jalankan Peramalan (Tanpa Live)
# ---------------------------------------------------------------------------
@app.post("/api/forecast")
async def generate_forecast(payload: ForecastBulkRequest):
    results = []

    for req in payload.requests:
        jenis = req.jenis_kopi

        if jenis.lower() == "semua":
            results_map: dict[str, dict] = {}
            for kopi in ["arabica", "robusta", "asalan"]:
                results_map[kopi] = _run_holtwinters_single(
                    jenis=kopi,
                    data_points=req.data,
                    mode=req.mode,
                    alpha_input=req.alpha,
                    beta_input=req.beta,
                    gamma_input=req.gamma,
                )

            success_list = [r for r in results_map.values() if r["status"] == "success"]
            if not success_list:
                first_err = next(iter(results_map.values()))
                results.append({
                    "status": "error",
                    "jenis_kopi": "semua",
                    "pesan": first_err.get("pesan", "Semua model gagal dijalankan."),
                })
                continue

            multi_chart_data = merge_multi_timeline(results_map)

            rek_parts = []
            for kopi in ["arabica", "robusta", "asalan"]:
                r = results_map.get(kopi, {})
                if r.get("status") == "success" and r.get("rekomendasi_bisnis"):
                    rek_parts.append(f"[{kopi.upper()}] {r['rekomendasi_bisnis']}")
            rekomendasi_gabungan = " | ".join(rek_parts) if rek_parts else ""

            ref = results_map.get("arabica") or success_list[0]

            results.append({
                "status": "success",
                "jenis_kopi": "semua",
                "parameter_digunakan": ref.get("parameter_digunakan"),
                "mape_testing": ref.get("mape_testing"),
                "chart_data": multi_chart_data,
                "rekomendasi_bisnis": rekomendasi_gabungan,
                "detail_per_jenis": {
                    kopi: {
                        "mape_testing": results_map[kopi].get("mape_testing"),
                        "parameter_digunakan": results_map[kopi].get("parameter_digunakan"),
                        "rekomendasi_bisnis": results_map[kopi].get("rekomendasi_bisnis"),
                    }
                    for kopi in ["arabica", "robusta", "asalan"]
                    if results_map.get(kopi, {}).get("status") == "success"
                },
            })

        else:
            result = _run_holtwinters_single(
                jenis=jenis,
                data_points=req.data,
                mode=req.mode,
                alpha_input=req.alpha,
                beta_input=req.beta,
                gamma_input=req.gamma,
            )
            results.append(result)

    return results


# ---------------------------------------------------------------------------
#  Struktur Data: Syarat Input Peramalan Live
# ---------------------------------------------------------------------------
class ForecastStreamRequest(BaseModel):
    jenis_kopi: str
    data: List[Dict[str, Any]]
    mode: str = "otomatis"
    alpha: Optional[float] = None
    beta: Optional[float] = None
    gamma: Optional[float] = None


# ---------------------------------------------------------------------------
#  Pintu Masuk 3B: Jalankan Peramalan (Secara Live/Streaming)
# ---------------------------------------------------------------------------
@app.post("/api/forecast-stream")
async def forecast_stream_endpoint(payload: ForecastStreamRequest):
    """
    SSE endpoint: stream pipeline peramalan Holt-Winters tahap demi tahap.
    Response: text/event-stream
    Event types:
      - type='step'   → progress per tahap (6 steps)
      - type='result' → hasil akhir lengkap (chart_data, forecast_rows, dll)
      - type='error'  → pesan error
    """
    async def event_stream():
        try:
            async for event in forecast_stream(
                jenis=payload.jenis_kopi,
                data_points=payload.data,
                mode=payload.mode,
                alpha_input=payload.alpha,
                beta_input=payload.beta,
                gamma_input=payload.gamma,
            ):
                # ── MENGEMBALIKAN HASIL ──
                # Di sinilah hasil hitungan dari 'tukang ketik' (file services) dibungkus rapi.
                # Datanya diubah ke format JSON lalu dikirim balik ke React / Laravel agar bisa tampil di layar.
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            error_event = {
                "type": "error",
                "message": f"Kesalahan tidak terduga: {str(e)}"
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

# ---------------------------------------------------------------------------
#  Pintu Masuk Tes: Cek Server Hidup/Mati
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "service": "Agrorra Koerintji - Preprocessing Engine",
        "status": "running",
        "version": "1.0.0",
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
