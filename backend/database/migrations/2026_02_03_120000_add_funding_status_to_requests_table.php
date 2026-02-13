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
            $table->enum('funding_status', ['unfunded', 'partially_funded', 'fully_funded'])
                  ->default('unfunded')
                  ->after('status')
                  ->comment('Funding status based on contribution percentages');
        });
        
        // Update existing requests based on their current status
        // If status is 'claimed', set funding_status to 'fully_funded'
        DB::statement("UPDATE requests SET funding_status = CASE 
            WHEN status = 'claimed' THEN 'fully_funded'
            WHEN status = 'approved' AND assigned_supplier_id IS NOT NULL THEN 'fully_funded'
            ELSE 'unfunded'
        END");
    }

    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn('funding_status');
        });
    }
};
