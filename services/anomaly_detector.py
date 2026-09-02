"""
anomaly_detector.py — Agrorra Koerintji
=========================================
Modul deteksi anomali time-series per jenis kopi.
Pemindaian dilakukan SECARA VERTIKAL (per kolom), bukan per baris.

3 Aturan Deteksi Anomali:
  A) Lonjakan/penurunan ekstrem vs rata-rata 3 baris sebelumnya
     (> +120% atau < -70%) — abaikan 3 baris pertama.
  B) Nilai baris saat ini sama persis dengan 2 baris sebelumnya
     (indikasi copy-paste / flatlining 3 bulan beruntun).
  C) Nilai baris saat ini adalah 0 (zero demand).

ARSITEKTUR v3 — PURE REARVIEW MIRROR (Zero Future Leakage)
===========================================================
  PRINSIP UTAMA: Sistem ini beroperasi seperti "Kaca Spion".
  Pada saat memproses baris ke-i, sistem HANYA diperbolehkan
  melihat data dari indeks 0 hingga i-1. Indeks i+1 atau
  setelahnya TIDAK BOLEH disentuh sama sekali.

  Alur kerja per kolom:
  1. Buat `cleaned_series` = salinan bersih dari kolom asli.
  2. Loop baris dari i=0 hingga akhir:
     a. Evaluasi nilai aktual [i] menggunakan 3 Aturan di atas.
        Perhitungan rata-rata window menggunakan cleaned_series[i-3:i].
     b. Jika ANOMALI → rek_val = past_3_mean dari cleaned_series.
        Fallback bertingkat jika window < 3 bulan (lihat keterangan).
     c. SEGERA timpa cleaned_series[i] = rek_val.
        Dengan ini, semua iterasi berikutnya menggunakan nilai bersih,
        sehingga efek domino (cascading anomalies) tidak terjadi.
  3. Baris NORMAL → cleaned_series[i] dibiarkan apa adanya (nilai asli).
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any


# ---------------------------------------------------------------------------
#  Konstanta Aturan A
# ---------------------------------------------------------------------------
_THRESHOLD_UPPER = 2.20   # > +120% dari rata-rata → 1 + 120% = 2.20×
_THRESHOLD_LOWER = 0.30   # < -70%  dari rata-rata → 1 - 70%  = 0.30×
_WINDOW_SIZE     = 3      # Jumlah baris sebelumnya untuk referensi Aturan A
_MIN_ABS_DELTA   = 1000.0 # Gembok Absolut: selisih aktual vs past_mean HARUS
                          # melampaui 1.000 Kg agar bisa divonis anomali.
                          # Mencegah "Small Base Problem" pada komoditas
                          # bervolume kecil (misal: Asalan 200→500 Kg = +150%
                          # tapi selisih hanya 300 Kg → bukan anomali).


# ---------------------------------------------------------------------------
#  Helper: hitung rekomendasi MURNI dari data historis (TANPA future leakage)
# ---------------------------------------------------------------------------
def _rearview_recommendation(cleaned_series: pd.Series, idx: int) -> float:
    """
    Hitung nilai rekomendasi untuk anomali di posisi `idx` menggunakan
    HANYA data historis dari cleaned_series[0 : idx].

    *** DILARANG KERAS mengakses cleaned_series[idx+1] atau lebih. ***

    Strategi fallback bertingkat (dari yang paling ideal ke paling dasar):
      1. Rata-rata window 3 bulan bersih: cleaned_series[idx-3 : idx]
         (Hanya baris dengan nilai > 0 yang ikut dihitung.)
      2. Jika window < 3 atau semua nol → ambil 1 baris sebelumnya: cleaned_series[idx-1]
      3. Jika idx == 0 (baris pertama, tidak ada histori sama sekali) →
         gunakan rata-rata SELURUH kolom cleaned_series (kecuali baris ini sendiri).
      4. Jika seluruh kolom nol → kembalikan 0.0.
    """
    # ── Coba window 3 bulan ke belakang ────────────────────────────────────
    if idx >= 1:
        window_start = max(0, idx - _WINDOW_SIZE)
        window = cleaned_series.iloc[window_start: idx]
        valid_window = window[window > 0]
        if len(valid_window) > 0:
            return round(float(valid_window.mean()), 2)

    # ── Fallback: 1 baris sebelumnya ───────────────────────────────────────
    if idx >= 1:
        prev_val = float(cleaned_series.iloc[idx - 1])
        if prev_val > 0:
            return round(prev_val, 2)

    # ── Fallback terakhir: rata-rata seluruh kolom (kecuali baris ini) ─────
    rest = cleaned_series.iloc[[j for j in range(len(cleaned_series)) if j != idx]]
    valid_rest = rest[rest > 0]
    if len(valid_rest) > 0:
        return round(float(valid_rest.mean()), 2)

    return 0.0


# ---------------------------------------------------------------------------
#  Fungsi utama: detect_time_series_anomalies
# ---------------------------------------------------------------------------
def detect_time_series_anomalies(df_pivot: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Terima DataFrame hasil pivot (periode_str & tanggal sebagai kolom biasa),
    kembalikan list anomali.

    Pemindaian vertikal per kolom kopi (arabica, robusta, asalan).
    """
    anomalies: List[Dict[str, Any]] = []

    # Kolom label periode untuk output
    # Prioritas: 'periode_str' → 'tanggal' → index string
    if "periode_str" in df_pivot.columns:
        periode_col = "periode_str"
    elif "tanggal" in df_pivot.columns:
        periode_col = "tanggal"
    else:
        periode_col = None

    # ── Pindai secara VERTIKAL per kolom kopi ──────────────────────────────
    for actual_col in df_pivot.columns:
        col_lower = str(actual_col).lower()

        # Filter: hanya kolom yang mengandung kata kopi
        jenis_kopi: str | None = None
        if "arabica" in col_lower:
            jenis_kopi = "arabica"
        elif "robusta" in col_lower:
            jenis_kopi = "robusta"
        elif "asalan" in col_lower:
            jenis_kopi = "asalan"

        if jenis_kopi is None:
            continue  # Lewati kolom non-kopi (tanggal, total, dsb.)

        # Pastikan seri numerik, isi NaN dengan 0
        series = (
            pd.to_numeric(df_pivot[actual_col], errors="coerce")
            .fillna(0)
            .reset_index(drop=True)
        )
        n = len(series)

        # ── TAHAP 1: Penyiapan Kolom Data & Memori Bersih ───────────────────
        cleaned_series: pd.Series = series.copy()

        # ── LOOP VERTIKAL — baris demi baris, ke depan saja ────────────────
        for i in range(n):
            # Nilai aktual dari data mentah asli (belum dibersihkan)
            current_val = float(series.iloc[i])

            # Label periode untuk laporan
            if periode_col:
                periode_val = str(df_pivot[periode_col].iloc[i])
            else:
                periode_val = str(df_pivot.index[i])

            is_anomaly  = False
            keterangan  = ""
            rek_val     = None   # Hanya diisi jika is_anomaly = True

            # ── TAHAP 2: Kalkulasi Rata-rata Referensi (Window 3 Bulan) ──────────
            past_mean: float = 0.0
            if i >= _WINDOW_SIZE:
                window    = cleaned_series.iloc[i - _WINDOW_SIZE: i]
                past_mean = float(window.mean())

            # ── TAHAP 3: Penerapan Aturan Deteksi 1 (Zero Demand) ───────────
            if current_val == 0.0:
                is_anomaly = True
                keterangan = "Aturan C: Zero Demand (Data Kosong)"

            # ── TAHAP 4: Penerapan Aturan Deteksi 2 (Copy-Paste) ────────────
            elif i >= 2:
                val_prev1 = float(series.iloc[i - 1])
                val_prev2 = float(series.iloc[i - 2])
                if current_val == val_prev1 == val_prev2:
                    is_anomaly = True
                    keterangan = "Aturan B: Copy-Paste / Flatlining (3 bulan beruntun sama)"

            # ── TAHAP 5: Penerapan Aturan Deteksi 3 (Lonjakan/Penurunan) ────
            if not is_anomaly and i >= _WINDOW_SIZE and past_mean > 0:
                abs_delta = abs(current_val - past_mean)

                if (current_val > _THRESHOLD_UPPER * past_mean
                        and abs_delta > _MIN_ABS_DELTA):
                    is_anomaly = True
                    keterangan = (
                        f"Aturan A: Lonjakan Ekstrem "
                        f"(> +120% & selisih {abs_delta:,.0f} Kg > 1.000 Kg "
                        f"dari rata-rata {_WINDOW_SIZE} bulan sebelumnya)"
                    )
                elif (current_val < _THRESHOLD_LOWER * past_mean
                        and abs_delta > _MIN_ABS_DELTA):
                    is_anomaly = True
                    keterangan = (
                        f"Aturan A: Penurunan Ekstrem "
                        f"(< -70% & selisih {abs_delta:,.0f} Kg > 1.000 Kg "
                        f"dari rata-rata {_WINDOW_SIZE} bulan sebelumnya)"
                    )

            # ── TAHAP 6: Koreksi Anomali & Penyimpanan Rekomendasi ─────────
            if is_anomaly:
                rek_val = _rearview_recommendation(cleaned_series, i)
                cleaned_series.iloc[i] = rek_val

                anomalies.append({
                    "periode":      periode_val,
                    "jenis_kopi":   jenis_kopi,
                    "nilai_aktual": round(current_val, 2),
                    "rekomendasi":  rek_val,
                    "keterangan":   keterangan,
                })

            # Jika baris NORMAL → cleaned_series[i] tidak diubah (tetap nilai asli).
            # Nilai asli yang valid inilah yang menjadi referensi akurat masa depan.

    return anomalies
