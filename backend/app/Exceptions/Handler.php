<?php

namespace App\Exceptions;

use App\Http\Requests\StoreDonationRequest;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });

        $this->renderable(function (QueryException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }
            if (! str_contains($e->getMessage(), 'SQLSTATE[22003]')
                || ! str_contains($e->getMessage(), 'overflow')) {
                return null;
            }

            $max = number_format(StoreDonationRequest::MAX_NUMERIC_10_2, 2);

            return response()->json([
                'message' => 'One or more values exceed the maximum allowed amount.',
                'errors' => [
                    'quantity' => [
                        "The amount or quantity exceeds the maximum allowed for this field ({$max}).",
                    ],
                ],
            ], 422);
        });
    }
}

