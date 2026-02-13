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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ngo_id'); // NGO that created the project
            $table->string('title');
            $table->text('description');
            $table->enum('need_type', ['funding', 'items', 'both'])->default('both');
            $table->json('sdg_goals'); // Array of SDG goal numbers [1, 3, 4, etc.]
            $table->decimal('budget', 15, 2)->nullable(); // Total budget needed
            $table->decimal('funded_amount', 15, 2)->default(0); // Amount funded so far
            $table->json('impact_metrics')->nullable(); // JSON: {lives_impacted: 1000, beneficiaries: {...}}
            $table->string('location')->nullable();
            $table->string('status')->default('active'); // active, completed, paused, cancelled
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->boolean('is_verified')->default(false); // Verified by AUDITOR
            $table->unsignedBigInteger('verified_by')->nullable(); // Auditor who verified
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            
            $table->foreign('ngo_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->index('ngo_id');
            $table->index('status');
            $table->index('is_verified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
