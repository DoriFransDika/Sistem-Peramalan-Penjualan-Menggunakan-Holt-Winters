import { router } from '@inertiajs/react';

function formatPeriode(value) {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(d);
    } catch {
        return String(value);
    }
}

function labelJenis(row, jenisKopi) {
    if (row?.jenis_kopi?.nama_jenis) return row.jenis_kopi.nama_jenis;
    if (row?.jenis_kopi_id) {
        const jk = jenisKopi.find((x) => x.id === row.jenis_kopi_id);
        if (jk) return jk.nama_jenis;
    }
    const slug = row?.jenis_kopi_slug ?? row?.raw_material;
    if (slug) return String(slug);
    return '-';
}

export default function SalesTable({
    rows,
    jenisKopi = [],
    draftMode,
    onDeleteDraft,
    onEditDb,
}) {
    const list = Array.isArray(rows) ? rows : [];

    return (
        <div className="overflow-hidden rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] shadow-lg transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20">
            <div className="flex items-center justify-between border-b border-[#D6DEE8] px-4 py-3 dark:border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300/90">
                    Tabel data_penjualan
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    {list.length.toLocaleString('id-ID')} baris
                </p>
            </div>

            <div className="max-h-[min(60vh,520px)] overflow-auto">
                <table className="min-w-full divide-y divide-[#D6DEE8] text-[11px] dark:divide-slate-800">
                    <thead className="sticky top-0 z-10 bg-white/95 text-[#64748B] backdrop-blur dark:bg-slate-900/95 dark:text-slate-300">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">periode</th>
                            <th className="px-3 py-2 text-left font-medium">nama_jenis</th>
                            <th className="px-3 py-2 text-right font-medium">quantity (Kg)</th>
                            <th className="px-3 py-2 text-right font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D6DEE8] dark:divide-slate-800">
                        {list.length > 0 ? (
                            list.map((row, idx) => {
                                const key = row?._key ?? row?.id ?? `${row?.periode ?? 'p'}-${idx}`;
                                const qty =
                                    typeof row?.quantity === 'number'
                                        ? row.quantity
                                        : Number(row?.quantity ?? 0);
                                const isDraft = Boolean(draftMode && row?._key);

                                return (
                                    <tr
                                        key={key}
                                        className="transition-colors hover:bg-[#EEF2F7]/80 dark:hover:bg-slate-900/50"
                                    >
                                        <td className="whitespace-nowrap px-3 py-2 text-[#334155] dark:text-slate-200">
                                            {formatPeriode(row?.periode ?? row?.period)}
                                        </td>
                                        <td className="px-3 py-2 text-[#334155] dark:text-slate-200">
                                            {labelJenis(row, jenisKopi)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right text-[#0F172A] dark:text-slate-100">
                                            {qty.toLocaleString('id-ID')}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right">
                                            {isDraft ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteDraft?.(row._key)}
                                                    className="rounded-full border border-rose-300/70 px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-100 dark:hover:bg-rose-500/10"
                                                >
                                                    Hapus
                                                </button>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditDb?.(row)}
                                                        className="rounded-full border border-[#D6DEE8] px-2 py-0.5 text-[10px] text-[#334155] hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!row?.id) return;
                                                            if (!window.confirm('Hapus baris ini?')) return;
                                                            router.delete(route('admin.sales.destroy', row.id), {
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                        className="rounded-full border border-rose-300/70 px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-100 dark:hover:bg-rose-500/10"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-10 text-center text-sm text-[#64748B] dark:text-slate-500"
                                >
                                    Tidak ada data.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
