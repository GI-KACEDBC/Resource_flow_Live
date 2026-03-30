<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Paystack transaction reference from initialize — used to match charge.success webhooks
     * when custom metadata is missing or altered in edge cases.
     */
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->string('paystack_reference', 191)->nullable()->after('status');
            $table->index('paystack_reference');
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropIndex(['paystack_reference']);
            $table->dropColumn('paystack_reference');
        });
    }
};
