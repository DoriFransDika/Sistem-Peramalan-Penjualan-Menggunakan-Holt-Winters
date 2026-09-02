import { router } from '@inertiajs/react';

function buildPaginationItems(links = []) {
    return links
        .filter((link) => link.label !== '&laquo; Previous' && link.label !== 'Next &raquo;')
        .map((link) => {
            const parsed = Number(String(link.label).replace(/[^0-9]/g, ''));
            return {
                ...link,
                page: Number.isNaN(parsed) ? null : parsed,
            };
        })
        .filter((item) => item.page !== null);
}

export default function Pagination({ meta, itemLabel = 'data' }) {
    if (!meta?.links?.length) return null;

    const paginationItems = buildPaginationItems(meta.links);
    const prevLink = meta.links.find((link) => link.label === '&laquo; Previous');
    const nextLink = meta.links.find((link) => link.label === 'Next &raquo;');

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#64748B] dark:text-slate-400">
                Menampilkan {meta.from ?? 0} - {meta.to ?? 0} dari {meta.total ?? 0} {itemLabel}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={!prevLink?.url}
                    onClick={() => prevLink?.url && router.visit(prevLink.url, { preserveScroll: true })}
                    className="rounded-lg border border-[#D6DEE8] px-3 py-1.5 text-xs text-[#475569] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                >
                    Sebelumnya
                </button>

                {paginationItems.map((item, idx) => (
                    <button
                        key={`${item.page}-${idx}`}
                        type="button"
                        disabled={!item.url}
                        onClick={() => item.url && router.visit(item.url, { preserveScroll: true })}
                        className={`rounded-lg px-3 py-1.5 text-xs transition ${
                            item.active
                                ? 'bg-emerald-500/90 text-slate-950'
                                : 'border border-[#D6DEE8] text-[#475569] hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60'
                        }`}
                    >
                        {item.page}
                    </button>
                ))}

                <button
                    type="button"
                    disabled={!nextLink?.url}
                    onClick={() => nextLink?.url && router.visit(nextLink.url, { preserveScroll: true })}
                    className="rounded-lg border border-[#D6DEE8] px-3 py-1.5 text-xs text-[#475569] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                >
                    Berikutnya
                </button>
            </div>
        </div>
    );
}
