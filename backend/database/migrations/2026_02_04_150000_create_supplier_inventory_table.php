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
        Schema::create('supplier_inventory', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supplier_id');
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->string('category')->nullable(); // Education, Health, Food, etc.
            $table->integer('quantity_available');
            $table->integer('quantity_reserved')->default(0);
            $table->string('unit')->default('pieces');
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->string('condition')->default('new'); // new, used, refurbished
            $table->date('expiry_date')->nullable(); // For perishable items
            $table->string('status')->default('available'); // available, reserved, claimed, out_of_stock
            $table->json('specifications')->nullable(); // Additional item details
            $table->timestamps();
            
            $table->foreign('supplier_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('supplier_id');
            $table->index('status');
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_inventory');
    }
};
