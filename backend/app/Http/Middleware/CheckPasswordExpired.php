<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPasswordExpired
{
    /**
     * Block access if the user's password has expired (30 days).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        if ($user->isPasswordExpired()) {
            return response()->json([
                'message' => 'Your password has expired. Please change it to continue.',
                'error_code' => 'PASSWORD_EXPIRED',
                'requires_password_change' => true,
            ], 403);
        }

        return $next($request);
    }
}
