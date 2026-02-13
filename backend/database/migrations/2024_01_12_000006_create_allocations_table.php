<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('donation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('allocated_by')->constrained('users')->cascadeOnDelete();
            $table->decimal('quantity_allocated', 10, 2);
            $table->enum('status', ['Pending', 'Approved', 'In Transit', 'Delivered', 'Cancelled'])->default('Pending');
            $table->text('notes')->nullable();
            $table->date('allocated_date');
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();
            $table->timestamps();
            
            $table->index('request_id');
            $table->index('donation_id');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('allocations');
    }
};
