<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verification_documents', function (Blueprint $table) {
            $table->timestamp('requester_submitted_at')->nullable()->after('notes');
            $table->timestamp('field_agent_verified_at')->nullable()->after('requester_submitted_at');
            $table->timestamp('admin_reviewed_at')->nullable()->after('field_agent_verified_at');
            $table->timestamp('supplier_uploaded_at')->nullable()->after('admin_reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('verification_documents', function (Blueprint $table) {
            $table->dropColumn([
                'requester_submitted_at',
                'field_agent_verified_at',
                'admin_reviewed_at',
                'supplier_uploaded_at',
            ]);
        });
    }
};
