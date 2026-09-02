<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class ManagerUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'manager@agrorra.com'],
            [
                'name' => 'Manager Agrorra',
                'password' => 'manager12345',
                'role' => 'manager',
                'status' => 'aktif',
            ]
        );
    }
}
