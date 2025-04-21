<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use Spatie\Permission\Models\Permission;

class UserRolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create permissions
        Permission::create(['name' => 'dashboard-list']);

        // Rental
        Permission::create(['name' => 'rental-list']);
        Permission::create(['name' => 'rental-create']);
        Permission::create(['name' => 'rental-edit']);
        Permission::create(['name' => 'rental-delete']);

        // Vehicle
        Permission::create(['name' => 'vehicle-list']);
        Permission::create(['name' => 'vehicle-create']);
        Permission::create(['name' => 'vehicle-edit']);
        Permission::create(['name' => 'vehicle-delete']);

        // Customer
        Permission::create(['name' => 'customer-list']);
        Permission::create(['name' => 'customer-create']);
        Permission::create(['name' => 'customer-edit']);
        Permission::create(['name' => 'customer-delete']);
        // Contact/Type
        Permission::create(['name' => 'contact-type-list']);
        Permission::create(['name' => 'contact-type-create']);
        Permission::create(['name' => 'contact-type-edit']);
        Permission::create(['name' => 'contact-type-delete']);

        // Report
        Permission::create(['name' => 'report-list']);
        Permission::create(['name' => 'report-create']);
        Permission::create(['name' => 'report-edit']);
        Permission::create(['name' => 'report-delete']);

        // Website
        Permission::create(['name' => 'website-list']);
        Permission::create(['name' => 'website-create']);
        Permission::create(['name' => 'website-edit']);
        Permission::create(['name' => 'website-delete']);

        // User
        Permission::create(['name' => 'user-list']);
        Permission::create(['name' => 'user-create']);
        Permission::create(['name' => 'user-edit']);
        Permission::create(['name' => 'user-delete']);

        // User
        Permission::create(['name' => 'role-list']);
        Permission::create(['name' => 'role-create']);
        Permission::create(['name' => 'role-edit']);
        Permission::create(['name' => 'role-delete']);
    }
}
