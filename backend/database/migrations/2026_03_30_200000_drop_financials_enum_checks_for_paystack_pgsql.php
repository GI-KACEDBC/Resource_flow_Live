<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Laravel enum() on PostgreSQL creates CHECK constraints (e.g. financials_payment_method_check).
     * ALTER COLUMN ... TYPE VARCHAR may not remove them in all cases, so inserts with
     * payment_method = paystack still fail. Drop constraints and ensure open VARCHAR columns.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE financials DROP CONSTRAINT IF EXISTS financials_payment_method_check');
        DB::statement('ALTER TABLE financials DROP CONSTRAINT IF EXISTS financials_transaction_type_check');

        DB::statement('ALTER TABLE financials ALTER COLUMN payment_method TYPE VARCHAR(50) USING payment_method::text');
        DB::statement('ALTER TABLE financials ALTER COLUMN transaction_type TYPE VARCHAR(50) USING transaction_type::text');
    }

    public function down(): void
    {
        // No-op: re-adding enum checks could break existing paystack rows
    }
};
