<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->decimal('remaining_quantity', 10, 2)->default(0)->after('quantity');
        });
        
        // Initialize remaining_quantity for existing donations
        // Set remaining_quantity = quantity for all donations
        DB::statement('UPDATE donations SET remaining_quantity = quantity WHERE remaining_quantity = 0 OR remaining_quantity IS NULL');
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropColumn('remaining_quantity');
        });
    }
};
