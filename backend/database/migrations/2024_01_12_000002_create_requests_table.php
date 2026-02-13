<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('need_type')->nullable();
            $table->string('time_sensitivity')->nullable();
            $table->string('recipient_type')->nullable();
            $table->integer('availability_gap')->nullable(); // percent 0-100
            $table->integer('admin_override')->default(0); // -3 to +3
            $table->float('urgency_score')->nullable();
            $table->string('urgency_level')->nullable();
            $table->json('urgency_calculation_log')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('requests');
    }
};
