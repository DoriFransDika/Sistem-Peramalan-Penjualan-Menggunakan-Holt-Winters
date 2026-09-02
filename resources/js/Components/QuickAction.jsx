import PrimaryButton from '@/Components/PrimaryButton';

export default function QuickAction() {
    return (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-200 dark:shadow-[0_18px_50px_rgba(15,23,42,0.9)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300/90">
                Aksi Cepat
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Aksi cepat untuk memperbarui data penjualan dan menjalankan ulang proses prediksi.
            </p>
            <div className="flex flex-wrap gap-2">
                <PrimaryButton className="!px-4 !py-1.5 !text-[10px]">
                    Tambah Data
                </PrimaryButton>
                <PrimaryButton className="!px-4 !py-1.5 !text-[10px] !bg-slate-100 !text-slate-700 hover:!bg-slate-200 dark:!bg-slate-900 dark:!text-slate-200 dark:hover:!bg-slate-800 !border-slate-200 dark:!border-slate-800">
                    Unggah Data 
                </PrimaryButton>
                <PrimaryButton className="!px-4 !py-1.5 !text-[10px]">
                    Jalankan Prediksi
                </PrimaryButton>
            </div>
        </div>
    );
}

