<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class TestController extends Controller
{
    public function checkUsers()
    {
        $users = User::all(['id', 'name', 'email', 'role', 'is_active']);
        return response()->json([
            'count' => $users->count(),
            'users' => $users,
        ]);
    }
}
