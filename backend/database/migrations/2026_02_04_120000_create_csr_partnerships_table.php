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
        Schema::create('csr_partnerships', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('corporate_id'); // Corporate partner
            $table->unsignedBigInteger('ngo_id'); // NGO receiving funding
            $table->unsignedBigInteger('project_id'); // Project being funded
            $table->decimal('funding_amount', 15, 2);
            $table->string('funding_type')->default('one_time'); // one_time, recurring, milestone_based
            $table->json('milestones')->nullable(); // For milestone-based funding
            $table->string('status')->default('pending'); // pending, active, completed, cancelled
            $table->text('agreement_terms')->nullable();
            $table->json('impact_report')->nullable(); // Impact metrics from this partnership
            $table->timestamp('funding_date')->nullable();
            $table->timestamp('completion_date')->nullable();
            $table->timestamps();
            
            $table->foreign('corporate_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('ngo_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->index('corporate_id');
            $table->index('ngo_id');
            $table->index('project_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('csr_partnerships');
    }
};
