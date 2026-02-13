<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verification_documents', function (Blueprint $table) {
            $table->string('qoreid_request_id')->nullable()->after('notes');
            $table->timestamp('qoreid_verified_at')->nullable()->after('qoreid_request_id');
            $table->text('qoreid_photo')->nullable()->after('qoreid_verified_at'); // Base64 for admin manual verification
        });
    }

    public function down(): void
    {
        Schema::table('verification_documents', function (Blueprint $table) {
            $table->dropColumn(['qoreid_request_id', 'qoreid_verified_at', 'qoreid_photo']);
        });
    }
};
