import PrimaryButton from '@/Components/PrimaryButton';

export default function PreviewModal({ preview, previewData, onConfirm, onCancel }) {
    if (!preview) return null;

    const data = Array.isArray(previewData) ? previewData : (preview?.data ?? []);
    const hasPreview = data.length > 0;
    const { total_rows, valid_rows, skipped_rows, skipped_reason } = preview ?? {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 px-4 backdrop-blur-sm dark:bg-black/60">
            <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-emerald-300/40 bg-[#F8FAFC] shadow-[0_24px_80px_rgba(15,23,42,0.12)] transition-colors duration-300 dark:border-emerald-300/30 dark:bg-slate-950 dark:shadow-[0_24px_80px_rgba(15,23,42,0.95)]">
                <div className="flex items-center justify-between border-b border-[#D6DEE8] px-5 py-3 dark:border-slate-800">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300/90">
                        Pratinjau Data yang Dibersihkan
                    </h2>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        Tutup
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4 text-xs text-[#334155] dark:text-slate-200">
                    <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#64748B] dark:text-slate-400">
                                Total Baris
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                                {total_rows ?? '-'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 px-3 py-2 dark:border-emerald-400/40 dark:bg-emerald-500/10">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-200">
                                Baris Valid
                            </p>
                            <p className="mt-1 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                                {valid_rows ?? '-'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 dark:border-amber-400/40 dark:bg-amber-500/10">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-900 dark:text-amber-200">
                                Baris Dilewati
                            </p>
                            <p className="mt-1 text-sm font-semibold text-amber-950 dark:text-amber-100">
                                {skipped_rows ?? '-'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#64748B] dark:text-slate-400">
                                Alasan Dilewati
                            </p>
                            <ul className="mt-1 space-y-0.5 text-[11px] text-[#475569] dark:text-slate-300">
                                <li>Satuan tidak valid: {skipped_reason?.invalid_unit ?? 0}</li>
                                <li>Jumlah tidak valid: {skipped_reason?.invalid_qty ?? 0}</li>
                                <li>Tanggal tidak valid: {skipped_reason?.invalid_date ?? 0}</li>
                            </ul>
                        </div>
                    </div>

                    {hasPreview ? (
                        <div className="max-h-64 overflow-auto rounded-xl border border-[#D6DEE8] bg-white dark:border-slate-800 dark:bg-slate-950/80">
                            <table className="min-w-full divide-y divide-[#D6DEE8] text-[11px] dark:divide-slate-800">
                                <thead className="bg-[#F4F7FB] text-[#64748B] dark:bg-slate-900/80 dark:text-slate-300">
                                    <tr>
                                        <th className="px-3 py-2 text-left">periode</th>
                                        <th className="px-3 py-2 text-left">jenis_kopi</th>
                                        <th className="px-3 py-2 text-right">quantity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D6DEE8] dark:divide-slate-800">
                                    {data.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-[#EEF2F7]/80 dark:hover:bg-slate-900/60"
                                        >
                                            <td className="px-3 py-2 align-middle text-[#334155] dark:text-slate-200">
                                                {row.periode ?? row.period}
                                            </td>
                                            <td className="px-3 py-2 align-middle capitalize text-[#334155] dark:text-slate-200">
                                                {row.jenis_kopi_slug ?? row.raw_material}
                                            </td>
                                            <td className="px-3 py-2 text-right align-middle text-[#0F172A] dark:text-slate-100">
                                                {Number(row.quantity).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[#D6DEE8] bg-white px-4 py-8 text-center text-sm text-[#64748B] dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-500">
                            Tidak ada data pratinjau.
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-[#D6DEE8] px-5 py-3 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        Batal
                    </button>
                    <div className="flex items-center gap-2">
                        <PrimaryButton onClick={() => onConfirm(true)} disabled={!hasPreview}>
                            Simpan & Timpa
                        </PrimaryButton>
                        <button
                            type="button"
                            onClick={() => onConfirm(false)}
                            disabled={!hasPreview}
                            className="inline-flex items-center rounded-full border border-[#D6DEE8] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#334155] shadow-sm transition duration-150 ease-in-out hover:bg-[#F4F7FB] focus:outline-none focus:ring-2 focus:ring-emerald-300/40 disabled:opacity-25 dark:border-slate-600 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                            Simpan (Lewati yang sudah ada)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
