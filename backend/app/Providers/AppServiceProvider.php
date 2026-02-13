<?php

namespace App\Providers;

use App\Models\Allocation;
use App\Models\DeliveryRoute;
use App\Models\Donation;
use App\Models\Logistic;
use App\Observers\DeliveryRouteObserver;
use App\Policies\AllocationPolicy;
use App\Policies\DeliveryRoutePolicy;
use App\Policies\DonationPolicy;
use App\Policies\LogisticPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     */
    protected $policies = [
        DeliveryRoute::class => DeliveryRoutePolicy::class,
        Donation::class => DonationPolicy::class,
        Allocation::class => AllocationPolicy::class,
        Logistic::class => LogisticPolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        // Register observers
        DeliveryRoute::observe(DeliveryRouteObserver::class);

        // Define custom rate limiters
        RateLimiter::for('uploads', function (Request $request) {
            // Allow 5 uploads per minute per user/IP
            // Uses authenticated user ID if available, otherwise falls back to IP address
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('uploads-multiple', function (Request $request) {
            // Stricter limit for multiple file uploads: 2 requests per minute
            return Limit::perMinute(2)->by($request->user()?->id ?: $request->ip());
        });
    }
}

