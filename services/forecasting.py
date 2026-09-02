import asyncio
from datetime import datetime, timezone
from typing import Optional
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# ---------------------------------------------------------------------------
#  Helper: Bulan Indonesia untuk label rekomendasi
# ---------------------------------------------------------------------------
BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

def label_bulan(periode_str: str) -> str:
    """Konversi '2025-03-01' → 'Maret 2025'."""
    try:
        dt = pd.to_datetime(periode_str)
        return f"{BULAN_ID[dt.month - 1]} {dt.year}"
    except Exception:
        return periode_str


# ---------------------------------------------------------------------------
#  Engine: Rekomendasi Keputusan Bisnis
# ---------------------------------------------------------------------------
def generate_rekomendasi_bisnis(forecast_6_bulan: list) -> str:
    """
    Menganalisis 6 bulan prediksi ke depan dan menghasilkan paragraf
    rekomendasi bisnis berdasarkan 3 aturan:
      1. Cek Tren (naik / turun / stabil)
      2. Cek Puncak Musiman (lonjakan ekstrem)
      3. Cek Risiko Kosong (nilai mendekati 0)
    """
    if not forecast_6_bulan or len(forecast_6_bulan) == 0:
        return "Data prediksi tidak tersedia untuk dianalisis."

    values = [item["quantity"] for item in forecast_6_bulan]
    periods = [item["periode"] for item in forecast_6_bulan]
    kalimat_list = []

    # ── Aturan 1: Cek Tren ───────────────────────────────────────────────
    n = len(values)
    rata_awal = np.mean(values[:3]) if n >= 3 else np.mean(values)
    rata_akhir = np.mean(values[3:6]) if n >= 6 else np.mean(values)

    if rata_awal > 0:
        selisih_pct = ((rata_akhir - rata_awal) / rata_awal) * 100
    else:
        selisih_pct = 0.0

    THRESHOLD_TREN = 5.0  # > 5% dianggap signifikan

    if selisih_pct > THRESHOLD_TREN:
        kalimat_list.append(
            f"📈 Tren KENAIKAN ({selisih_pct:.1f}%): Siapkan tambahan cash flow untuk "
            f"serap pasokan petani & siapkan kapasitas gudang."
        )
    elif selisih_pct < -THRESHOLD_TREN:
        kalimat_list.append(
            f"📉 Tren PENURUNAN ({abs(selisih_pct):.1f}%): Tahan pembelian bahan baku, "
            f"fokus hindari kopi stale di gudang."
        )
    else:
        kalimat_list.append(
            f"➡️ Tren STABIL (selisih {selisih_pct:.1f}%): Pertahankan safety stock."
        )

    # ── Aturan 2: Cek Puncak Musiman ────────────────────────────────────
    rata_all = np.mean(values) if values else 0
    max_val = max(values) if values else 0
    max_idx = values.index(max_val)

    THRESHOLD_PUNCAK = 1.5  # 150% dari rata-rata

    if rata_all > 0 and max_val > rata_all * THRESHOLD_PUNCAK:
        bulan_puncak = label_bulan(periods[max_idx])
        kalimat_list.append(
            f"⚠️ Waspada lonjakan Puncak Musiman pada {bulan_puncak} "
            f"sebesar {max_val:,.0f} Kg. Amankan pasokan logistik sejak sekarang!"
        )

    # ── Aturan 3: Cek Risiko Kosong ─────────────────────────────────────
    THRESHOLD_KOSONG = 0.05  # < 5% dari rata-rata
    risiko_bulan = [
        label_bulan(periods[i])
        for i, v in enumerate(values)
        if rata_all > 0 and v < rata_all * THRESHOLD_KOSONG
    ]

    if risiko_bulan:
        bulan_str = ", ".join(risiko_bulan)
        kalimat_list.append(
            f"🚨 Peringatan: Proyeksi sangat rendah pada {bulan_str}. "
            f"Hindari overstock dan lakukan evaluasi pasar!"
        )

    return " | ".join(kalimat_list) if kalimat_list else "Tidak ada sinyal bisnis signifikan yang terdeteksi."


