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
        // Vehicle class
        Permission::create(['name' => 'class-list']);
        Permission::create(['name' => 'class-create']);
        Permission::create(['name' => 'class-edit']);
        Permission::create(['name' => 'class-delete']);
        // Vehicle status
        Permission::create(['name' => 'status-list']);
        Permission::create(['name' => 'status-create']);
        Permission::create(['name' => 'status-edit']);
        Permission::create(['name' => 'status-delete']);
        // Vehicle maker
        Permission::create(['name' => 'maker-list']);
        Permission::create(['name' => 'maker-create']);
        Permission::create(['name' => 'maker-edit']);
        Permission::create(['name' => 'maker-delete']);
        // Vehicle model
        Permission::create(['name' => 'model-list']);
        Permission::create(['name' => 'model-create']);
        Permission::create(['name' => 'model-edit']);
        Permission::create(['name' => 'model-delete']);

        // Customer
        Permission::create(['name' => 'customer-list']);
        Permission::create(['name' => 'customer-create']);
        Permission::create(['name' => 'customer-edit']);
        Permission::create(['name' => 'customer-delete']);

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

        // Role
        Permission::create(['name' => 'role-list']);
        Permission::create(['name' => 'role-create']);
        Permission::create(['name' => 'role-edit']);
        Permission::create(['name' => 'role-delete']);

        // Type
        Permission::create(['name' => 'type-list']);
        Permission::create(['name' => 'type-create']);
        Permission::create(['name' => 'type-edit']);
        Permission::create(['name' => 'type-delete']);
        
        $this->command->info('User roles and permissions seeded successfully!');
    }
}
