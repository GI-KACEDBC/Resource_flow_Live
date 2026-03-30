<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * NGO-estimated total + dual admin/auditor verification of the funding ceiling (GHS).
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('estimated_total_value', 15, 2)->nullable()->after('raised_amount');
            $table->decimal('verified_ceiling_ghs', 15, 2)->nullable()->after('estimated_total_value');
            $table->timestamp('admin_verified_value_at')->nullable()->after('verified_ceiling_ghs');
            $table->foreignId('admin_verified_value_by')->nullable()->after('admin_verified_value_at')->constrained('users')->nullOnDelete();
            $table->text('admin_value_notes')->nullable()->after('admin_verified_value_by');
            $table->timestamp('auditor_verified_value_at')->nullable()->after('admin_value_notes');
            $table->foreignId('auditor_verified_value_by')->nullable()->after('auditor_verified_value_at')->constrained('users')->nullOnDelete();
            $table->text('auditor_value_notes')->nullable()->after('auditor_verified_value_by');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['admin_verified_value_by']);
            $table->dropForeign(['auditor_verified_value_by']);
            $table->dropColumn([
                'estimated_total_value',
                'verified_ceiling_ghs',
                'admin_verified_value_at',
                'admin_verified_value_by',
                'admin_value_notes',
                'auditor_verified_value_at',
                'auditor_verified_value_by',
                'auditor_value_notes',
            ]);
        });
    }
};
