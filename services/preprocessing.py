import asyncio
import pandas as pd
import re
import io
from datetime import datetime, timezone
from fastapi import HTTPException

# ---------------------------------------------------------------------------
#  Helper: Mapping nama produk ke kategori standar
# ---------------------------------------------------------------------------
def map_nama_produk(nama: str) -> str | None:
    """
    Mapping teks nama produk ke salah satu kategori:
    'robusta', 'arabica', atau 'asalan'.
    Return None jika tidak cocok.
    """
    nama = nama.strip().lower()
    if "robusta" in nama:
        return "robusta"
    if "arabica" in nama:
        return "arabica"
    if "asalan" in nama or "low grade" in nama:
        return "asalan"
    return None

# ---------------------------------------------------------------------------
#  Helper: Deteksi delimiter CSV
# ---------------------------------------------------------------------------
def detect_delimiter(content: str) -> str:
    """Deteksi delimiter CSV: semicolon atau comma."""
    first_line = content.split("\n")[0] if "\n" in content else content
    if first_line.count(";") > first_line.count(","):
        return ";"
    return ","

# ---------------------------------------------------------------------------
#  Helper: Normalisasi nama kolom
# ---------------------------------------------------------------------------
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalisasi nama kolom: strip, lowercase, hapus BOM."""
    df.columns = [
        re.sub(r"^\ufeff", "", col).strip().lower()
        for col in df.columns
    ]
    return df

# ---------------------------------------------------------------------------
#  Helper: Cari kolom berdasarkan kemungkinan nama
# ---------------------------------------------------------------------------
def find_column(columns: list[str], candidates: list[str]) -> str | None:
    """Cari nama kolom dari list candidates."""
    for col in columns:
        for candidate in candidates:
            if col == candidate or candidate in col:
                return col
    return None

def process_csv_data(raw_bytes: bytes, filename: str) -> dict:
    if not filename:
        raise HTTPException(status_code=400, detail="Nama file tidak ditemukan.")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("csv", "txt"):
        raise HTTPException(
            status_code=400,
            detail=f"Hanya file CSV yang didukung. File Anda: .{ext}",
        )

    # ── Baca file ──────────────────────────────────────────────────────
    try:
        # Coba decode dengan beberapa encoding
        for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
            try:
                content = raw_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Encoding file tidak dapat dikenali.")

        delimiter = detect_delimiter(content)
        df = pd.read_csv(io.StringIO(content), sep=delimiter, dtype=str)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="File CSV kosong.")

    # ── Normalisasi kolom ──────────────────────────────────────────────
    df = normalize_columns(df)

    # Cari kolom yang sesuai
    col_tanggal = find_column(
        df.columns.tolist(),
        ["tanggal", "tgl", "date", "periode", "bulan", "month", "period"],
    )
    col_produk = find_column(
        df.columns.tolist(),
        ["nama produk", "nama_produk", "produk", "product", "jenis", "jenis_kopi",
         "barang", "item", "kopi", "material", "raw_material", "variant", "kategori"],
    )
    col_quantity = find_column(
        df.columns.tolist(),
        ["quantity", "qty", "kuantitas", "jumlah", "berat", "kg", "total", "volume", "jml"],
    )

    if not col_tanggal:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom tanggal tidak ditemukan. Kolom yang ada: {list(df.columns)}. "
                   f"Pastikan ada kolom dengan nama: tanggal, tgl, date, periode, bulan, dst.",
        )
    if not col_produk:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom nama produk tidak ditemukan. Kolom yang ada: {list(df.columns)}. "
                   f"Pastikan ada kolom dengan nama: nama produk, produk, jenis, dst.",
        )
    if not col_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom quantity tidak ditemukan. Kolom yang ada: {list(df.columns)}. "
                   f"Pastikan ada kolom dengan nama: quantity, qty, jumlah, berat, dst.",
        )

    # ── Cleaning ───────────────────────────────────────────────────────
    # Rename ke nama standar
    df = df.rename(columns={
        col_tanggal: "tanggal_raw",
        col_produk: "nama_produk_raw",
        col_quantity: "quantity_raw",
    })

    # Parse tanggal (gunakan format='mixed' untuk menghindari dateutil warning)
    df["tanggal_parsed"] = pd.to_datetime(df["tanggal_raw"], format='mixed', errors="coerce")

    # Hapus baris dengan tanggal tidak valid
    invalid_dates = df["tanggal_parsed"].isna().sum()
    df = df.dropna(subset=["tanggal_parsed"])

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Tidak ada baris dengan tanggal yang valid setelah parsing.",
        )

    # Parse quantity (handle comma as decimal separator)
    df["quantity"] = (
        df["quantity_raw"]
        .str.replace(r"\s+", "", regex=True)
        .str.replace(",", ".")
        .pipe(pd.to_numeric, errors="coerce")
    )
    invalid_qty = df["quantity"].isna().sum()
    df = df.dropna(subset=["quantity"])
    df = df[df["quantity"] > 0]

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Tidak ada baris dengan quantity yang valid setelah parsing.",
        )

    # ── Mapping nama produk ────────────────────────────────────────────
    df["nama_produk"] = df["nama_produk_raw"].str.strip().str.lower().apply(map_nama_produk)

    # Hapus baris yang tidak bisa di-mapping
    unmapped = df["nama_produk"].isna().sum()
    df = df.dropna(subset=["nama_produk"])

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Tidak ada baris yang cocok dengan kategori kopi (robusta/arabica/asalan). "
                   "Pastikan kolom nama produk mengandung kata 'robusta', 'arabica', 'asalan', atau 'low grade'.",
        )

    # ── Agregasi bulanan ───────────────────────────────────────────────
    df["periode"] = df["tanggal_parsed"].dt.to_period("M")

    aggregated = (
        df.groupby(["periode", "nama_produk"], as_index=False)["quantity"]
        .sum()
    )

    # Format periode ke YYYY-MM-DD (hari pertama bulan tersebut)
    aggregated["periode_str"] = aggregated["periode"].apply(
        lambda p: p.start_time.strftime("%Y-%m-01")
    )
    # Tetap sediakan format "Jan-2023" untuk tabel display
    aggregated["tanggal"] = aggregated["periode"].apply(
        lambda p: p.start_time.strftime("%b-%Y")
    )

    # ── Pivot ──────────────────────────────────────────────────────────
    pivot = aggregated.pivot_table(
        index=["periode", "periode_str", "tanggal"],
        columns="nama_produk",
        values="quantity",
        aggfunc="sum",
    ).reset_index()

    # Pastikan semua kolom kopi ada
    for kopi in ["arabica", "robusta", "asalan"]:
        if kopi not in pivot.columns:
            pivot[kopi] = 0.0

    # Isi NaN dengan 0
    pivot = pivot.fillna(0)

    # Sort berdasarkan periode
    pivot = pivot.sort_values("periode").reset_index(drop=True)

    # Tambah kolom total
    pivot["total"] = pivot["arabica"] + pivot["robusta"] + pivot["asalan"]

    # Hapus kolom periode (Period object) yang tidak JSON-serializable
    pivot = pivot.drop(columns=["periode"])

    # Round semua angka
    for col in ["arabica", "robusta", "asalan", "total"]:
        pivot[col] = pivot[col].round(2)

    # Kembalikan data bersih hasil pivot saja.
    data_bersih = pivot.to_dict(orient="records")

    return {
        "data_bersih": data_bersih,
    }


# ---------------------------------------------------------------------------
#  Stream Generator: Preprocessing Pipeline (SSE)
#  Setiap tahap menghasilkan (yield) dict event untuk dikirim via SSE.
# ---------------------------------------------------------------------------
def _make_event(
    step: str,
    status: str,
    message: str,
    stats: dict | None = None,
    preview: dict | None = None,
) -> dict:
    """Buat event dict untuk SSE stream.

    Args:
        preview: opsional, cuplikan data ringan untuk accordion View Detail.
                 Struktur: {"type": "table"|"mapping", "headers": [...], "rows": [[...]], ...}
    """
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


def _df_preview(df: pd.DataFrame, cols: list[str], n: int = 5) -> dict:
    """Buat preview tabel ringan dari DataFrame: max n baris, kolom terbatas."""
    subset = df[cols].head(n).copy()
    # Pastikan semua value JSON-serializable
    for c in subset.columns:
        subset[c] = subset[c].astype(str)
    return {
        "type": "table",
        "headers": list(subset.columns),
        "rows": subset.values.tolist(),
        "total_rows": len(df),
        "shown": min(n, len(df)),
    }


async def process_csv_stream(raw_bytes: bytes, filename: str):
    """
    Async generator untuk preprocessing CSV secara bertahap.
    Yield dict event per tahap (untuk SSE), diakhiri event type='result'.
    """
    # ── STEP 1: DETECT_COLS (Membaca Data Mentah & Deteksi Kolom) ─────────────
    yield _make_event("DETECT_COLS", "running", f"Memuat file '{filename}' dan membaca struktur kolom...")
    await asyncio.sleep(0)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("csv", "txt"):
        msg = f"Hanya file CSV yang didukung. File Anda: .{ext}"
        yield _make_event("DETECT_COLS", "error", msg)
        yield {"type": "error", "message": msg}
        return

    content = None
    detected_encoding = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            content = raw_bytes.decode(encoding)
            detected_encoding = encoding
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        msg = "Encoding file tidak dapat dikenali."
        yield _make_event("DETECT_COLS", "error", msg)
        yield {"type": "error", "message": msg}
        return

    delimiter = detect_delimiter(content)
    file_size_kb = round(len(raw_bytes) / 1024, 1)

    try:
        df = pd.read_csv(io.StringIO(content), sep=delimiter, dtype=str)
    except Exception as e:
        msg = f"Gagal membaca file CSV: {str(e)}"
        yield _make_event("DETECT_COLS", "error", msg)
        yield {"type": "error", "message": msg}
        return

    if df.empty:
        msg = "File CSV kosong."
        yield _make_event("DETECT_COLS", "error", msg)
        yield {"type": "error", "message": msg}
        return

    total_raw_rows = len(df)
    df = normalize_columns(df)

    col_tanggal  = find_column(df.columns.tolist(),
        ["tanggal", "tgl", "date", "periode", "bulan", "month", "period"])
    col_produk   = find_column(df.columns.tolist(),
        ["nama produk", "nama_produk", "produk", "product", "jenis",
         "jenis_kopi", "barang", "item", "kopi", "material",
         "raw_material", "variant", "kategori"])
    col_quantity = find_column(df.columns.tolist(),
        ["quantity", "qty", "kuantitas", "jumlah", "berat", "kg",
         "total", "volume", "jml"])

    missing = []
    if not col_tanggal:  missing.append("tanggal/date/periode")
    if not col_produk:   missing.append("nama_produk/produk/jenis")
    if not col_quantity: missing.append("quantity/qty/jumlah")

    if missing:
        msg = (f"Kolom wajib tidak ditemukan: {', '.join(missing)}. "
               f"Kolom yang ada: {list(df.columns)}")
        yield _make_event("DETECT_COLS", "error", msg)
        yield {"type": "error", "message": msg}
        return

    # Preview: 5 baris pertama DataFrame + highlight kolom terdeteksi
    detect_preview = _df_preview(
        df, [col_tanggal, col_produk, col_quantity], n=5
    )
    detect_preview["label"] = "5 baris pertama — kolom yang terdeteksi"
    detect_preview["highlight_cols"] = [col_tanggal, col_produk, col_quantity]

    yield _make_event(
        "DETECT_COLS", "done",
        f"File ({file_size_kb} KB) dimuat & struktur terdeteksi dari {total_raw_rows} baris",
        stats={
            "ukuran_kb": file_size_kb,
            "encoding": detected_encoding,
            "delimiter": "semicolon (;)" if delimiter == ";" else "comma (,)",
            "total_kolom": len(df.columns),
            "total_baris": total_raw_rows,
            "kolom_tanggal": col_tanggal,
            "kolom_produk": col_produk,
            "kolom_quantity": col_quantity,
        },
        preview=detect_preview,
    )
    await asyncio.sleep(0)

    df = df.rename(columns={
        col_tanggal:  "tanggal_raw",
        col_produk:   "nama_produk_raw",
        col_quantity: "quantity_raw",
    })

    # ── STEP 3: CLEAN_DATE ────────────────────────────────────────────────────
    yield _make_event("CLEAN_DATE", "running", "Mem-parsing & memvalidasi kolom tanggal...")
    await asyncio.sleep(0)

    df["tanggal_parsed"] = pd.to_datetime(df["tanggal_raw"], format="mixed", errors="coerce")
    invalid_dates = int(df["tanggal_parsed"].isna().sum())
    df = df.dropna(subset=["tanggal_parsed"])

    if df.empty:
        msg = "Tidak ada baris dengan tanggal yang valid setelah parsing."
        yield _make_event("CLEAN_DATE", "error", msg)
        yield {"type": "error", "message": msg}
        return

    date_min = df["tanggal_parsed"].min().strftime("%Y-%m")
    date_max = df["tanggal_parsed"].max().strftime("%Y-%m")

    # Preview: sebelum → sesudah parsing tanggal (5 baris)
    date_sample = df[["tanggal_raw", "tanggal_parsed"]].head(5).copy()
    date_sample["tanggal_parsed"] = date_sample["tanggal_parsed"].dt.strftime("%Y-%m-%d")
    date_preview = {
        "type": "table",
        "label": "Contoh parsing tanggal (raw → parsed)",
        "headers": ["Tanggal Mentah", "Hasil Parsing"],
        "rows": date_sample.values.tolist(),
        "total_rows": len(df),
        "shown": min(5, len(df)),
    }

    yield _make_event(
        "CLEAN_DATE", "done",
        f"Tanggal valid: {len(df)} baris ({invalid_dates} baris dihapus)",
        stats={
            "baris_valid": len(df),
            "baris_dihapus": invalid_dates,
            "rentang_data": f"{date_min} s/d {date_max}",
        },
        preview=date_preview,
    )
    await asyncio.sleep(0)

    # ── STEP 4: CLEAN_QTY ─────────────────────────────────────────────────────
    yield _make_event("CLEAN_QTY", "running", "Mem-parsing & memvalidasi kolom quantity...")
    await asyncio.sleep(0)

    df["quantity"] = (
        df["quantity_raw"]
        .str.replace(r"\s+", "", regex=True)
        .str.replace(",", ".")
        .pipe(pd.to_numeric, errors="coerce")
    )
    invalid_qty   = int(df["quantity"].isna().sum())
    df = df.dropna(subset=["quantity"])
    non_positive  = int((df["quantity"] <= 0).sum())
    df = df[df["quantity"] > 0]

    if df.empty:
        msg = "Tidak ada baris dengan quantity yang valid setelah parsing."
        yield _make_event("CLEAN_QTY", "error", msg)
        yield {"type": "error", "message": msg}
        return

    total_qty = round(float(df["quantity"].sum()), 2)

    # Preview: sebelum → sesudah parsing quantity (5 baris)
    qty_sample = df[["quantity_raw", "quantity"]].head(5).copy()
    qty_sample["quantity"] = qty_sample["quantity"].apply(lambda v: f"{v:,.2f}")
    qty_preview = {
        "type": "table",
        "label": "Contoh parsing quantity (raw → bersih)",
        "headers": ["Quantity Mentah", "Hasil Parsing (Kg)"],
        "rows": qty_sample.astype(str).values.tolist(),
        "total_rows": len(df),
        "shown": min(5, len(df)),
    }

    yield _make_event(
        "CLEAN_QTY", "done",
        f"Quantity valid: {len(df)} baris ({invalid_qty + non_positive} baris dihapus)",
        stats={
            "baris_valid": len(df),
            "tidak_parseable": invalid_qty,
            "tidak_positif": non_positive,
            "total_quantity_kg": total_qty,
        },
        preview=qty_preview,
    )
    await asyncio.sleep(0)

    # ── STEP 5: MAP_PRODUCT ───────────────────────────────────────────────────
    yield _make_event("MAP_PRODUCT", "running", "Memetakan nama produk ke kategori kopi...")
    await asyncio.sleep(0)

    df["nama_produk"] = df["nama_produk_raw"].str.strip().str.lower().apply(map_nama_produk)
    unmapped          = int(df["nama_produk"].isna().sum())
    unique_originals  = df["nama_produk_raw"].nunique()
    df = df.dropna(subset=["nama_produk"])

    if df.empty:
        msg = ("Tidak ada baris yang cocok dengan kategori kopi (robusta/arabica/asalan). "
               "Pastikan kolom nama produk mengandung kata kunci yang sesuai.")
        yield _make_event("MAP_PRODUCT", "error", msg)
        yield {"type": "error", "message": msg}
        return

    category_counts = df["nama_produk"].value_counts().to_dict()

    # Preview: tabel pemetaan nama produk asli → kategori
    mapping_sample = (
        df[["nama_produk_raw", "nama_produk"]]
        .drop_duplicates()
        .sort_values("nama_produk")
        .head(10)  # max 10 unique mappings
    )
    map_preview = {
        "type": "mapping",
        "label": "Pemetaan nama produk → kategori",
        "headers": ["Nama Asli (CSV)", "Kategori Standar"],
        "rows": mapping_sample.astype(str).values.tolist(),
        "total_unique": unique_originals,
        "shown": len(mapping_sample),
    }

    yield _make_event(
        "MAP_PRODUCT", "done",
        f"Pemetaan selesai: {len(df)} baris valid ({unmapped} tidak terpetakan)",
        stats={
            "varian_produk_asli": unique_originals,
            "tidak_terpetakan": unmapped,
            "distribusi": category_counts,
        },
        preview=map_preview,
    )
    await asyncio.sleep(0)

    # ── STEP 6: AGGREGATE ─────────────────────────────────────────────────────
    yield _make_event("AGGREGATE", "running", "Melakukan agregasi data per bulan...")
    await asyncio.sleep(0)

    df["periode"] = df["tanggal_parsed"].dt.to_period("M")
    aggregated = (
        df.groupby(["periode", "nama_produk"], as_index=False)["quantity"].sum()
    )
    n_months       = aggregated["periode"].nunique()
    n_transactions = len(df)

    aggregated["periode_str"] = aggregated["periode"].apply(
        lambda p: p.start_time.strftime("%Y-%m-01")
    )
    aggregated["tanggal"] = aggregated["periode"].apply(
        lambda p: p.start_time.strftime("%b-%Y")
    )

    # Preview: 5 baris hasil agregasi
    agg_sample = aggregated[["tanggal", "nama_produk", "quantity"]].head(5).copy()
    agg_sample["quantity"] = agg_sample["quantity"].apply(lambda v: f"{v:,.2f}")
    agg_preview = {
        "type": "table",
        "label": "5 baris pertama hasil agregasi bulanan",
        "headers": ["Periode", "Jenis Kopi", "Quantity (Kg)"],
        "rows": agg_sample.astype(str).values.tolist(),
        "total_rows": len(aggregated),
        "shown": min(5, len(aggregated)),
    }

    yield _make_event(
        "AGGREGATE", "done",
        f"Agregasi selesai: {n_transactions} transaksi → {n_months} periode bulanan",
        stats={
            "total_transaksi": n_transactions,
            "total_periode_bulanan": n_months,
            "rata_transaksi_per_bulan": round(n_transactions / n_months, 1) if n_months else 0,
        },
        preview=agg_preview,
    )
    await asyncio.sleep(0)

    # ── STEP 7: PIVOT ─────────────────────────────────────────────────────────
    yield _make_event("PIVOT", "running", "Membuat pivot tabel & finalisasi data...")
    await asyncio.sleep(0)

    pivot = aggregated.pivot_table(
        index=["periode", "periode_str", "tanggal"],
        columns="nama_produk",
        values="quantity",
        aggfunc="sum",
    ).reset_index()

    for kopi in ["arabica", "robusta", "asalan"]:
        if kopi not in pivot.columns:
            pivot[kopi] = 0.0

    pivot = pivot.fillna(0)
    pivot = pivot.sort_values("periode").reset_index(drop=True)
    pivot["total"] = pivot["arabica"] + pivot["robusta"] + pivot["asalan"]
    pivot = pivot.drop(columns=["periode"])

    for col in ["arabica", "robusta", "asalan", "total"]:
        pivot[col] = pivot[col].round(2)

    data_bersih    = pivot.to_dict(orient="records")
    total_arabica  = round(float(pivot["arabica"].sum()), 2)
    total_robusta  = round(float(pivot["robusta"].sum()), 2)
    total_asalan   = round(float(pivot["asalan"].sum()), 2)

    # Preview: 5 baris pertama pivot final
    pivot_sample = pivot[["tanggal", "arabica", "robusta", "asalan", "total"]].head(5).copy()
    for c in ["arabica", "robusta", "asalan", "total"]:
        pivot_sample[c] = pivot_sample[c].apply(lambda v: f"{v:,.2f}")
    pivot_preview = {
        "type": "table",
        "label": "5 baris pertama tabel pivot final",
        "headers": ["Periode", "Arabica (Kg)", "Robusta (Kg)", "Asalan (Kg)", "Total (Kg)"],
        "rows": pivot_sample.astype(str).values.tolist(),
        "total_rows": len(pivot),
        "shown": min(5, len(pivot)),
    }

    yield _make_event(
        "PIVOT", "done",
        f"Data bersih siap: {len(data_bersih)} baris pivot",
        stats={
            "baris_pivot": len(data_bersih),
            "total_arabica_kg": total_arabica,
            "total_robusta_kg": total_robusta,
            "total_asalan_kg": total_asalan,
        },
        preview=pivot_preview,
    )
    await asyncio.sleep(0)

    # ── FINAL RESULT ──────────────────────────────────────────────────────────
    yield {
        "type": "result",
        "data_bersih": data_bersih,
        "summary": {
            "total_periode": len(data_bersih),
            "total_arabica_kg": total_arabica,
            "total_robusta_kg": total_robusta,
            "total_asalan_kg": total_asalan,
        },
    }
