<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['Goods', 'Monetary', 'Services']);
            $table->string('item');
            $table->decimal('quantity', 10, 2);
            $table->string('unit');
            $table->text('description')->nullable();
            $table->enum('status', ['Pending', 'Verified', 'Allocated', 'Delivered', 'Rejected'])->default('Pending');
            $table->date('date_received')->nullable();
            $table->foreignId('warehouse_id')->nullable()->constrained()->nullOnDelete();
            $table->string('colocation_facility')->nullable();
            $table->string('colocation_sub_location')->nullable();
            $table->decimal('value', 10, 2)->nullable();
            $table->decimal('market_price', 10, 2)->nullable();
            $table->enum('price_status', ['Estimated', 'Pending Review', 'Locked'])->default('Estimated');
            $table->decimal('audited_price', 10, 2)->nullable();
            $table->text('auditor_notes')->nullable();
            $table->foreignId('audited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->date('expiry_date')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('donations');
    }
};
