<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create or find the Admin user
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('@SslP1jivit'), // Or a more secure password
            ]
        );
      
        // 2. Create or find the Admin role
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
       
        $permissions = Permission::pluck('id','id')->all();
     
        $adminRole->syncPermissions($permissions);
       
        $adminUser->assignRole([$adminRole->id]);

        $this->command->info('Admin user seeded successfully!');
    }
}
