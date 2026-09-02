<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@agrorra.com'],
            [
                'name' => 'Admin Agrorra',
                'password' => 'admin12345',
                'role' => 'admin',
                'status' => 'aktif',
            ]
        );
    }
}
