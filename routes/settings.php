<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Controller
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
// Accounting
use App\Http\Controllers\Accountings\VendorsController;

// Vehicle
use App\Http\Controllers\Internals\VehiclesController;
use App\Http\Controllers\Internals\Vehicles\ClassesController;
use App\Http\Controllers\Internals\Vehicles\StatusController;
use App\Http\Controllers\Internals\Vehicles\MakersController;
use App\Http\Controllers\Internals\Vehicles\ModelsController;

// Customer
use App\Http\Controllers\Internals\Contacts\TypesController;

// Rental
use App\Http\Controllers\Internals\Deposits\DepositTypesController;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/appearance');

    // Accounting
    Route::redirect('/settings/accountings', '/settings/vendors');
        Route::get('/settings/vendors', [VendorsController::class, 'index'])->name('settings.vendors.index');
    // Rental
    Route::redirect('/settings/rentals', '/settings/rentals/deposit-type');// Settings
        // Class
        Route::get('/settings/rentals/deposit-type', [DepositTypesController::class, 'index'])->name('rentals.settings.deposit-type.index');
        Route::post('/rentals/settings/deposit-type/store', [DepositTypesController::class, 'store'])->name('rentals.settings.deposit-type.store');
        Route::put('/rentals/settings/deposit-type/{type}/update', [DepositTypesController::class, 'update'])->name('rentals.settings.deposit-type.update');
        Route::delete('/rentals/settings/deposit-type/{type}', [DepositTypesController::class, 'destroy'])->name('rentals.settings.deposit-type.delete');


    // Customer
    Route::redirect('/settings/customers', '/settings/customers/types');// Settings
        // Class
        Route::get('/settings/customers/types', [TypesController::class, 'index'])->name('customers.settings.types.index');
        Route::post('/customers/settings/types/register', [TypesController::class, 'store'])->name('customers.settings.types.register.store');
        Route::put('/customers/settings/types/{contactType}/update', [TypesController::class, 'update'])->name('customers.settings.types.update');
        Route::delete('/customers/settings/types/{contactType}', [TypesController::class, 'destroy'])->name('customers.settings.types.destroy');


    // Vehicle
    Route::redirect('/settings/vehicles', '/settings/vehicles/classes');
        // Class
        Route::get('/settings/vehicles/classes', [ClassesController::class, 'index'])->name('vehicles.classes.index');
        Route::post('/vehicles/settings/classes/store', [ClassesController::class, 'store'])->name('vehicles.classes.store');
        Route::put('/vehicles/settings/classes/{class}/update', [ClassesController::class, 'update'])->name('vehicles.classes.update');
        Route::delete('/vehicles/settings/classes/{class}', [ClassesController::class, 'destroy'])->name('vehicles.classes.delete');
        // Status
        Route::get('/settings/vehicles/status', [StatusController::class, 'index'])->name('vehicles.status.index');
        Route::post('/vehicles/settings/status/store', [StatusController::class, 'store'])->name('vehicles.status.store');
        Route::put('/vehicles/settings/status/{status}/update', [StatusController::class, 'update'])->name('vehicles.status.update');
        Route::delete('/vehicles/settings/status/{status}', [StatusController::class, 'destroy'])->name('vehicles.status.delete');
        // Maker
        Route::get('/settings/vehicles/makers', [MakersController::class, 'index'])->name('vehicles.makers.index');
        Route::post('/vehicles/settings/makers/store', [MakersController::class, 'store'])->name('vehicles.makers.store');
        Route::put('/vehicles/settings/makers/{maker}/update', [MakersController::class, 'update'])->name('vehicles.makers.update');
        Route::delete('/vehicles/settings/makers/{maker}', [MakersController::class, 'destroy'])->name('vehicles.makers.delete');
        // Model
        Route::get('/settings/vehicles/models', [ModelsController::class, 'index'])->name('vehicles.models.index');
        Route::post('/vehicles/settings/models/store', [ModelsController::class, 'store'])->name('vehicles.models.store');
        Route::put('/vehicles/settings/models/{model}/update', [ModelsController::class, 'update'])->name('vehicles.models.update');
        Route::delete('/vehicles/settings/models/{model}', [ModelsController::class, 'destroy'])->name('vehicles.models.delete');


    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
