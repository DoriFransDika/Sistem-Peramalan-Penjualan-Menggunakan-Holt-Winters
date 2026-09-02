import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import ManagerSidebar from '@/Components/ManagerSidebar';
import AppFooter from '@/Components/AppFooter';
import { Bars3Icon } from '@heroicons/react/24/outline';

export default function ManagerLayout({ children }) {
    const { url } = usePage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#E8EEF6] text-[#0F172A] transition-colors duration-300 ease-out dark:bg-slate-950 dark:text-slate-50">
            {/* Mobile Header with Hamburger */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-[#D0DAE6] dark:border-slate-800 shadow-sm fixed top-0 left-0 right-0 z-30">
                <div className="flex items-center gap-3">
                    <img src="/Logo.jpeg" alt="Logo" className="h-8 w-8 rounded-full object-cover ring-1 ring-emerald-100 dark:ring-slate-800" />
                    <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">AGRORRA KOERINTJI</span>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 focus:outline-none">
                    <Bars3Icon className="h-6 w-6" strokeWidth={2} />
                </button>
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            <ManagerSidebar currentUrl={url} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            
            <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-[#F0F4FA] via-[#EEF2F7] to-emerald-50/40 transition-colors duration-300 ease-out dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/70 pt-[72px] md:pt-0">
                <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-7">
                    {children}
                </div>
                <AppFooter />
            </main>
        </div>
    );
}
