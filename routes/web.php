<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Controller
    // Dashboard
    use App\Http\Controllers\Internals\DashboardController;
    // User
    use App\Http\Controllers\Internals\UserController;
    // Vehicles
    use App\Http\Controllers\Internals\VehiclesController;
    use App\Http\Controllers\Internals\Vehicles\ClassesController;
    use App\Http\Controllers\Internals\Vehicles\StatusController;
    use App\Http\Controllers\Internals\Vehicles\MakersController;
    use App\Http\Controllers\Internals\Vehicles\ModelsController;
    // Rentals
    use App\Http\Controllers\Internals\Deposits\DepositTypesController;

// Customers
use App\Http\Controllers\Internals\CustomersController;
use App\Http\Controllers\Internals\Contacts\TypesController;

// Rentals
use App\Http\Controllers\Internals\RentalsController;

// Report
    // Full Details
    use App\Http\Controllers\Reports\FullDetails\RentalController;
    use App\Http\Controllers\Reports\FullDetails\VisaController;
    use App\Http\Controllers\Reports\FullDetails\WorkPermitController;

    // Rentals
    use App\Http\Controllers\Reports\Rentals\RentalTransactoinsController;

// API
use App\Http\Controllers\Api\ChartController;

Route::redirect('/', 'login')->name('home');

//Route::middleware(['auth', 'verified', 'role:Admin'])->prefix('admin')->group(function () {
Route::middleware(['auth', 'verified'])->group(function () {
    /* Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard'); */
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

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
        Route::put('/vehicles/{vehicle}/update/sold-or-stolen', [VehiclesController::class, 'soldOrStolen'])->name('vehicles.update.sold-or-stolen');
        Route::delete('/vehicles/{vehicle}', [VehiclesController::class, 'destroy'])->name('vehicles.destroy');
        // Setting
            Route::redirect('/vehicles/settings', '/vehicles/settings/classes');
            // Class
            Route::get('/vehicles/settings/classes', [ClassesController::class, 'index'])->name('vehicles.classes.index');
            Route::post('/vehicles/settings/classes/store', [ClassesController::class, 'store'])->name('vehicles.classes.store');
            Route::put('/vehicles/settings/classes/{class}/update', [ClassesController::class, 'update'])->name('vehicles.classes.update');
            Route::delete('/vehicles/settings/classes/{class}', [ClassesController::class, 'destroy'])->name('vehicles.classes.delete');
            // Status
            Route::get('/vehicles/settings/status', [StatusController::class, 'index'])->name('vehicles.status.index');
            Route::post('/vehicles/settings/status/store', [StatusController::class, 'store'])->name('vehicles.status.store');
            Route::put('/vehicles/settings/status/{status}/update', [StatusController::class, 'update'])->name('vehicles.status.update');
            Route::delete('/vehicles/settings/status/{status}', [StatusController::class, 'destroy'])->name('vehicles.status.delete');
            // Maker
            Route::get('/vehicles/settings/makers', [MakersController::class, 'index'])->name('vehicles.makers.index');
            Route::post('/vehicles/settings/makers/store', [MakersController::class, 'store'])->name('vehicles.makers.store');
            Route::put('/vehicles/settings/makers/{maker}/update', [MakersController::class, 'update'])->name('vehicles.makers.update');
            Route::delete('/vehicles/settings/makers/{maker}', [MakersController::class, 'destroy'])->name('vehicles.makers.delete');
            // Model
            Route::get('/vehicles/settings/models', [ModelsController::class, 'index'])->name('vehicles.models.index');
            Route::post('/vehicles/settings/models/store', [ModelsController::class, 'store'])->name('vehicles.models.store');
            Route::put('/vehicles/settings/models/{model}/update', [ModelsController::class, 'update'])->name('vehicles.models.update');
            Route::delete('/vehicles/settings/models/{model}', [ModelsController::class, 'destroy'])->name('vehicles.models.delete');

    // Customers
    Route::get('/customers', [CustomersController::class, 'index'])->name('customers.index');
        Route::post('/customers/register', [CustomersController::class, 'store'])->name('customers.register.store');
        Route::put('/customers/{customer}/update', [CustomersController::class, 'update'])->name('customers.update');
        Route::delete('/customers/{customer}', [CustomersController::class, 'destroy'])->name('customers.destroy');
        // Settings
            Route::redirect('/customers/settings', '/customers/settings/types');
            // Class
            Route::get('/customers/settings/types', [TypesController::class, 'index'])->name('customers.settings.types.index');
            Route::post('/customers/settings/types/register', [TypesController::class, 'store'])->name('customers.settings.types.register.store');
            Route::put('/customers/settings/types/{contactType}/update', [TypesController::class, 'update'])->name('customers.settings.types.update');
            Route::delete('/customers/settings/types/{contactType}', [TypesController::class, 'destroy'])->name('customers.settings.types.destroy');

    // Rentals
    Route::get('/rentals', [RentalsController::class, 'index'])->name('rentals.index');
    Route::post('/rentals/register', [RentalsController::class, 'store'])->name('rentals.register.store');
    Route::put('/rentals/{rental}/return', [RentalsController::class, 'destroy'])->name('rentals.return');
    Route::put('/rentals/{rental}/update/temp-return', [RentalsController::class, 'tempReturn'])->name('rentals.status.temp-return.update');
    Route::put('/rentals/{rental}/update/pick-up', [RentalsController::class, 'pickUp'])->name('rentals.status.pick-up.update');
    Route::put('/rentals/{rental}/update/extend-contract', [RentalsController::class, 'ExtendContract'])->name('rentals.status.extend-contract.update');
    Route::put('/rentals/{rental}/update/add-coming-date', [DashboardController::class, 'addComingDate'])->name('rentals.add-coming-date.update');
    Route::put('/rentals/{rental}/update/change-vehicle-contract', [RentalsController::class, 'ChangeVehicle'])->name('rentals.status.change-vehicle-contract.update');
    Route::put('/rentals/{rental}/update/change-deposit-contract', [RentalsController::class, 'ChangeDeposit'])->name('rentals.status.change-deposit-contract.update');
        // Settings
            Route::redirect('/rentals/settings', '/rentals/settings/deposit-type');
            // Class
            Route::get('/rentals/settings/deposit-type', [DepositTypesController::class, 'index'])->name('rentals.settings.deposit-type.index');
            Route::post('/rentals/settings/deposit-type/store', [DepositTypesController::class, 'store'])->name('rentals.settings.deposit-type.store');
            Route::put('/rentals/settings/deposit-type/{type}/update', [DepositTypesController::class, 'update'])->name('rentals.settings.deposit-type.update');
            Route::delete('/rentals/settings/deposit-type/{type}', [DepositTypesController::class, 'destroy'])->name('rentals.settings.deposit-type.delete');

    // Report
        // Histories
        Route::get('/reports/full-details/rentals/{rental}', [RentalController::class, 'index'])->name('reports.full-details.rentals.index');
        Route::get('/reports/full-details/visas/{visa}', [VisaController::class, 'index'])->name('reports.full-details.visas.index');
        Route::get('/reports/full-details/work-permits/{wp}', [WorkPermitController::class, 'index'])->name('reports.full-details.work-permits.index');

        // Rentals
        Route::get('/reports/rentals-transaction', [RentalTransactoinsController::class, 'index'])->name('reports.rentals-transaction.index');

    // Chart
    Route::get('rental-chart', [ChartController::class, 'getChartData'])->name('rental-chart');
    Route::get('vehicle-stock-chart', [ChartController::class, 'getVehicleStockChartData'])->name('vehicle-stock-chart');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
