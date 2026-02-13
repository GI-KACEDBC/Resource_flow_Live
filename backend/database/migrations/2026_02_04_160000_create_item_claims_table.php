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
        Schema::create('item_claims', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('project_item_id'); // Which item from project
            $table->unsignedBigInteger('supplier_inventory_id'); // Which inventory item
            $table->unsignedBigInteger('ngo_id'); // NGO claiming the item
            $table->integer('quantity_claimed');
            $table->string('status')->default('pending'); // pending, approved, rejected, fulfilled
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable(); // Supplier who approved
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('project_item_id')->references('id')->on('project_items')->onDelete('cascade');
            $table->foreign('supplier_inventory_id')->references('id')->on('supplier_inventory')->onDelete('cascade');
            $table->foreign('ngo_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->index('project_id');
            $table->index('ngo_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_claims');
    }
};
