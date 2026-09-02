import { useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';

function defaultPeriodeYmd() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * @param {'draft'|'store'} props.mode
 * @param {(row: { periode: string, jenis_kopi_id: string, quantity: number }) => void} props.onDraftAdd
 */
export default function SalesForm({ mode, onDraftAdd }) {
    const { jenisKopi = [] } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        periode: defaultPeriodeYmd(),
        jenis_kopi_id: '',
        quantity: '',
    });

    useEffect(() => {
        if (!data.periode) {
            setData('periode', defaultPeriodeYmd());
        }
    }, [data.periode, setData]);

    const monthValue = useMemo(() => (data.periode ? data.periode.slice(0, 7) : ''), [data.periode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const qty = Number(data.quantity);
        if (!data.periode || !data.jenis_kopi_id || Number.isNaN(qty) || qty <= 0) {
            return;
        }

        if (mode === 'draft') {
            onDraftAdd?.({
                periode: data.periode,
                jenis_kopi_id: data.jenis_kopi_id,
                quantity: qty,
            });
            reset('quantity');
            setData('jenis_kopi_id', '');
            return;
        }

        post(route('admin.sales.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('quantity');
                setData('jenis_kopi_id', '');
                setData('periode', defaultPeriodeYmd());
            },
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-4 shadow-lg transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-black/20"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300/90">
                    Input Manual
                </h3>
                {mode === 'draft' ? (
                    <span className="text-[10px] text-amber-800 dark:text-amber-200/90">
                        Menambah ke pratinjau (belum ke database)
                    </span>
                ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <div>
                    <InputLabel htmlFor="periode" value="Periode (bulan)" />
                    <TextInput
                        id="periode"
                        type="month"
                        value={monthValue}
                        onChange={(e) => {
                            const v = e.target.value;
                            setData('periode', v ? `${v}-01` : '');
                        }}
                        className="mt-1 block w-full"
                    />
                    <InputError message={errors.periode} className="mt-1" />
                    <p className="mt-1 text-[10px] text-[#64748B] dark:text-slate-500">Kolom database: periode</p>
                </div>

                <div>
                    <InputLabel htmlFor="jenis_kopi_id" value="Jenis Kopi" />
                    <select
                        id="jenis_kopi_id"
                        value={data.jenis_kopi_id}
                        onChange={(e) => setData('jenis_kopi_id', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-[#D6DEE8] bg-white text-xs text-[#0F172A] shadow-sm focus:border-emerald-400 focus:ring-emerald-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                    >
                        <option value="">Pilih jenis</option>
                        {jenisKopi.map((jk) => (
                            <option key={jk.id} value={jk.id}>
                                {jk.nama_jenis} ({jk.id})
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.jenis_kopi_id} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="quantity" value="Quantity (Kg)" />
                    <TextInput
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={data.quantity}
                        onChange={(e) => setData('quantity', e.target.value)}
                        className="mt-1 block w-full"
                    />
                    <InputError message={errors.quantity} className="mt-1" />
                </div>
            </div>

            <div className="flex justify-end">
                <PrimaryButton
                    disabled={processing || !data.jenis_kopi_id || !data.quantity || !data.periode}
                >
                    {mode === 'draft' ? 'Tambahkan ke tabel' : 'Simpan ke data_penjualan'}
                </PrimaryButton>
            </div>
        </form>
    );
}
