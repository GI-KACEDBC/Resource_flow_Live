<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('delivery_routes', function (Blueprint $table) {
            $table->id();
            $table->string('route_name');
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('destination_region');
            $table->string('destination_city');
            $table->text('destination_address');
            $table->decimal('distance_km', 8, 2)->nullable();
            $table->integer('estimated_duration_minutes')->nullable();
            $table->enum('status', ['Scheduled', 'In Transit', 'Delivered', 'Cancelled'])->default('Scheduled');
            $table->date('scheduled_date');
            $table->date('actual_departure_date')->nullable();
            $table->date('actual_arrival_date')->nullable();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('vehicle_id')->nullable();
            $table->text('route_notes')->nullable();
            $table->timestamps();
            
            $table->index('warehouse_id');
            $table->index('status');
            $table->index('scheduled_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('delivery_routes');
    }
};