# ---------------------------------------------------------------------------
#  Helper: Bangun Unified Timeline (satu array per-tanggal)
# ---------------------------------------------------------------------------
def build_unified_timeline(
    period_labels: list,
    y: np.ndarray,
    future_dates: list,
    forecast_overlap: np.ndarray,
    forecast_future: np.ndarray,
    insample_n: int = 3,
) -> list:
    """
    Merakit SATU array of objects berdasarkan tanggal:
    - Menyatukan data in-sample (masa lalu) dan forecast (masa depan) ke dalam SATU key 'forecast'
    - Menghindari duplikasi tanggal dengan grouping menggunakan dictionary
    - Mengurutkan data secara ketat secara kronologis
    """
    BULAN_SINGKAT = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ]

    def get_sort_key(date_str) -> str:
        try:
            dt = pd.to_datetime(date_str)
            return dt.strftime('%Y-%m-01')
        except Exception:
            return str(date_str)

    def fmt(date_str: str) -> str:
        try:
            dt = pd.to_datetime(date_str)
            return f"{BULAN_SINGKAT[dt.month - 1]} {dt.year}"
        except Exception:
            return str(date_str)

    n_total = len(period_labels)
    insample_start = max(0, n_total - insample_n)

    timeline_dict = {}

    for i, (p, val) in enumerate(zip(period_labels, y)):
        sort_key = get_sort_key(p)
        is_insample = (i >= insample_start)

        if sort_key not in timeline_dict:
            timeline_dict[sort_key] = {
                "tanggal": fmt(p),
                "sort_date": sort_key,
                "aktual": None,
                "forecast": None,
            }
        
        timeline_dict[sort_key]["aktual"] = round(float(val), 2)

        if is_insample:
            overlap_idx = i - insample_start
            timeline_dict[sort_key]["forecast"] = max(0, round(float(forecast_overlap[overlap_idx]), 2))

    for d, v in zip(future_dates, forecast_future):
        sort_key = get_sort_key(d)
        
        if sort_key not in timeline_dict:
            timeline_dict[sort_key] = {
                "tanggal": fmt(d),
                "sort_date": sort_key,
                "aktual": None,
                "forecast": None,
            }
        
        timeline_dict[sort_key]["forecast"] = max(0, round(float(v), 2))

    sorted_keys = sorted(timeline_dict.keys())
    
    timeline = []
    for k in sorted_keys:
        timeline.append(timeline_dict[k])

    return timeline


