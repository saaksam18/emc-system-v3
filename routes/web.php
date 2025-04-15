<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Controller
use App\Http\Controllers\Internals\UserController;
use App\Http\Controllers\Internals\VehiclesController;
use App\Http\Controllers\Internals\CustomersController;

Route::redirect('home', '/');
Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

//Route::middleware(['auth', 'verified', 'role:Admin'])->prefix('admin')->group(function () {
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::redirect('administrator', '/administrator/users');

    // User
    Route::get('/administrator/users', [UserController::class, 'index'])
    ->name('administrator.users.index');
        Route::put('/administrator/users/{user}/update', [UserController::class, 'updateUser'])->name('administrator.users.update');
        Route::delete('/administrator/users/{user}', [UserController::class, 'destroyAdmin'])->name('administrator.users.destroy-admin');

    // Role
    Route::get('/administrator/roles', [UserController::class, 'roleIndex'])
    ->name('administrator.roles.index');
    Route::get('/administrator/roles/register', [UserController::class, 'roleCreate'])
        ->name('administrator.roles.register');
        Route::post('/administrator/roles/register', [UserController::class, 'roleStore'])->name('administrator.roles.register.store');
        Route::put('/administrator/roles/{role}/update', [UserController::class, 'updateRole'])->name('administrator.roles.update');
    Route::delete('/administrator/roles/{role}', [UserController::class, 'destroyRole'])->name('administrator.roles.destroy-role');

    // Vehicles
    Route::get('/vehicles', [VehiclesController::class, 'index'])->name('vehicles.index');
        Route::post('/vehicles/register', [VehiclesController::class, 'store'])->name('vehicles.register.store');
        Route::put('/vehicles/{vehicle}/update', [VehiclesController::class, 'update'])->name('vehicles.update');
        Route::delete('/vehicles/{vehicle}', [VehiclesController::class, 'destroy'])->name('vehicles.destroy');

    // Customers
    Route::get('/customers', [CustomersController::class, 'index'])->name('customers.index');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
