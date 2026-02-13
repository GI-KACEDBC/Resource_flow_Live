<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->boolean('is_flagged_for_review')->default(false)->after('expires_at');
            $table->timestamp('flagged_at')->nullable()->after('is_flagged_for_review');
        });
    }

    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn(['is_flagged_for_review', 'flagged_at']);
        });
    }
};
