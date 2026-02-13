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
        Schema::create('impact_proofs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('field_agent_id'); // FIELD_AGENT who uploaded
            $table->string('proof_type'); // photo, video, document, note
            $table->string('file_path')->nullable(); // For photos/videos/documents
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 8)->nullable(); // Geo-tagging
            $table->decimal('longitude', 11, 8)->nullable(); // Geo-tagging
            $table->string('location_name')->nullable();
            $table->json('metadata')->nullable(); // Additional data (beneficiary count, etc.)
            $table->boolean('is_verified')->default(false); // Verified by AUDITOR
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('field_agent_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->index('project_id');
            $table->index('field_agent_id');
            $table->index('is_verified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('impact_proofs');
    }
};
