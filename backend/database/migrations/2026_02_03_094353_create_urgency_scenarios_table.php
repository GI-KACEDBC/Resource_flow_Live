<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('urgency_scenarios', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // Unique identifier for the scenario (e.g., 'medical_disaster')
            $table->string('name'); // Display name (e.g., 'Medical Emergency in Disaster Zone')
            $table->text('description')->nullable(); // Description of the scenario
            $table->json('factors'); // JSON object containing urgency calculation factors:
                                     // - need_type
                                     // - time_sensitivity
                                     // - recipient_type
                                     // - availability_gap
                                     // - admin_override
            $table->timestamps();
            
            // Index for faster lookups
            $table->index('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('urgency_scenarios');
    }
};