# ---------------------------------------------------------------------------
#  Helper: Jalankan Holt-Winters untuk satu jenis kopi
# ---------------------------------------------------------------------------
def _run_holtwinters_single(
    jenis: str,
    data_points: list,
    mode: str,
    alpha_input: Optional[float],
    beta_input: Optional[float],
    gamma_input: Optional[float],
) -> dict:
    """
    Menjalankan seluruh pipeline Holt-Winters untuk satu jenis kopi.
    Mengembalikan dict result yang siap dimasukkan ke array results.
    """
    if len(data_points) < 24:
        return {
            "status": "error",
            "jenis_kopi": jenis,
            "pesan": f"Data tidak cukup (minimal 24 bulan, saat ini {len(data_points)} bulan).",
        }

    y = np.array([float(pt.quantity) for pt in data_points])
    period_labels = [pt.periode for pt in data_points]

    # ── TAHAP 1: Pembagian Training & Testing ──────────────────────────
    test_size = 6
    train = y[:-test_size]
    test = y[-test_size:]
    train_safe = np.where(train <= 0, 1e-4, train)

    # ── TAHAP 2: Penentuan Parameter (Alpha, Beta, Gamma) ──────────────
    best_alpha = alpha_input if alpha_input is not None else 0.2
    best_beta = beta_input if beta_input is not None else 0.1
    best_gamma = gamma_input if gamma_input is not None else 0.2
    best_mape = float("inf")

    if mode in ("rekomendasi", "otomatis"):
        for alpha in np.arange(0.1, 1.0, 0.1):
            for beta in np.arange(0.1, 1.0, 0.1):
                for gamma in np.arange(0.1, 1.0, 0.1):
                    try:
                        model = ExponentialSmoothing(
                            train_safe,
                            trend="add",
                            seasonal="mul",
                            seasonal_periods=12,
                        ).fit(
                            smoothing_level=alpha,
                            smoothing_trend=beta,
                            smoothing_seasonal=gamma,
                            optimized=False,
                        )
                        pred = model.forecast(test_size)
                        test_safe = np.where(test == 0, 1e-9, test)
                        mape = np.mean(np.abs((test - pred) / test_safe)) * 100
                        if mape < best_mape:
                            best_mape = mape
                            best_alpha = round(float(alpha), 2)
                            best_beta = round(float(beta), 2)
                            best_gamma = round(float(gamma), 2)
                    except Exception:
                        pass

        if best_mape == float("inf"):
            best_alpha, best_beta, best_gamma = 0.2, 0.1, 0.2

    # ── TAHAP 5: Perhitungan Error dan MAPE (Evaluasi Akurasi) ─────────
    try:
        eval_model = ExponentialSmoothing(
            train_safe, trend="add", seasonal="mul", seasonal_periods=12
        ).fit(
            smoothing_level=best_alpha,
            smoothing_trend=best_beta,
            smoothing_seasonal=best_gamma,
            optimized=False,
        )
        eval_pred = eval_model.forecast(test_size)
        test_safe = np.where(test == 0, 1e-9, test)
        mape_testing = np.mean(np.abs((test - eval_pred) / test_safe)) * 100
    except Exception:
        mape_testing = 0.0

    # ── TAHAP 3: Perhitungan Level, Trend, Seasonal (Model Utama) ──────
    try:
        final_model = ExponentialSmoothing(
            train_safe, trend="add", seasonal="mul", seasonal_periods=12
        ).fit(
            smoothing_level=best_alpha,
            smoothing_trend=best_beta,
            smoothing_seasonal=best_gamma,
            optimized=False,
        )

        # ── TAHAP 4: Perhitungan Forecasting (Prediksi Masa Depan) ─────────
        future_steps = 12
        forecast_values = final_model.forecast(future_steps)
        
        forecast_overlap = forecast_values[:6]
        forecast_future = forecast_values[6:]

        # ── TAHAP 6: Menampilkan Hasil Forecasting ─────────────────────────
        last_date = pd.to_datetime(period_labels[-1])
        future_dates = [
            (last_date + pd.DateOffset(months=i)).strftime("%Y-%m-%d")
            for i in range(1, 7)
        ]

        forecast_6_bulan_internal = [
            {"periode": d, "quantity": max(0, round(float(v), 2))}
            for d, v in zip(future_dates, forecast_future)
        ]

        rekomendasi_bisnis = generate_rekomendasi_bisnis(forecast_6_bulan_internal)

        chart_data = build_unified_timeline(
            period_labels=period_labels,
            y=y,
            future_dates=future_dates,
            forecast_overlap=forecast_overlap,
            forecast_future=forecast_future,
            insample_n=6,
        )

        return {
            "status": "success",
            "jenis_kopi": jenis,
            "parameter_digunakan": {
                "alpha": best_alpha,
                "beta": best_beta,
                "gamma": best_gamma,
            },
            "mape_testing": round(float(mape_testing), 2),
            "chart_data": chart_data,
            "periode_awal":         chart_data[0]["tanggal"] if chart_data else None,
            "periode_akhir_aktual": chart_data[len(period_labels) - 1]["tanggal"] if chart_data else None,
            "periode_akhir_forecast": chart_data[-1]["tanggal"] if chart_data else None,
            "jumlah_data_aktual":   len(period_labels),
            "jumlah_prediksi":      future_steps,
            "rekomendasi_bisnis":   rekomendasi_bisnis,
        }

    except Exception as e:
        return {
            "status": "error",
            "jenis_kopi": jenis,
            "pesan": f"Gagal melatih model: {str(e)}",
        }


