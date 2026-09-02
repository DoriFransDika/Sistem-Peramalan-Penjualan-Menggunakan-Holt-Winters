/**
 * Manager/Dashboard.jsx
 *
 * Re-export komponen DashboardPage dari Admin/Dashboard.jsx.
 * Halaman Manager menggunakan komponen yang SAMA PERSIS dengan Admin.
 * Role-based rendering (sembunyikan QuickAction dll.) ditangani
 * secara internal di dalam DashboardPage berdasarkan auth.user.role.
 *
 * Backend: route manager.dashboard juga memanggil DashboardController
 * yang sama, sehingga data grafik dan metrik 100% identik dengan Admin.
 */
export { default } from '@/Pages/Admin/Dashboard';
