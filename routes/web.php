<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Controller
    // Dashboard
    use App\Http\Controllers\Internals\DashboardController;
    // Accounting
    use App\Http\Controllers\Accountings\GeneralLedgerController;
    use App\Http\Controllers\Accountings\SalesEntryController;
    use App\Http\Controllers\Accountings\ExpensesController;
    use App\Http\Controllers\Accountings\VendorsController;
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

// Visa
use App\Http\Controllers\Internals\VisaController;

// Rentals
use App\Http\Controllers\Internals\RentalsController;

// Report
    // Full Details
    use App\Http\Controllers\Reports\FullDetails\RentalController;
    use App\Http\Controllers\Reports\FullDetails\VisaController as FullDetailsVisaController;
    use App\Http\Controllers\Reports\FullDetails\WorkPermitController;

    // Rentals
    use App\Http\Controllers\Reports\Rentals\RentalTransactoinsController;

// API
use App\Http\Controllers\Api\ChartController;
use App\Http\Controllers\Api\ChartOfAccountController;

Route::redirect('/', 'login')->name('home');

//Route::middleware(['auth', 'verified', 'role:Admin'])->prefix('admin')->group(function () {
Route::middleware(['auth', 'verified'])->group(function () {
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

    // Accounting
        Route::controller(GeneralLedgerController::class)->group(function () {
            // GeneralLedgerController
            Route::get('/general-ledger', 'index')->name('general-ledger.index');
            Route::post('/general-ledger/register', 'store')->name('general-ledger.store');

            // Trial Balance
            Route::get('/trial-balance', 'trialBalance')->name('trial-balance.index');
            // Profit & Loss routes
            Route::get('/profit-loss', 'profitLoss')->name('profit-loss.index');

            // Define the route for the Balance Sheet report
            Route::get('/balance-sheet', 'balanceSheet')->name('balance.sheet');

            // Route for Account Ledger Detail
            // The {accountId} is a route parameter.
            Route::get('/account-ledger/{accountId}', 'accountLedgerDetail')->name('account.ledger.detail');
        });

        // Sales
        Route::get('/sales', [SalesEntryController::class, 'index'])->name('sales-entry.index');
        Route::post('/sales/register', [SalesEntryController::class, 'store'])->name('sales.store');

        // Expenses
        Route::get('/expenses', [ExpensesController::class, 'index'])->name('expenses-entry.index');
        Route::post('/expenses/register', [ExpensesController::class, 'store'])->name('expenses.store');

        // Vendors
        Route::post('/vendors/register', [VendorsController::class, 'store'])->name('vendors.store');
        Route::put('/vendors/{vendor}/update', [VendorsController::class, 'update'])->name('vendors.update');
        Route::delete('/vendors/{vendor}', [VendorsController::class, 'destroy'])->name('vendors.destroy');

    // Vehicles
    Route::get('/vehicles', [VehiclesController::class, 'index'])->name('vehicles.index');
        Route::post('/vehicles/register', [VehiclesController::class, 'store'])->name('vehicles.register.store');
        Route::put('/vehicles/{vehicle}/update', [VehiclesController::class, 'update'])->name('vehicles.update');
        Route::put('/vehicles/{vehicle}/update/sold-or-stolen', [VehiclesController::class, 'soldOrStolen'])->name('vehicles.update.sold-or-stolen');
        Route::delete('/vehicles/{vehicle}', [VehiclesController::class, 'destroy'])->name('vehicles.destroy');
    
    // Customers
    Route::get('/customers', [CustomersController::class, 'index'])->name('customers.index');
        Route::post('/customers/register', [CustomersController::class, 'store'])->name('customers.register.store');
        Route::put('/customers/{customer}/update', [CustomersController::class, 'update'])->name('customers.update');
        Route::delete('/customers/{customer}', [CustomersController::class, 'destroy'])->name('customers.destroy');
    
        // Visa
    Route::get('/visa', [VisaController::class, 'index'])->name('visa.index');
    Route::post('/visa/register', [VisaController::class, 'store'])->name('visa.register.store');

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
        
    // Report
        // Histories
        Route::get('/reports/full-details/rentals/{rental}', [RentalController::class, 'index'])->name('reports.full-details.rentals.index');
        Route::get('/reports/full-details/visas/{visa}', [FullDetailsVisaController::class, 'index'])->name('reports.full-details.visas.index');
        Route::get('/reports/full-details/work-permits/{wp}', [WorkPermitController::class, 'index'])->name('reports.full-details.work-permits.index');

        // Rentals
        Route::get('/reports/rentals-transaction', [RentalTransactoinsController::class, 'index'])->name('reports.rentals-transaction.index');

    // Api
    Route::get('rental-chart', [ChartController::class, 'getChartData'])->name('rental-chart');
    Route::get('vehicle-stock-chart', [ChartController::class, 'getVehicleStockChartData'])->name('vehicle-stock-chart');
    Route::get('chart-of-accounts', [ChartOfAccountController::class, 'getChartOfAccount'])->name('api.chart-of-accounts');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
