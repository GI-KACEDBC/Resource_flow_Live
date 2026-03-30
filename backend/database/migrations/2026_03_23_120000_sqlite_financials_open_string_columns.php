<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SQLite stores Laravel enums as VARCHAR + CHECK constraints. Allow paystack and new
     * transaction_type values in tests (phpunit sqlite) without MySQL MODIFY.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            return;
        }

        Schema::table('financials', function (Blueprint $table) {
            $table->string('payment_method', 50)->nullable()->change();
            $table->string('transaction_type', 50)->change();
        });
    }

    public function down(): void
    {
        //
    }
};
