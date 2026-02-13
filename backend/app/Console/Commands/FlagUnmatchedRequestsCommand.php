<?php

namespace App\Console\Commands;

use App\Models\Request;
use App\Models\User;
use App\Notifications\MonthlySummaryNotification;
use Illuminate\Console\Command;

class FlagUnmatchedRequestsCommand extends Command
{
    protected $signature = 'requests:flag-unmatched {--days=30 : SLA days before flagging}';
    protected $description = 'Flag pending/approved requests older than 30 days (no supplier/contribution) for monthly admin review';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $query = Request::whereIn('status', ['pending', 'approved'])
            ->where('is_flagged_for_review', false)
            ->where(function ($q) {
                $q->whereNull('assigned_supplier_id')
                    ->whereDoesntHave('contributions', fn ($q) => $q->where('status', 'committed'));
            })
            ->where('created_at', '<', $cutoff);

        $requests = $query->get();
        $count = $requests->count();

        if ($count === 0) {
            $this->info('No unmatched requests to flag.');
            return Command::SUCCESS;
        }

        $query->update([
            'is_flagged_for_review' => true,
            'flagged_at' => now(),
            'updated_at' => now(),
        ]);

        $this->info("Flagged {$count} unmatched request(s) exceeding {$days}-day SLA.");

        $admins = User::where('role', 'admin')->where('is_active', true)->get();
        foreach ($admins as $admin) {
            $admin->notify(new MonthlySummaryNotification($count));
        }
        $this->info('Notification sent to ' . $admins->count() . ' admin(s).');

        return Command::SUCCESS;
    }
}
