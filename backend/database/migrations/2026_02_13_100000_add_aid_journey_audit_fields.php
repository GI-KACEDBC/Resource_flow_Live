<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Donations: link to specific aid request for targeted donations
        Schema::table('donations', function (Blueprint $table) {
            $table->foreignId('aid_request_id')->nullable()->after('user_id')->constrained('requests')->nullOnDelete();
        });

        // Requests: audit trail for Admin Review gate
        Schema::table('requests', function (Blueprint $table) {
            $table->timestamp('last_audited_at')->nullable()->after('admin_override');
            $table->foreignId('audited_by')->nullable()->after('last_audited_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropForeign(['aid_request_id']);
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['audited_by']);
            $table->dropColumn(['last_audited_at', 'audited_by']);
        });
    }
};