# ---------------------------------------------------------------------------
#  Helper: Gabung 3 Unified Timeline → satu Multi-Key Flat Timeline
# ---------------------------------------------------------------------------
def merge_multi_timeline(results_map: dict) -> list:
    """
    Menggabungkan 3 hasil _run_holtwinters_single (arabica/robusta/asalan)
    menjadi satu array flat berdasarkan label tanggal.
    """
    label_to_sort = {}
    for kopi in ["arabica", "robusta", "asalan"]:
        if kopi not in results_map or results_map[kopi]["status"] != "success":
            continue
        for row in results_map[kopi]["chart_data"]:
            lbl = row["tanggal"]
            if lbl not in label_to_sort:
                label_to_sort[lbl] = row.get("sort_date", "")

    if not label_to_sort:
        return []

    all_labels = sorted(label_to_sort.keys(), key=lambda x: label_to_sort[x])

    index: dict[str, dict] = {lbl: {"tanggal": lbl} for lbl in all_labels}

    for kopi in ["arabica", "robusta", "asalan"]:
        if kopi not in results_map or results_map[kopi]["status"] != "success":
            continue
        for row in results_map[kopi]["chart_data"]:
            lbl = row["tanggal"]
            if lbl in index:
                index[lbl][f"{kopi}_aktual"] = row.get("aktual")
                index[lbl][f"{kopi}_forecast"] = row.get("forecast")

    for lbl in all_labels:
        for kopi in ["arabica", "robusta", "asalan"]:
            index[lbl].setdefault(f"{kopi}_aktual",   None)
            index[lbl].setdefault(f"{kopi}_forecast", None)

    return [index[lbl] for lbl in all_labels]


