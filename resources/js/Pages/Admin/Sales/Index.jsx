import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import ThemeToggle from '@/Components/ThemeToggle';
import { useEffect, useMemo, useRef, useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SalesTable from './SalesTable';
import AnomalyPreview from './AnomalyPreview';
import PreprocessingTerminal from './PreprocessingTerminal';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function maxPeriodeIso(rows) {
    let best = null, bestT = -Infinity;
    for (const r of rows) {
        const p = r?.periode ?? r?.period;
        if (!p) continue;
        const t = new Date(p).getTime();
        if (!Number.isNaN(t) && t > bestT) { bestT = t; best = p; }
    }
    return best;
}

function defaultPeriodeYmd() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const ROWS_PER_PAGE = 10;

// Teks loading dinamis saat FastAPI berjalan (Tahap 1: hanya pivot)
const LOADING_STEPS = [
    'Mengirim file CSV ke FastAPI...',
    'Membersihkan & memetakan data produk...',
    'Melakukan agregasi bulanan...',
    'Membuat pivot tabel...',
    'Menyiapkan data bersih untuk pratinjau...',
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-komponen: Modal Input Manual
// ─────────────────────────────────────────────────────────────────────────────

function ManualInputModal({ open, onClose, jenisKopi }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        periode: defaultPeriodeYmd(),
        jenis_kopi_id: '',
        quantity: '',
    });

    const monthValue = useMemo(
        () => (data.periode ? data.periode.slice(0, 7) : ''),
        [data.periode],
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        const qty = Number(data.quantity);
        if (!data.periode || !data.jenis_kopi_id || Number.isNaN(qty) || qty <= 0) return;
        post(route('admin.sales.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('quantity');
                setData('jenis_kopi_id', '');
                setData('periode', defaultPeriodeYmd());
                onClose();
            },
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 px-4 backdrop-blur-sm dark:bg-black/65">
            <div className="w-full max-w-lg rounded-2xl border border-[#D6DEE8] bg-white p-6 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-950">
                {/* Header Modal */}
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
                            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </span>
                        <h2 className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">
                            Tambah Data Manual
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Periode */}
                        <div>
                            <InputLabel htmlFor="modal-periode" value="Periode (Bulan)" />
                            <TextInput
                                id="modal-periode"
                                type="month"
                                value={monthValue}
                                onChange={(e) =>
                                    setData('periode', e.target.value ? `${e.target.value}-01` : '')
                                }
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.periode} className="mt-1" />
                        </div>

                        {/* Jenis Kopi */}
                        <div>
                            <InputLabel htmlFor="modal-jenis" value="Jenis Kopi" />
                            <select
                                id="modal-jenis"
                                value={data.jenis_kopi_id}
                                onChange={(e) => setData('jenis_kopi_id', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-[#D6DEE8] bg-white px-3 py-2 text-xs text-[#0F172A] shadow-sm focus:border-emerald-400 focus:ring-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="">Pilih jenis...</option>
                                {jenisKopi.map((jk) => (
                                    <option key={jk.id} value={jk.id}>
                                        {jk.nama_jenis}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.jenis_kopi_id} className="mt-1" />
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <InputLabel htmlFor="modal-quantity" value="Quantity (Kg)" />
                        <TextInput
                            id="modal-quantity"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.quantity}
                            onChange={(e) => setData('quantity', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="0.00"
                        />
                        <InputError message={errors.quantity} className="mt-1" />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-[#D6DEE8] px-4 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-[#F1F5F9] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Batal
                        </button>
                        <PrimaryButton
                            disabled={processing || !data.jenis_kopi_id || !data.quantity || !data.periode}
                        >
                            {processing ? 'Menyimpan...' : 'Simpan ke Database'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EmptyStateUpload() {
    const page       = usePage();
    const pageErrors = page.props.errors ?? {};
    const fileRef    = useRef(null);

    const uploadForm = useForm({ file: null });

    const [terminalFile, setTerminalFile]         = useState(null);
    const [terminalFileName, setTerminalFileName] = useState('');
    const [showTerminal, setShowTerminal]         = useState(false);

    const selectedFile = uploadForm.data.file;
    const isUploading  = uploadForm.processing;

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        uploadForm.setData('file', file);
        if (file) {
            setTerminalFile(file);
            setTerminalFileName(file.name);
        } else {
            setTerminalFile(null);
            setTerminalFileName('');
        }
    };

    const handleUpload = (e) => {
        e.preventDefault();
        uploadForm.post(route('admin.sales.upload'), {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset();
                if (fileRef.current) fileRef.current.value = '';
                setTerminalFile(null);
            },
        });
    };

    const handleOpenTerminal = (e) => {
        e.preventDefault();
        if (!terminalFile) return;
        setShowTerminal(true);
    };

    return (
        <>
            <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
                <div className="w-full max-w-xl">
                    {/* Icon + Title */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/15 dark:to-teal-500/10">
                            <svg className="h-10 w-10 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-50">
                            Belum ada data penjualan
                        </h2>
                        <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
                            Mulai dengan mengunggah file CSV historis atau masukkan data secara manual untuk memulai analisis.
                        </p>
                    </div>

                    {/* Upload Card */}
                    <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-6 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/5">
                        {/* File Input */}
                        <div className="mb-4">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                Pilih File CSV
                            </label>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                disabled={isUploading}
                                className="block w-full text-sm text-[#334155] file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white transition hover:file:bg-emerald-400 disabled:opacity-50 dark:text-slate-300 dark:file:bg-emerald-600"
                            />
                            <p className="mt-2 text-[11px] leading-relaxed text-[#64748B] dark:text-slate-400">
                                Header yang dikenali otomatis: <code className="text-[10px]">periode/tanggal</code>, <code className="text-[10px]">jenis/barang</code>, <code className="text-[10px]">kuantitas/qty</code>. Format pivot (arabica/robusta/asalan) juga didukung.
                            </p>
                            <InputError
                                message={uploadForm.errors.file ?? pageErrors.file}
                                className="mt-1.5"
                            />
                        </div>

                        {/* Progress bar (upload biasa) */}
                        {uploadForm.progress && (
                            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900/40">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${uploadForm.progress?.percentage ?? 0}%` }}
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            {/* Tombol: Preprocess Real-Time (SSE) — rekomendasi utama */}
                            <button
                                type="button"
                                id="btn-preprocess-realtime-emptystate"
                                disabled={isUploading || !selectedFile}
                                onClick={handleOpenTerminal}
                                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                                Preprocess Real-Time
                            </button>
                        </div>

                        <p className="mt-3 text-center text-[10px] text-[#94A3B8] dark:text-slate-500">
                            Visualisasikan setiap tahap: cleaning → mapping → agregasi → pivot secara transparan.
                        </p>

                        {/* Unduh Format CSV */}
                        <div className="mt-4 flex justify-center">
                            <a
                                href="/contoh_format.csv"
                                download="contoh_format.csv"
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DEE8] px-4 py-1.5
                                           text-xs font-medium text-[#475569] transition
                                           hover:border-emerald-400 hover:text-emerald-700
                                           dark:border-slate-700 dark:text-slate-400
                                           dark:hover:border-emerald-500/60 dark:hover:text-emerald-300"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Unduh Format CSV
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* PreprocessingTerminal Modal Overlay */}
            {showTerminal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
                        {/* macOS-style title bar */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                                </div>
                                <span className="ml-2 text-xs font-semibold text-slate-300">
                                    Preprocessing Pipeline — Real-Time
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTerminal(false)}
                                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <PreprocessingTerminal
                            file={terminalFile}
                            fileName={terminalFileName}
                            onCancel={() => setShowTerminal(false)}
                        />
                    </div>
                </div>
            )}
        </>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// Sub-komponen: Custom Modal Konfirmasi Hapus
// ─────────────────────────────────────────────────────────────────────────────

function DeleteConfirmModal({ open, onClose, onConfirm }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl
                           dark:border-slate-700 dark:bg-slate-900"
            >
                {/* Ikon Peringatan */}
                <div className="mb-5 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                        <svg
                            className="h-8 w-8 text-red-600 dark:text-red-400"
                            fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21
                                   c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673
                                   a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077
                                   L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562
                                   c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397
                                   m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201
                                   a51.964 51.964 0 0 0-3.32 0
                                   c-1.18.037-2.09 1.022-2.09 2.201v.916
                                   m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </div>

                    {/* Judul */}
                    <h3 className="text-base font-bold text-[#0F172A] dark:text-slate-50">
                        Kosongkan Seluruh Data?
                    </h3>

                    {/* Deskripsi */}
                    <p className="mt-2 text-xs leading-relaxed text-[#64748B] dark:text-slate-400">
                        Apakah Anda yakin ingin menghapus seluruh data historis penjualan?{' '}
                        <span className="font-semibold text-red-600 dark:text-red-400">
                            Tindakan ini tidak dapat dibatalkan
                        </span>{' '}
                        dan Anda harus mengunggah ulang file CSV.
                    </p>
                </div>

                {/* Divider */}
                <div className="mb-4 h-px bg-[#F1F5F9] dark:bg-slate-800" />

                {/* Tombol Aksi */}
                <div className="flex justify-center gap-3">
                    {/* Batal */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-full border border-[#D6DEE8] bg-white px-5 py-2.5 text-xs
                                   font-semibold text-[#334155] transition hover:bg-[#F8FAFC]
                                   dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200
                                   dark:hover:bg-slate-700"
                    >
                        Batal
                    </button>

                    {/* Hapus */}
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 rounded-full bg-red-600 px-5 py-2.5 text-xs font-semibold
                                   text-white shadow-sm transition hover:bg-red-700
                                   focus:outline-none focus:ring-2 focus:ring-red-400/50
                                   dark:bg-red-600 dark:hover:bg-red-700"
                    >
                        Ya, Hapus Semua
                    </button>
                </div>
            </div>
        </div>
    );
}

function _InlineUploadButton_REMOVED() {
    const page = usePage();
    const pageErrors = page.props.errors ?? {};
    const fileRef = useRef(null);
    const [open, setOpen] = useState(false);

    const uploadForm = useForm({ file: null });
    const preprocessForm = useForm({ file: null });

    const [loadingTextIdx, setLoadingTextIdx] = useState(0);
    const loadingIntervalRef = useRef(null);

    useEffect(() => {
        if (preprocessForm.processing) {
            setLoadingTextIdx(0);
            loadingIntervalRef.current = setInterval(() => {
                setLoadingTextIdx((i) => (i + 1) % LOADING_STEPS.length);
            }, 800);
        } else {
            clearInterval(loadingIntervalRef.current);
            setLoadingTextIdx(0);
        }
        return () => clearInterval(loadingIntervalRef.current);
    }, [preprocessForm.processing]);

    const selectedFile = uploadForm.data.file;
    const isProcessing = uploadForm.processing || preprocessForm.processing;

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        uploadForm.setData('file', file);
        preprocessForm.setData('file', file);
    };

    const handleUpload = () => {
        uploadForm.post(route('admin.sales.upload'), {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset(); preprocessForm.reset();
                if (fileRef.current) fileRef.current.value = '';
                setOpen(false);
            },
        });
    };

    const handlePreprocess = () => {
        preprocessForm.post(route('admin.sales.preview-csv'), {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset(); preprocessForm.reset();
                if (fileRef.current) fileRef.current.value = '';
                setOpen(false);
            },
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DEE8] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-[#F1F5F9] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                Unggah CSV
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 px-4 backdrop-blur-sm dark:bg-black/65">
                    <div className="w-full max-w-lg rounded-2xl border border-[#D6DEE8] bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">Unggah File CSV</h2>
                            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:text-slate-400 dark:hover:bg-slate-800">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                                className="block w-full text-xs text-[#334155] file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-400 dark:text-slate-300 dark:file:bg-emerald-600"
                            />
                            <InputError message={uploadForm.errors.file ?? preprocessForm.errors.file ?? pageErrors.file} />

                            {(uploadForm.progress || preprocessForm.progress) && (
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-slate-800">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(uploadForm.progress ?? preprocessForm.progress)?.percentage ?? 0}%` }} />
                                </div>
                            )}

                            {preprocessForm.processing && (
                                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                                    <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                        {LOADING_STEPS[loadingTextIdx]}
                                    </span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 border-t border-[#E2E8F0] pt-4 dark:border-slate-800 sm:flex-row">
                                <button type="button" onClick={handleUpload} disabled={isProcessing || !selectedFile}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-400 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 dark:border-emerald-500/50 dark:bg-transparent dark:text-emerald-300">
                                    {uploadForm.processing ? 'Memproses...' : 'Unggah & Tampilkan'}
                                </button>
                                <button type="button" onClick={handlePreprocess} disabled={isProcessing || !selectedFile}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:from-blue-400 hover:to-indigo-400 disabled:opacity-40">
                                    {preprocessForm.processing ? 'FastAPI berjalan...' : 'Preprocess & Deteksi Anomali'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponen Utama
// ─────────────────────────────────────────────────────────────────────────────

export default function SalesIndex() {
    const { props } = usePage();
    const {
        data_penjualan = [],
        daftar_tahun   = [],
        selected_year,
        jenisKopi      = [],
        uploadPreview,
        preprocessedData,
        summary,
        total_data     = 0,
    } = props;

    const hasData = total_data > 0;

    // ── AnomalyPreview Modal ──────────────────────────────────────────────────
    const [preprocessDismissed, setPreprocessDismissed] = useState(false);
    const showPreprocessed = Boolean(preprocessedData) && !preprocessDismissed;

    // ── Upload preview rows ───────────────────────────────────────────────────
    const uploadPayload = uploadPreview?.data;
    const uploadId      = uploadPreview?.upload_id;
    const lastUploadKey = useRef(null);
    const [draftRows, setDraftRows] = useState([]);

    useEffect(() => {
        if (!uploadId) {
            // Cegah infinite loop dengan mengecek array kosong
            if (draftRows.length > 0) {
                setDraftRows([]);
            }
            lastUploadKey.current = null;
            return;
        }
        if (lastUploadKey.current === uploadId) return;
        lastUploadKey.current = uploadId;
        setDraftRows((uploadPayload || []).map((r, i) => ({ ...r, _key: `u-${uploadId}-${i}` })));
    }, [uploadId, uploadPayload, draftRows.length]);

    // ── Hybrid Filtering State ────────────────────────────────────────────────
    const [searchTerm, setSearchTerm]   = useState('');
    const [filterJenis, setFilterJenis] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Normalise server rows
    const serverRows = useMemo(() => {
        const list = Array.isArray(data_penjualan) ? data_penjualan : [];
        return list.map((r) => ({
            ...r,
            periode:       r.periode ?? r.period,
            jenis_kopi_id: r.jenis_kopi_id,
            quantity:      r.quantity,
        }));
    }, [data_penjualan]);

    // useMemo #1 — client-side filter
    const filteredRows = useMemo(() => {
        let rows = serverRows;
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            rows = rows.filter((r) => {
                const nama = String(r?.jenis_kopi?.nama_jenis ?? r?.jenis_kopi_slug ?? '').toLowerCase();
                const per  = String(r?.periode ?? r?.period ?? '').toLowerCase();
                return nama.includes(q) || per.includes(q);
            });
        }
        if (filterJenis) {
            rows = rows.filter((r) => String(r?.jenis_kopi_id) === String(filterJenis));
        }
        return rows;
    }, [serverRows, searchTerm, filterJenis]);

    // Reset page on filter change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterJenis]);

    // useMemo #2 — slice for pagination
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const pagedRows  = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return filteredRows.slice(start, start + ROWS_PER_PAGE);
    }, [filteredRows, currentPage]);

    // ── Year filter (server-side) ─────────────────────────────────────────────
    const handleYearChange = (year) =>
        router.get(route('admin.sales.index'), { year }, { preserveState: true, preserveScroll: true });

    // ── Summary ───────────────────────────────────────────────────────────────
    const displaySummary = useMemo(() => {
        const latest = maxPeriodeIso(filteredRows);
        let latestLabel = '-';
        let latestYearStr = null;
        let latestYearQty = 0;
        
        if (latest) {
            try {
                const dateObj = new Date(latest);
                latestLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(dateObj);
                latestYearStr = String(dateObj.getFullYear());
            } catch { latestLabel = String(latest); }
            
            if (latestYearStr) {
                // Jumlahkan nilai quantity HANYA untuk baris-baris yang tahunnya sama
                latestYearQty = filteredRows.reduce((acc, r) => {
                    const rPeriode = String(r.periode || r.period || '');
                    if (rPeriode.startsWith(latestYearStr)) {
                        return acc + Number(r.quantity || 0);
                    }
                    return acc;
                }, 0);
            }
        }
        return { 
            latest_periode_display: latestLabel,
            latest_year_str: latestYearStr,
            latest_year_qty: latestYearQty
        };
    }, [filteredRows]);

    // ── Manual Input Modal ────────────────────────────────────────────────────
    const [manualOpen, setManualOpen] = useState(false);

    // ── Edit DB Row ───────────────────────────────────────────────────────────
    const [editingDb, setEditingDb] = useState(null);
    const editForm = useForm({ periode: '', jenis_kopi_id: '', quantity: '' });

    useEffect(() => {
        if (!editingDb) return;
        editForm.setData({
            periode:       String(editingDb.periode ?? editingDb.period ?? '').slice(0, 10),
            jenis_kopi_id: String(editingDb.jenis_kopi_id ?? editingDb.jenis_kopi?.id ?? ''),
            quantity:      String(editingDb.quantity ?? ''),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingDb?.id]);

    const submitEditDb = (e) => {
        e.preventDefault();
        if (!editingDb?.id) return;
        editForm.put(route('admin.sales.update', editingDb.id), {
            preserveScroll: true,
            onSuccess: () => setEditingDb(null),
        });
    };

    // ── Delete Confirm Modal ──────────────────────────────────────────────────
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const confirmDeleteAll = () => {
        router.post(route('admin.sales.truncate'), {}, { preserveScroll: true });
        setShowDeleteModal(false);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AdminLayout>
            <Head title="Data Penjualan" />

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl font-bold tracking-tight text-[#0B1220] dark:text-slate-50">
                        Data Penjualan
                    </h1>
                    <p className="mt-0.5 text-xs text-[#475569] dark:text-slate-400">
                        Tabel <code className="text-[10px]">data_penjualan</code> — periode, jenis_kopi_id, quantity
                        {hasData && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {total_data.toLocaleString('id-ID')} record
                            </span>
                        )}
                    </p>
                </div>

                {/* Controls kanan header */}
                <div className="flex flex-wrap items-center gap-2">
                    <ThemeToggle />
                    {hasData && (
                        /* Dropdown Tahun — hanya satu kontrol, tidak ada tombol Unggah CSV */
                        <select
                            id="filter-year"
                            value={selected_year ?? 'semua'}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="rounded-full border border-[#D6DEE8] bg-white px-3 py-1.5 text-xs text-[#0F172A] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                        >
                            {/* Opsi statis "Semua" di urutan paling atas */}
                            <option value="semua">Semua Tahun</option>
                            {daftar_tahun.map((yr) => (
                                <option key={yr} value={yr}>{yr}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* ── AnomalyPreview Modal ─────────────────────────────────────────── */}
            {showPreprocessed && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0F172A]/40 px-4 backdrop-blur-sm dark:bg-black/60">
                    <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                        <AnomalyPreview
                            preprocessedData={preprocessedData}
                            onCancel={() => setPreprocessDismissed(true)}
                        />
                    </div>
                </div>
            )}

            {/* ── Manual Input Modal ───────────────────────────────────────────── */}
            <ManualInputModal open={manualOpen} onClose={() => setManualOpen(false)} jenisKopi={jenisKopi} />

            {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
            <DeleteConfirmModal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteAll}
            />

            {/* ════════════════════════════════════════════════════════════════
                CONDITIONAL: Empty State vs Data View
            ════════════════════════════════════════════════════════════════ */}
            {!hasData ? (
                /* ── EMPTY STATE ─────────────────────────────────────────────── */
                <EmptyStateUpload />
            ) : (
                /* ── DATA VIEW (Full Width) ──────────────────────────────────── */
                <div className="mt-6 space-y-5">

                    {/* ── Summary Cards ──────────────────────────────────────────── */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B] dark:text-slate-400">Data Ditampilkan</p>
                            <p className="mt-1.5 text-xl font-bold text-[#0F172A] dark:text-slate-50">
                                {filteredRows.length.toLocaleString('id-ID')}
                                <span className="ml-1 text-xs font-normal text-[#64748B] dark:text-slate-400">baris</span>
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-5 py-4 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-teal-500/5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Periode Terakhir</p>
                            <p className="mt-1.5 text-xl font-bold text-emerald-900 dark:text-emerald-50">
                                {displaySummary.latest_periode_display}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 px-5 py-4 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-blue-500/5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">
                                Total Quantity {displaySummary.latest_year_str ? `Tahun Ini (${displaySummary.latest_year_str})` : 'Tahun Ini'}
                            </p>
                            <p className="mt-1.5 text-xl font-bold text-indigo-900 dark:text-indigo-50">
                                {displaySummary.latest_year_qty.toLocaleString('id-ID')}
                                <span className="ml-1 text-xs font-normal text-indigo-700/70 dark:text-indigo-300/70">Kg</span>
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B] dark:text-slate-400">
                                Total Quantity {selected_year && selected_year !== 'semua' ? selected_year : 'Semua'}
                            </p>
                            <p className="mt-1.5 text-xl font-bold text-[#0F172A] dark:text-slate-50">
                                {Number(summary?.total_quantity_year ?? 0).toLocaleString('id-ID')}
                                <span className="ml-1 text-xs font-normal text-[#64748B] dark:text-slate-400">Kg</span>
                            </p>
                        </div>
                    </div>

                    {/* ── Toolbar: Search + Filter + Tambah Manual ───────────────── */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8] dark:text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                            </svg>
                            <input
                                id="search-sales"
                                type="text"
                                placeholder="Cari nama kopi atau periode…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-[#D6DEE8] bg-white py-1.5 pl-8 pr-4 text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder-slate-500"
                            />
                        </div>

                        {/* Filter Jenis */}
                        <select
                            id="filter-jenis"
                            value={filterJenis}
                            onChange={(e) => setFilterJenis(e.target.value)}
                            className="rounded-full border border-[#D6DEE8] bg-white px-3 py-1.5 text-xs text-[#0F172A] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                        >
                            <option value="">Semua jenis</option>
                            {jenisKopi.map((jk) => (
                                <option key={jk.id} value={jk.id}>{jk.nama_jenis}</option>
                            ))}
                        </select>

                        {/* Tombol Tambah Manual */}
                        <button
                            type="button"
                            id="btn-tambah-manual"
                            onClick={() => setManualOpen(true)}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Tambah Data Manual
                        </button>
                    </div>


                    {/* ── Tabel (Full Width) ──────────────────────────────────────── */}
                    <SalesTable
                        rows={pagedRows}
                        jenisKopi={jenisKopi}
                        draftMode={false}
                        onEditDb={(row) => setEditingDb(row)}
                    />

                    {/* ── Footer Tabel: Pagination + Danger Button ────────────────── */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Kosongkan Semua (kiri bawah) — membuka custom modal konfirmasi */}
                        <button
                            type="button"
                            id="btn-kosongkan"
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-400 bg-transparent px-4 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                            Kosongkan Semua Data
                        </button>

                        {/* Paginasi lokal (kanan) */}
                        {filteredRows.length > 0 && (
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                                    Hal.{' '}
                                    <strong className="text-[#0F172A] dark:text-slate-100">{currentPage}</strong>
                                    {' / '}
                                    <strong className="text-[#0F172A] dark:text-slate-100">{totalPages}</strong>
                                    <span className="ml-1.5 text-[10px]">({filteredRows.length} baris)</span>
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        disabled={currentPage <= 1}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        className="rounded-full border border-[#D6DEE8] bg-white px-3 py-1 text-[11px] font-medium text-[#334155] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        ← Prev
                                    </button>
                                    <button
                                        type="button"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        className="rounded-full border border-[#D6DEE8] bg-white px-3 py-1 text-[11px] font-medium text-[#334155] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modal Edit DB ────────────────────────────────────────────────── */}
            {editingDb && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 px-4 backdrop-blur-sm dark:bg-black/60">
                    <div className="w-full max-w-md rounded-2xl border border-[#D6DEE8] bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">Edit Data Penjualan</h3>
                            <button type="button" onClick={() => setEditingDb(null)} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:text-slate-400 dark:hover:bg-slate-800">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={submitEditDb}>
                            <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">Periode</label>
                                <input
                                    type="month"
                                    value={editForm.data.periode ? editForm.data.periode.slice(0, 7) : ''}
                                    onChange={(e) => editForm.setData('periode', e.target.value ? `${e.target.value}-01` : '')}
                                    className="mt-1 w-full rounded-md border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                                {editForm.errors.periode && <p className="mt-1 text-[11px] text-rose-500">{editForm.errors.periode}</p>}
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">Jenis Kopi</label>
                                <select
                                    value={editForm.data.jenis_kopi_id}
                                    onChange={(e) => editForm.setData('jenis_kopi_id', e.target.value)}
                                    className="mt-1 w-full rounded-md border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                    <option value="">Pilih</option>
                                    {jenisKopi.map((jk) => (
                                        <option key={jk.id} value={jk.id}>{jk.nama_jenis} ({jk.id})</option>
                                    ))}
                                </select>
                                {editForm.errors.jenis_kopi_id && <p className="mt-1 text-[11px] text-rose-500">{editForm.errors.jenis_kopi_id}</p>}
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">Quantity (Kg)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.data.quantity}
                                    onChange={(e) => editForm.setData('quantity', e.target.value)}
                                    className="mt-1 w-full rounded-md border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                                {editForm.errors.quantity && <p className="mt-1 text-[11px] text-rose-500">{editForm.errors.quantity}</p>}
                            </div>
                            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                                <button type="button" onClick={() => setEditingDb(null)}
                                    className="rounded-full border border-[#D6DEE8] px-4 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                                    Batal
                                </button>
                                <PrimaryButton disabled={editForm.processing}>Simpan</PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
