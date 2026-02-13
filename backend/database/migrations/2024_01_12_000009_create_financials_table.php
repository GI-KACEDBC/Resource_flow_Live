<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::create('financials', function (Blueprint $table) {
            $table->id();
            $table->enum('transaction_type', ['Donation', 'Allocation', 'Expense', 'Refund']);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('donation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('allocation_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('GHS');
            $table->string('payment_reference')->nullable();
            $table->enum('payment_method', ['card', 'mobile_money', 'bank_transfer', 'cash'])->nullable();
            $table->enum('status', ['Pending', 'Completed', 'Failed', 'Refunded'])->default('Pending');
            $table->text('description')->nullable();
            $table->date('transaction_date');
            $table->timestamps();
            
            $table->index('transaction_type');
            $table->index('user_id');
            $table->index('transaction_date');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('financials');
    }
};
