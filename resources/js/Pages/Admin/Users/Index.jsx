import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import Pagination from '@/Components/Pagination';
import ThemeToggle from '@/Components/ThemeToggle';

const defaultForm = {
    name: '',
    email: '',
    password: '',
    role: 'manager',
    status: 'aktif',
};

function toTitleCase(value) {
    if (!value) return '-';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function UsersIndex() {
    const { props } = usePage();
    const { users, filters = {}, flash } = props;

    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const form = useForm(defaultForm);

    const userRows = users?.data ?? [];

    const stats = useMemo(() => {
        const total = users?.total ?? userRows.length;
        const admin = userRows.filter((u) => u.role === 'admin').length;
        const manager = userRows.filter((u) => u.role === 'manager').length;
        return { total, admin, manager };
    }, [users?.total, userRows]);

    const applyFilters = (nextSearch, nextRole) => {
        router.get(
            route('users.index'),
            { search: nextSearch || undefined, role: nextRole || undefined },
            { preserveState: true, replace: true },
        );
    };

    const openCreateModal = () => {
        setEditTarget(null);
        form.reset();
        form.setData(defaultForm);
        form.clearErrors();
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditTarget(user);
        form.setData({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'manager',
            status: user.status || 'aktif',
        });
        form.clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditTarget(null);
        form.reset();
        form.clearErrors();
    };

    const submitForm = (e) => {
        e.preventDefault();
        const query = {
            search: search || undefined,
            role: roleFilter || undefined,
        };

        if (editTarget) {
            form.put(route('users.update', { user: editTarget.id, ...query }), {
                preserveScroll: true,
                onSuccess: closeModal,
            });
            return;
        }

        form.post(route('users.store', query), {
            preserveScroll: true,
            onSuccess: closeModal,
        });
    };

    const deleteUser = () => {
        if (!deleteTarget) return;

        router.delete(route('users.destroy', { user: deleteTarget.id, search: search || undefined, role: roleFilter || undefined }), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AdminLayout>
            <Head title="Manajemen Pengguna" />

            <div className="mx-auto w-full max-w-6xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 pr-2">
                        <h1 className="text-xl font-bold tracking-tight text-[#0B1220] dark:text-lg dark:font-semibold dark:text-slate-50">
                            Manajemen Pengguna
                        </h1>
                        <p className="mt-1 text-xs font-medium text-[#475569] dark:font-normal dark:text-slate-400">
                            Kelola akun pengguna sistem
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white shadow-[0_4px_14px_rgba(5,120,85,0.28)] transition hover:bg-emerald-600 dark:text-slate-950 dark:shadow-md dark:shadow-emerald-900/20 dark:hover:bg-emerald-400"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Tambah Pengguna
                        </button>
                    </div>
                </div>

                {flash?.success ? (
                    <div className="rounded-xl border border-emerald-500/35 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/35 dark:text-emerald-100">
                        {flash.success}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        { label: 'Total Pengguna', value: stats.total },
                        { label: 'Admin', value: stats.admin },
                        { label: 'Manager', value: stats.manager },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-4 shadow-md transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/55 dark:shadow-lg dark:shadow-black/20"
                        >
                            <p className="text-xs text-[#64748B] dark:text-slate-400">{card.label}</p>
                            <p className="mt-2 text-2xl font-semibold leading-none text-[#0F172A] dark:text-slate-50">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-4 shadow-md transition-colors duration-300 dark:border-slate-700/60 dark:bg-slate-900/55 dark:shadow-lg dark:shadow-black/20">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <label className="relative min-w-[220px] flex-1">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94a3b8] dark:text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters(search, roleFilter);
                                }}
                                placeholder="Cari nama atau email..."
                                className="w-full rounded-xl border border-[#D6DEE8] bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-[#94a3b8] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                        </label>

                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                const nextRole = e.target.value;
                                setRoleFilter(nextRole);
                                applyFilters(search, nextRole);
                            }}
                            className="rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                        >
                            <option value="">Semua Role</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                        </select>

                        <button
                            type="button"
                            onClick={() => applyFilters(search, roleFilter)}
                            className="rounded-xl border border-[#D6DEE8] px-3 py-2 text-sm text-[#334155] transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/70"
                        >
                            Cari
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="text-xs uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                                <tr className="border-b border-[#D6DEE8] dark:border-slate-700/70">
                                    <th className="px-3 py-3 font-medium">Nama</th>
                                    <th className="px-3 py-3 font-medium">Email</th>
                                    <th className="px-3 py-3 font-medium">Role</th>
                                    <th className="px-3 py-3 font-medium">Status</th>
                                    <th className="px-3 py-3 text-right font-medium">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userRows.length ? (
                                    userRows.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-[#E2E8F0] text-[#334155] transition hover:bg-[#F4F7FB] dark:border-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800/30"
                                        >
                                            <td className="px-3 py-3">{user.name}</td>
                                            <td className="px-3 py-3 text-[#64748B] dark:text-slate-300">{user.email}</td>
                                            <td className="px-3 py-3">{toTitleCase(user.role)}</td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs ${
                                                        user.status === 'aktif'
                                                            ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40'
                                                            : 'bg-slate-100 text-[#475569] ring-1 ring-[#D6DEE8] dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600/70'
                                                    }`}
                                                >
                                                    {toTitleCase(user.status)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(user)}
                                                        className="rounded-lg border border-[#D6DEE8] px-3 py-1.5 text-xs text-[#334155] transition hover:border-emerald-400/60 hover:text-emerald-800 dark:border-slate-600 dark:text-slate-200 dark:hover:text-emerald-200"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(user)}
                                                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 hover:border-rose-300 dark:border-rose-500/50 dark:text-rose-200 dark:hover:bg-rose-500/20 dark:hover:border-rose-500/50"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-[#64748B] dark:text-slate-500">
                                            Tidak ada data pengguna.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination meta={users} itemLabel="pengguna" />
                </div>
            </div>

            {isModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm dark:bg-slate-950/70">
                    <div className="w-full max-w-lg rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-5 shadow-2xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
                        <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-50">
                            {editTarget ? 'Edit Pengguna' : 'Tambah Pengguna'}
                        </h2>
                        <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                            {editTarget ? 'Password opsional saat update data.' : 'Isi semua data untuk menambah pengguna.'}
                        </p>

                        <form className="mt-4 space-y-3" onSubmit={submitForm}>
                            <div>
                                <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400">Nama</label>
                                <input
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                                />
                                {form.errors.name ? <p className="mt-1 text-xs text-rose-300">{form.errors.name}</p> : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400">Email</label>
                                <input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                                />
                                {form.errors.email ? <p className="mt-1 text-xs text-rose-300">{form.errors.email}</p> : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400">
                                    Password {editTarget ? '(opsional)' : ''}
                                </label>
                                <input
                                    type="password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                                />
                                {form.errors.password ? (
                                    <p className="mt-1 text-xs text-rose-300">{form.errors.password}</p>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400">Role</label>
                                    <select
                                        value={form.data.role}
                                        onChange={(e) => form.setData('role', e.target.value)}
                                        className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                    {form.errors.role ? <p className="mt-1 text-xs text-rose-300">{form.errors.role}</p> : null}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400">Status</label>
                                    <select
                                        value={form.data.status}
                                        onChange={(e) => form.setData('status', e.target.value)}
                                        className="w-full rounded-xl border border-[#D6DEE8] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-emerald-400/60 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                                    >
                                        <option value="aktif">Aktif</option>
                                        <option value="nonaktif">Nonaktif</option>
                                    </select>
                                    {form.errors.status ? (
                                        <p className="mt-1 text-xs text-rose-300">{form.errors.status}</p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl border border-[#D6DEE8] px-4 py-2 text-sm text-[#334155] transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/70"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {deleteTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm dark:bg-slate-950/70">
                    <div className="w-full max-w-sm rounded-2xl border border-[#D6DEE8] bg-[#F8FAFC] p-5 shadow-2xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
                        <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-50">Konfirmasi Hapus</h2>
                        <p className="mt-2 text-sm text-[#475569] dark:text-slate-300">
                            Yakin hapus pengguna <span className="font-semibold">{deleteTarget.name}</span>?
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-xl border border-[#D6DEE8] px-4 py-2 text-sm text-[#334155] transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/70"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={deleteUser}
                                className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </AdminLayout>
    );
}
