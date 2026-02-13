<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds region, quantity_required, unit, expires_at, and closed_no_match/cancelled status support.
     */
    public function up(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->string('region', 100)->nullable()->after('recipient_type');
            $table->decimal('quantity_required', 15, 2)->nullable()->after('availability_gap');
            $table->string('unit', 50)->nullable()->after('quantity_required');
            $table->timestamp('expires_at')->nullable()->after('updated_at');
        });

        // Extend status to support closed_no_match and cancelled
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check");
            DB::statement("ALTER TABLE requests ALTER COLUMN status TYPE VARCHAR(50)");
            DB::statement("ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK (status IN ('pending', 'approved', 'claimed', 'recede_requested', 'completed', 'closed_no_match', 'cancelled'))");
        } else {
            DB::statement("ALTER TABLE requests MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropColumn(['region', 'quantity_required', 'unit', 'expires_at']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check");
            DB::statement("ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK (status IN ('pending', 'approved', 'claimed', 'recede_requested', 'completed'))");
        } else {
            DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'claimed', 'recede_requested', 'completed') DEFAULT 'pending'");
        }
    }
};
