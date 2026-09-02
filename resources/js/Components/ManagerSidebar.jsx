import { Link } from '@inertiajs/react';
import {
    HomeIcon,
    ChartBarIcon,
    ArrowRightStartOnRectangleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const navItems = [
    { href: '/manager/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/manager/laporan', label: 'Laporan Peramalan', icon: ChartBarIcon },
];

export default function ManagerSidebar({ currentUrl, isSidebarOpen, setIsSidebarOpen }) {
    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform flex-col border-r border-[#D0DAE6] bg-gradient-to-b from-[#FAFBFD] via-[#F4F7FB] to-[#EEF2F7] p-4 shadow-[0_0_32px_rgba(15,23,42,0.07)] transition-transform duration-300 ease-in-out dark:border-emerald-300/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/95 dark:shadow-[0_0_40px_rgba(15,23,42,0.95)] md:relative md:translate-x-0 md:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between mb-8 px-2 gap-3">
                <div className="flex items-center gap-3">
                    <img src="/Logo.jpeg" alt="Logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover ring-2 ring-emerald-100 dark:ring-slate-800" />
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-800 dark:text-emerald-300/90">
                            MANAGER
                        </p>
                        <p className="text-xs font-semibold tracking-wide text-emerald-900 dark:text-emerald-200">
                            AGRORRA KOERINTJI
                        </p>
                    </div>
                </div>
                {/* Close Button Mobile */}
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-500 hover:bg-slate-200 rounded-md dark:text-slate-400 dark:hover:bg-slate-800">
                    <XMarkIcon className="h-6 w-6" strokeWidth={2} />
                </button>
            </div>

            <nav className="flex flex-col flex-1 space-y-1 text-sm py-1 md:py-0">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = currentUrl.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => {
                                if(window.innerWidth < 768) setIsSidebarOpen(false);
                            }}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
                                active
                                    ? 'bg-emerald-500/25 text-emerald-950 ring-1 ring-emerald-500/55 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/60 dark:shadow-none'
                                    : 'text-[#334155] hover:bg-teal-50/85 hover:text-emerald-900 dark:text-slate-200 dark:hover:bg-slate-900/70 dark:hover:text-emerald-200'
                            }`}
                        >
                            <Icon
                                className={`h-4 w-4 shrink-0 ${active ? 'text-emerald-900 dark:text-emerald-100' : 'text-[#475569] dark:text-slate-400'}`}
                                strokeWidth={active ? 2.35 : 1.85}
                            />
                            <span className={active ? 'font-semibold dark:font-medium' : 'font-medium'}>{label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-6">
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#64748B] transition-colors duration-200 hover:bg-teal-50/70 hover:text-emerald-900 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-emerald-200"
                >
                    <ArrowRightStartOnRectangleIcon className="h-4 w-4" strokeWidth={1.85} />
                    <span>Keluar</span>
                </Link>
            </div>
        </aside>
    );
}
