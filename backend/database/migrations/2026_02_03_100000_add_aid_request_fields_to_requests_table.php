<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->string('aid_type')->nullable()->after('description'); // Education, Health, Infrastructure, Other
            $table->string('custom_aid_type')->nullable()->after('aid_type'); // Used if aid_type is 'Other'
            $table->enum('status', ['pending', 'approved', 'claimed', 'recede_requested', 'completed'])->default('pending')->after('custom_aid_type');
            $table->foreignId('assigned_supplier_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->json('supporting_documents')->nullable()->after('assigned_supplier_id'); // JSON array of file paths
        });
    }

    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['assigned_supplier_id']);
            }
            $table->dropColumn([
                'aid_type',
                'custom_aid_type',
                'status',
                'assigned_supplier_id',
                'supporting_documents',
            ]);
        });
    }
};
