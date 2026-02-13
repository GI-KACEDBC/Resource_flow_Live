<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained('users')->onDelete('cascade');
            $table->integer('percentage')->comment('Percentage contribution (e.g., 30, 40, 50)');
            $table->decimal('amount_value', 15, 2)->nullable()->comment('Financial value if request has monetary value');
            $table->enum('status', ['pending', 'committed'])->default('pending');
            $table->timestamps();
            
            // Ensure a supplier can only contribute once per request
            $table->unique(['request_id', 'supplier_id']);
            
            // Index for faster queries
            $table->index('request_id');
            $table->index('supplier_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contributions');
    }
};