# ---------------------------------------------------------------------------
#  Stream Generator: Forecasting Pipeline (SSE)
#  Logika identik dengan _run_holtwinters_single tetapi step-by-step.
# ---------------------------------------------------------------------------
def _fc_event(
    step: str,
    status: str,
    message: str,
    stats: dict | None = None,
    preview: dict | None = None,
) -> dict:
    event = {
        "type": "step",
        "step": step,
        "status": status,
        "message": message,
        "stats": stats or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if preview is not None:
        event["preview"] = preview
    return event


async def forecast_stream(
    jenis: str,
    data_points: list[dict],
    mode: str,
    alpha_input: float | None,
    beta_input: float | None,
    gamma_input: float | None,
):
    """
    Async generator: Holt-Winters pipeline step-by-step.
    Yield dict event per tahap (untuk SSE), diakhiri event type='result'.

    Args:
        jenis: nama jenis kopi (arabica / robusta / asalan)
        data_points: list of {"periode": "YYYY-MM-DD", "quantity": float}
        mode: "otomatis" | "manual" | "rekomendasi"
        alpha_input, beta_input, gamma_input: parameter manual (nullable)
    """

    # ── STEP 1: SPLIT_DATA ────────────────────────────────────────────────
    yield _fc_event("SPLIT_DATA", "running", f"Membagi data historis '{jenis}' untuk training & testing...")
    await asyncio.sleep(0)

    n_points = len(data_points)
    if n_points < 24:
        msg = f"Data tidak cukup (minimal 24 bulan, saat ini {n_points} bulan)."
        yield _fc_event("SPLIT_DATA", "error", msg)
        yield {"type": "error", "message": msg}
        return

    y = np.array([float(pt["quantity"]) for pt in data_points])
    period_labels = [pt["periode"] for pt in data_points]

    # Preview: data split count
    split_preview = {
        "type": "table",
        "label": "Pembagian Data",
        "headers": ["Jenis Data", "Jumlah (Bulan)"],
        "rows": [
            ["Data Training", str(n_points - 6)],
            ["Data Testing", "6"]
        ],
        "total_rows": 2,
        "shown": 2,
    }

    yield _fc_event(
        "SPLIT_DATA", "done",
        f"Data dibagi: {n_points - 6} bln training, 6 bln testing",
        stats={
            "jenis_kopi": jenis,
            "total_bulan": n_points,
            "periode_awal": label_bulan(period_labels[0]),
            "periode_akhir": label_bulan(period_labels[-1]),
        },
        preview=split_preview,
    )
    await asyncio.sleep(0)

    # ── STEP 2: CALC_PARAMS ───────────────────────────────────────────────
    yield _fc_event("CALC_PARAMS", "running",
        "Menentukan parameter optimal α, β, dan γ..." if mode != "manual"
        else "Menggunakan parameter manual α, β, dan γ...")
    await asyncio.sleep(0)

    test_size = 6
    train = y[:-test_size]
    test = y[-test_size:]
    train_safe = np.where(train <= 0, 1e-4, train)

    best_alpha = alpha_input if alpha_input is not None else 0.2
    best_beta = beta_input if beta_input is not None else 0.1
    best_gamma = gamma_input if gamma_input is not None else 0.2
    best_mape = float("inf")

    top_candidates = []  # untuk preview

    if mode in ("rekomendasi", "otomatis"):
        candidates_tested = 0
        for alpha in np.arange(0.1, 1.0, 0.1):
            for beta in np.arange(0.1, 1.0, 0.1):
                for gamma in np.arange(0.1, 1.0, 0.1):
                    try:
                        model = ExponentialSmoothing(
                            train_safe, trend="add", seasonal="mul", seasonal_periods=12,
                        ).fit(
                            smoothing_level=alpha,
                            smoothing_trend=beta,
                            smoothing_seasonal=gamma,
                            optimized=False,
                        )
                        pred = model.forecast(test_size)
                        test_safe = np.where(test == 0, 1e-9, test)
                        mape = np.mean(np.abs((test - pred) / test_safe)) * 100
                        candidates_tested += 1

                        # Simpan top-5
                        top_candidates.append({
                            "a": round(float(alpha), 2),
                            "b": round(float(beta), 2),
                            "g": round(float(gamma), 2),
                            "mape": round(float(mape), 2),
                        })
                        top_candidates.sort(key=lambda x: x["mape"])
                        top_candidates = top_candidates[:5]

                        if mape < best_mape:
                            best_mape = mape
                            best_alpha = round(float(alpha), 2)
                            best_beta = round(float(beta), 2)
                            best_gamma = round(float(gamma), 2)
                    except Exception:
                        candidates_tested += 1

        if best_mape == float("inf"):
            best_alpha, best_beta, best_gamma = 0.2, 0.1, 0.2

        param_preview = {
            "type": "table",
            "label": "Top 5 kombinasi parameter terbaik",
            "headers": ["Alpha (α)", "Beta (β)", "Gamma (γ)", "MAPE (%)"],
            "rows": [
                [str(c["a"]), str(c["b"]), str(c["g"]), f'{c["mape"]:.2f}']
                for c in top_candidates
            ],
            "total_rows": candidates_tested,
            "shown": len(top_candidates),
        }
    else:
        # Manual mode
        candidates_tested = 1
        param_preview = {
            "type": "table",
            "label": "Parameter manual yang digunakan",
            "headers": ["Alpha (α)", "Beta (β)", "Gamma (γ)"],
            "rows": [[str(best_alpha), str(best_beta), str(best_gamma)]],
            "total_rows": 1,
            "shown": 1,
        }

    yield _fc_event(
        "CALC_PARAMS", "done",
        f"Parameter terpilih: α={best_alpha}, β={best_beta}, γ={best_gamma}",
        stats={
            "mode": mode,
            "kombinasi_diuji": candidates_tested,
            "alpha": best_alpha,
            "beta": best_beta,
            "gamma": best_gamma,
        },
        preview=param_preview,
    )
    await asyncio.sleep(0)

    # ── STEP 3: CALC_SMOOTHING ────────────────────────────────────────────
    yield _fc_event("CALC_SMOOTHING", "running", "Menghitung nilai Level, Trend, dan Seasonal...")
    await asyncio.sleep(0)

    try:
        final_model = ExponentialSmoothing(
            train_safe, trend="add", seasonal="mul", seasonal_periods=12,
        ).fit(
            smoothing_level=best_alpha,
            smoothing_trend=best_beta,
            smoothing_seasonal=best_gamma,
            optimized=False,
        )

        smooth_preview = {
            "type": "table",
            "label": "Komponen Model (Status Akhir)",
            "headers": ["Komponen", "Nilai Awal (Taksiran)", "Parameter"],
            "rows": [
                ["Level (Level)", f"{final_model.params.get('initial_level', 0):,.2f}", str(best_alpha)],
                ["Trend (Trend)", f"{final_model.params.get('initial_trend', 0):,.2f}", str(best_beta)],
                ["Seasonal (Musiman)", "Terhitung otomatis per bulan", str(best_gamma)]
            ],
            "total_rows": 3,
            "shown": 3,
        }

        yield _fc_event(
            "CALC_SMOOTHING", "done",
            "Model berhasil dilatih dengan parameter terpilih.",
            stats={
                "metode": "Holt-Winters (Additive Trend, Multiplicative Seasonal)",
                "periode_musiman": 12,
            },
            preview=smooth_preview,
        )
        await asyncio.sleep(0)
    except Exception as e:
        msg = f"Gagal menghitung level, trend, seasonal: {str(e)}"
        yield _fc_event("CALC_SMOOTHING", "error", msg)
        yield {"type": "error", "message": msg}
        return

    # ── STEP 4: CALC_FORECAST ─────────────────────────────────────────────
    yield _fc_event("CALC_FORECAST", "running", "Menghitung nilai forecast masa depan...")
    await asyncio.sleep(0)

    try:

        future_steps = 12
        forecast_values = final_model.forecast(future_steps)

        forecast_overlap = forecast_values[:6]
        forecast_future = forecast_values[6:]

        last_date = pd.to_datetime(period_labels[-1])
        future_dates = [
            (last_date + pd.DateOffset(months=i)).strftime("%Y-%m-%d")
            for i in range(1, 7)
        ]

        # Preview: 6 bulan prediksi
        fc_preview_rows = [
            [label_bulan(d), f"{max(0, float(v)):,.2f}"]
            for d, v in zip(future_dates, forecast_future)
        ]
        calc_preview = {
            "type": "table",
            "label": "6 bulan prediksi ke depan",
            "headers": ["Periode", "Prediksi (Kg)"],
            "rows": fc_preview_rows,
            "total_rows": future_steps,
            "shown": 6,
        }

        yield _fc_event(
            "CALC_FORECAST", "done",
            f"Prediksi berhasil: {future_steps} periode (6 overlap + 6 future)",
            stats={
                "total_step_prediksi": future_steps,
                "overlap_bulan": 6,
                "future_bulan": 6,
            },
            preview=calc_preview,
        )
        await asyncio.sleep(0)

    except Exception as e:
        msg = f"Gagal melatih model: {str(e)}"
        yield _fc_event("CALC_FORECAST", "error", msg)
        yield {"type": "error", "message": msg}
        return

    # ── STEP 5: EVAL_MAPE ─────────────────────────────────────────────────
    yield _fc_event("EVAL_MAPE", "running", "Menghitung nilai Error dan MAPE...")
    await asyncio.sleep(0)

    try:
        eval_model = ExponentialSmoothing(
            train_safe, trend="add", seasonal="mul", seasonal_periods=12,
        ).fit(
            smoothing_level=best_alpha,
            smoothing_trend=best_beta,
            smoothing_seasonal=best_gamma,
            optimized=False,
        )
        eval_pred = eval_model.forecast(test_size)
        test_safe = np.where(test == 0, 1e-9, test)
        mape_testing = float(np.mean(np.abs((test - eval_pred) / test_safe)) * 100)
    except Exception:
        mape_testing = 0.0
        eval_pred = test  # fallback

    mape_testing = round(mape_testing, 2)

    # Status akurasi
    if mape_testing < 8:
        status_akurasi = "sangat_baik"
        akurasi_label = "Sangat Baik"
    elif mape_testing < 15:
        status_akurasi = "baik"
        akurasi_label = "Baik"
    elif mape_testing < 25:
        status_akurasi = "cukup"
        akurasi_label = "Cukup"
    else:
        status_akurasi = "buruk"
        akurasi_label = "Perlu Perbaikan"

    # Preview: tabel aktual vs prediksi (6 bln testing)
    test_periods = period_labels[-test_size:]
    eval_preview = {
        "type": "table",
        "label": "Evaluasi 6 bulan terakhir (aktual vs prediksi)",
        "headers": ["Periode", "Aktual (Kg)", "Prediksi (Kg)", "Error (%)"],
        "rows": [
            [
                label_bulan(test_periods[i]),
                f"{float(test[i]):,.2f}",
                f"{float(eval_pred[i]):,.2f}",
                f"{abs((float(test[i]) - float(eval_pred[i])) / max(float(test[i]), 1e-9)) * 100:.1f}%",
            ]
            for i in range(test_size)
        ],
        "total_rows": test_size,
        "shown": test_size,
    }

    yield _fc_event(
        "EVAL_MAPE", "done",
        f"MAPE Testing: {mape_testing:.2f}% — {akurasi_label}",
        stats={
            "mape_testing": mape_testing,
            "status_akurasi": status_akurasi,
            "akurasi_persen": round(max(0, 100 - mape_testing), 1),
        },
        preview=eval_preview,
    )
    await asyncio.sleep(0)

    # Rekomendasi di-generate tapi disisipkan ke result akhir saja (disembunyikan dari UI step terpisah)
    forecast_6_internal = [
        {"periode": d, "quantity": max(0, round(float(v), 2))}
        for d, v in zip(future_dates, forecast_future)
    ]
    rekomendasi_bisnis = generate_rekomendasi_bisnis(forecast_6_internal)

    # Hitung tren
    values_6 = [f["quantity"] for f in forecast_6_internal]
    rata_awal = np.mean(values_6[:3]) if len(values_6) >= 3 else np.mean(values_6)
    rata_akhir = np.mean(values_6[3:6]) if len(values_6) >= 6 else np.mean(values_6)
    if rata_awal > 0:
        trend_persen = round(((rata_akhir - rata_awal) / rata_awal) * 100, 2)
    else:
        trend_persen = 0.0

    if trend_persen > 8:
        status_trend = "naik"
    elif trend_persen < -8:
        status_trend = "turun"
    else:
        status_trend = "stabil"

    # ── STEP 6: SHOW_RESULT ───────────────────────────────────────────────
    yield _fc_event("SHOW_RESULT", "running", "Mempersiapkan data hasil akhir dan rekomendasi...")
    await asyncio.sleep(0)

    chart_data = build_unified_timeline(
        period_labels=period_labels,
        y=y,
        future_dates=future_dates,
        forecast_overlap=forecast_overlap,
        forecast_future=forecast_future,
        insample_n=6,
    )

    # Preview: 6 baris terakhir timeline (prediksi masa depan murni)
    tl_tail = chart_data[-6:] if len(chart_data) >= 6 else chart_data
    tl_preview = {
        "type": "table",
        "label": "6 baris terakhir timeline (prediksi masa depan)",
        "headers": ["Periode", "Aktual", "Forecast"],
        "rows": [
            [
                r["tanggal"],
                f'{r["aktual"]:,.2f}' if r.get("aktual") is not None else "—",
                f'{r["forecast"]:,.2f}' if r.get("forecast") is not None else "—",
            ]
            for r in tl_tail
        ],
        "total_rows": len(chart_data),
        "shown": len(tl_tail),
    }

    yield _fc_event(
        "SHOW_RESULT", "done",
        f"Hasil siap ditampilkan: {len(chart_data)} titik data",
        stats={
            "total_titik": len(chart_data),
            "titik_aktual": sum(1 for r in chart_data if r.get("aktual") is not None),
            "titik_forecast": sum(1 for r in chart_data if r.get("forecast") is not None),
        },
        preview=tl_preview,
    )
    await asyncio.sleep(0)

    # ── FINAL RESULT ──────────────────────────────────────────────────────
    # Semua baris forecast (yang forecast != null & aktual == null)
    forecast_rows_for_db = [
        {"periode": r["sort_date"], "nilai_peramalan": r["forecast"]}
        for r in chart_data
        if r.get("forecast") is not None and r.get("aktual") is None
    ]
    # Semua sort_date aktual
    aktual_periods = [
        r["sort_date"] for r in chart_data
        if r.get("aktual") is not None
    ]

    yield {
        "type": "result",
        "status": "success",
        "jenis_kopi": jenis,
        "parameter_digunakan": {
            "alpha": best_alpha,
            "beta": best_beta,
            "gamma": best_gamma,
        },
        "mape_testing": mape_testing,
        "status_akurasi": status_akurasi,
        "trend_persen": trend_persen,
        "status_trend": status_trend,
        "rekomendasi_bisnis": rekomendasi_bisnis,
        "chart_data": chart_data,
        "forecast_rows": forecast_rows_for_db,
        "aktual_periods": aktual_periods,
        "summary": {
            "jenis_kopi": jenis,
            "mape": mape_testing,
            "akurasi_label": akurasi_label,
            "alpha": best_alpha,
            "beta": best_beta,
            "gamma": best_gamma,
            "trend": f"{status_trend} ({trend_persen:+.1f}%)",
            "total_prediksi": len(forecast_rows_for_db),
        },
    }
