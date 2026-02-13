<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::table('delivery_routes', function (Blueprint $table) {
            $table->foreignId('allocation_id')->nullable()->after('warehouse_id')->constrained('allocations')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('delivery_routes', function (Blueprint $table) {
            // SQLite doesn't support dropping foreign keys directly
            // Only drop foreign key if not using SQLite
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['allocation_id']);
            }
            $table->dropColumn('allocation_id');
        });
    }
};
