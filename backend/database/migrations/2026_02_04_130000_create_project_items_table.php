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
        Schema::create('project_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->integer('quantity_needed');
            $table->integer('quantity_received')->default(0);
            $table->string('unit')->default('pieces'); // pieces, kg, liters, etc.
            $table->decimal('estimated_value', 15, 2)->nullable();
            $table->string('status')->default('pending'); // pending, partially_fulfilled, fulfilled
            $table->timestamps();
            
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->index('project_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_items');
    }
};
