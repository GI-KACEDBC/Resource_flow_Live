<?php

namespace App\Console\Commands;

use App\Models\Request;
use Illuminate\Console\Command;

class CloseUnmatchedRequestsCommand extends Command
{
    protected $signature = 'requests:close-unmatched {--days=30 : SLA days before closing}';
    protected $description = 'Set requests to closed_no_match when they exceed the SLA (default 30 days) without being matched';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $query = Request::whereIn('status', ['pending', 'approved'])
            ->where(function ($q) {
                $q->whereNull('assigned_supplier_id')
                    ->whereDoesntHave('contributions', fn ($q) => $q->where('status', 'committed'));
            })
            ->where(function ($q) use ($cutoff) {
                $q->where('created_at', '<', $cutoff)
                    ->orWhere('expires_at', '<', now());
            });

        $count = $query->count();

        if ($count === 0) {
            $this->info('No unmatched requests to close.');
            return Command::SUCCESS;
        }

        $query->update([
            'status' => 'closed_no_match',
            'updated_at' => now(),
        ]);

        $this->info("Closed {$count} unmatched request(s) exceeding {$days}-day SLA.");
        return Command::SUCCESS;
    }
}
