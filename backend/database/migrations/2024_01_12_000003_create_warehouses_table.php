<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city');
            $table->string('region');
            $table->string('address');
            $table->decimal('capacity', 10, 2);
            $table->string('capacity_unit')->default('m²');
            $table->string('manager');
            $table->string('contact_phone');
            $table->string('contact_email');
            $table->enum('status', ['Active', 'Full', 'Maintenance', 'Inactive'])->default('Active');
            $table->decimal('current_occupancy', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('warehouses');
    }
};
