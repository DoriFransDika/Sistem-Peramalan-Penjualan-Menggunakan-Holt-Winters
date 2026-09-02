/**
 * UploadModal.jsx — Upload CSV (sidebar panel)
 *
 * Perubahan:
 *  - Tombol lama "Preprocess → Pivot" (via Laravel session) DIGANTI dengan
 *    tombol "Preprocess Real-Time" yang membuka PreprocessingTerminal sebagai
 *    overlay modal, terhubung langsung ke FastAPI SSE stream.
 *  - Tombol "Unggah & Tampilkan" (PHP parser) tetap ada untuk backward compat.
 */

import { useForm, usePage } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { useRef, useState } from 'react';
import PreprocessingTerminal from './PreprocessingTerminal';

export default function UploadModal() {
    const page       = usePage();
    const pageErrors = page.props.errors ?? {};
    const totalData  = page.props.total_data ?? 0;
    const isLocked   = totalData > 0;
    const fileRef    = useRef(null);

    // Form untuk upload biasa (PHP parser — tetap ada)
    const uploadForm = useForm({ file: null });

    // State untuk PreprocessingTerminal modal
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalFile, setTerminalFile] = useState(null);
    const [terminalFileName, setTerminalFileName] = useState('');

    const selectedFile = uploadForm.data.file;

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

    const handleTerminalCancel = () => {
        setShowTerminal(false);
    };

    const isProcessing = uploadForm.processing;

    return (
        <>
            {/* ── Upload Panel ── */}
            <div
                className={`space-y-3 rounded-2xl border p-4 shadow-lg transition-colors duration-300 ${
                    isLocked
                        ? 'border-amber-300/60 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5'
                        : 'border-[#D6DEE8] bg-[#F8FAFC] dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-black/20'
                }`}
            >
                <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                        isLocked
                            ? 'text-amber-700 dark:text-amber-300/70'
                            : 'text-emerald-800 dark:text-emerald-300/90'
                    }`}>
                        Unggah CSV
                        {isLocked && (
                            <svg className="ml-1.5 inline h-3.5 w-3.5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        )}
                    </h3>
                </div>

                {/* Lock Warning */}
                {isLocked && (
                    <div className="rounded-xl border border-amber-300/50 bg-amber-100/80 px-3 py-2.5 dark:border-amber-400/30 dark:bg-amber-500/10">
                        <div className="flex items-start gap-2">
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <div>
                                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                                    Data awal sudah terisi ({totalData.toLocaleString('id-ID')} record)
                                </p>
                                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-700/90 dark:text-amber-300/70">
                                    Upload CSV dikunci untuk menjaga konsistensi data. Gunakan <strong>Input Manual</strong> untuk menambah data bulan berikutnya.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={isLocked ? 'pointer-events-none opacity-40' : ''}>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        disabled={isLocked}
                        className="block w-full text-xs text-[#334155] file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500/90 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-400 dark:text-slate-200 dark:file:bg-emerald-400 dark:file:text-slate-950 dark:hover:file:bg-emerald-300"
                    />
                    <p className="mt-1.5 text-[11px] text-[#64748B] dark:text-slate-400">
                        Hanya file <span className="font-mono text-[#475569] dark:text-slate-300">.csv</span>. Header otomatis dikenali:
                        kolom <span className="font-mono text-[#475569] dark:text-slate-300">periode/tanggal/bulan</span>,{' '}
                        <span className="font-mono text-[#475569] dark:text-slate-300">jenis/barang</span>, dan{' '}
                        <span className="font-mono text-[#475569] dark:text-slate-300">kuantitas/qty/berat</span>.
                    </p>
                    <InputError message={uploadForm.errors.file ?? pageErrors.file} className="mt-1" />
                    {uploadForm.progress && (
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-slate-800">
                            <div
                                className="h-full bg-emerald-400 transition-all"
                                style={{ width: `${uploadForm.progress?.percentage ?? 0}%` }}
                            />
                        </div>
                    )}
                </div>

                <div className={`flex flex-col gap-2 ${isLocked ? 'pointer-events-none opacity-40' : ''}`}>
                    {/* Tombol 1: Upload biasa (PHP parser) */}
                    <div className="flex justify-end">
                        <PrimaryButton disabled={isProcessing || !selectedFile || isLocked} onClick={handleUpload}>
                            {uploadForm.processing ? 'Memproses…' : 'Unggah & Tampilkan'}
                        </PrimaryButton>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-[#D6DEE8] dark:bg-slate-800" />
                        <span className="text-[10px] text-[#94A3B8] dark:text-slate-500">atau</span>
                        <div className="h-px flex-1 bg-[#D6DEE8] dark:bg-slate-800" />
                    </div>

                    {/* Tombol 2: Preprocess Real-Time (SSE) — baru */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            id="btn-preprocess-realtime-sidebar"
                            disabled={isProcessing || !selectedFile || isLocked}
                            onClick={handleOpenTerminal}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/50 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-sm transition duration-150 hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-300/40 disabled:opacity-40 dark:border-blue-400/30 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            Preprocess Real-Time
                        </button>
                    </div>
                    <p className="text-right text-[10px] text-[#94A3B8] dark:text-slate-500">
                        Lihat setiap tahap: cleaning → mapping → agregasi → pivot secara real-time.
                    </p>
                </div>
            </div>

            {/* ── PreprocessingTerminal Modal Overlay ── */}
            {showTerminal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
                        {/* Modal Header */}
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
                                onClick={handleTerminalCancel}
                                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                                aria-label="Tutup terminal"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <PreprocessingTerminal
                            file={terminalFile}
                            fileName={terminalFileName}
                            onCancel={handleTerminalCancel}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
