<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add paystack to payment_method and Project Funding/General Support to transaction_type.
     * Prevents hanging transactions when Paystack webhook or verifyPayment creates records.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL: convert enum to varchar (Laravel enums create check constraints)
            DB::statement('ALTER TABLE financials ALTER COLUMN payment_method TYPE VARCHAR(50) USING payment_method::text');
            DB::statement('ALTER TABLE financials ALTER COLUMN transaction_type TYPE VARCHAR(50) USING transaction_type::text');
        } elseif ($driver === 'sqlite') {
            // SQLite (phpunit): columns are already string-like; no MODIFY support.
        } else {
            // MySQL: modify enum columns
            DB::statement('ALTER TABLE financials MODIFY payment_method VARCHAR(50) NULL');
            DB::statement('ALTER TABLE financials MODIFY transaction_type VARCHAR(50) NOT NULL');
        }
    }

    public function down(): void
    {
        // Reverting would require data migration - leave as no-op for safety
    }
};
