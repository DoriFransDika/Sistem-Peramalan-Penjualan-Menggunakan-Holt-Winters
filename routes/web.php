<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\HoltWintersController;
use App\Http\Controllers\Admin\DataPenjualanController;
use App\Http\Controllers\Admin\PenggunaController;
use App\Http\Controllers\Manager\LaporanController;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\ManagerMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Landing', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'loginUrl' => Route::has('login') ? route('login') : null,
        'dashboardUrl' => route('dashboard'),
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route(auth()->user()?->role === 'admin' ? 'admin.dashboard' : 'manager.dashboard');
    })->name('dashboard');

    Route::get('/admin/dashboard', DashboardController::class)
        ->middleware(AdminMiddleware::class)
        ->name('admin.dashboard');

    Route::middleware(AdminMiddleware::class)->get('/admin/forecast', [HoltWintersController::class, 'index'])->name('admin.forecast');
    Route::middleware(AdminMiddleware::class)->post('/admin/forecast/generate', [HoltWintersController::class, 'generateForecast'])->name('admin.forecast.generate');
    Route::middleware(AdminMiddleware::class)->post('/admin/forecast/preprocess-csv', [HoltWintersController::class, 'preprocessCsv'])->name('admin.forecast.preprocess');
    Route::middleware(AdminMiddleware::class)->post('/admin/forecast/results', [HoltWintersController::class, 'storeResult'])->name('admin.forecast.results.store');
    Route::middleware(AdminMiddleware::class)->prefix('admin/sales')->name('admin.sales.')->group(function () {
        Route::get('/', [DataPenjualanController::class, 'index'])->name('index');
        Route::post('/', [DataPenjualanController::class, 'store'])->name('store');
        Route::put('{dataPenjualan}', [DataPenjualanController::class, 'update'])->name('update');
        Route::delete('{dataPenjualan}', [DataPenjualanController::class, 'destroy'])->name('destroy');
        Route::post('upload', [DataPenjualanController::class, 'upload'])->name('upload');
        Route::post('cancel-upload', [DataPenjualanController::class, 'cancelUpload'])->name('cancel-upload');
        Route::post('preview-csv', [DataPenjualanController::class, 'previewCsv'])->name('preview-csv');
        Route::post('confirm', [DataPenjualanController::class, 'confirm'])->name('confirm');
        Route::post('store-bulk', [DataPenjualanController::class, 'storeBulk'])->name('store-bulk');
        Route::post('truncate', [DataPenjualanController::class, 'truncate'])->name('truncate');
        Route::post('confirm-preprocessed', [DataPenjualanController::class, 'confirmPreprocessed'])->name('confirm-preprocessed');
    });

    Route::middleware(ManagerMiddleware::class)->group(function () {
        Route::get('/manager/dashboard', DashboardController::class)->name('manager.dashboard');

        Route::get('/manager/laporan', LaporanController::class)->name('manager.laporan');
    });
});

Route::prefix('admin')->middleware(['auth', AdminMiddleware::class])->group(function () {
    Route::resource('/users', PenggunaController::class)->except(['create', 'edit', 'show']);
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
