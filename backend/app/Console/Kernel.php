<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Fix #20: Update expired donations daily at midnight
        $schedule->call(function () {
            \App\Models\Donation::where('expiry_date', '<', now())
                ->where('status', '!=', 'Delivered')
                ->where('status', '!=', 'Unavailable')
                ->update(['status' => 'Unavailable']);
        })->daily();

        // Handle expired aid requests: mark as closed_no_match if still pending/approved
        $schedule->call(function () {
            \App\Models\Request::whereNotNull('expires_at')
                ->where('expires_at', '<=', now())
                ->whereIn('status', ['pending', 'approved'])
                ->update(['status' => 'closed_no_match']);
        })->daily();

        // Flag unmatched requests for monthly admin review (replaces auto-close)
        $schedule->command('requests:flag-unmatched')->monthlyOn(1, '01:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

