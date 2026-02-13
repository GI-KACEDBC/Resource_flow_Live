<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\EnsureEmailIsVerified as Middleware;

class EnsureEmailIsVerified extends Middleware
{
    /**
     * The URIs that should be excluded from verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];
}

