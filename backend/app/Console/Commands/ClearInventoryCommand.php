<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Removes seeded logistics/inventory rows (donations, allocations, routes, trips)
 * so you can load fresh inventory. Does not remove users, warehouses, or NGOs.
 */
class ClearInventoryCommand extends Command
{
    protected $signature = 'inventory:clear
                            {--force : Required in production}
                            {--supplier-inventory : Also truncate supplier_inventory and item_claims}
                            {--with-demo-requests : Delete demo aid requests (known demo titles)}';

    protected $description = 'Clear donations, allocations, logistics, delivery routes, trips, and related financial rows';

    /** @var list<string> */
    private const DEMO_REQUEST_TITLES = [
        'Emergency Food Relief - Northern Region (Logistics Test)',
        'Medical Supplies - Ashanti (Completed Trip)',
    ];

    public function handle(): int
    {
        if (app()->environment('production') && ! $this->option('force')) {
            $this->error('Refusing to run in production without --force.');

            return Command::FAILURE;
        }

        if (! $this->confirm('This will delete donations, allocations, logistics, routes, trips, and matching financial rows. Continue?', true)) {
            $this->info('Aborted.');

            return Command::SUCCESS;
        }

        $counts = [];

        DB::transaction(function () use (&$counts) {
            if (Schema::hasTable('delivery_proofs')) {
                $counts['delivery_proofs'] = DB::table('delivery_proofs')->delete();
            }
            if (Schema::hasTable('trips')) {
                $counts['trips'] = DB::table('trips')->delete();
            }
            if (Schema::hasTable('logistics')) {
                $counts['logistics'] = DB::table('logistics')->delete();
            }

            if (Schema::hasTable('financials')) {
                $counts['financials'] = DB::table('financials')
                    ->where(function ($q) {
                        $q->whereNotNull('donation_id')
                            ->orWhereNotNull('allocation_id');
                    })
                    ->delete();
            }

            if (Schema::hasTable('allocations')) {
                $counts['allocations'] = DB::table('allocations')->delete();
            }
            if (Schema::hasTable('donations')) {
                $counts['donations'] = DB::table('donations')->delete();
            }
            if (Schema::hasTable('delivery_routes')) {
                $counts['delivery_routes'] = DB::table('delivery_routes')->delete();
            }

            if ($this->option('supplier-inventory')) {
                if (Schema::hasTable('item_claims')) {
                    $counts['item_claims'] = DB::table('item_claims')->delete();
                }
                if (Schema::hasTable('supplier_inventory')) {
                    $counts['supplier_inventory'] = DB::table('supplier_inventory')->delete();
                }
            }

            if ($this->option('with-demo-requests') && Schema::hasTable('requests')) {
                $counts['requests_demo'] = DB::table('requests')
                    ->whereIn('title', self::DEMO_REQUEST_TITLES)
                    ->delete();
            }
        });

        foreach ($counts as $table => $n) {
            $this->line(sprintf('  %s: %d row(s) removed', $table, $n));
        }

        $this->info('Inventory data cleared. Add new inventory through the application.');

        return Command::SUCCESS;
    }
}
