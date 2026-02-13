<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('logistics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_route_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['Scheduled', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'])->default('Scheduled');
            $table->string('tracking_number')->unique();
            $table->decimal('estimated_value', 10, 2)->nullable();
            $table->text('delivery_notes')->nullable();
            $table->json('location_updates')->nullable(); // GPS tracking data
            $table->timestamp('last_location_update')->nullable();
            $table->timestamps();
            
            $table->index('allocation_id');
            $table->index('delivery_route_id');
            $table->index('tracking_number');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('logistics');
    }
};
