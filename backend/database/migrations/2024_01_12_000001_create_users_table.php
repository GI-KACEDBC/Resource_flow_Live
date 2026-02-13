<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Create users table with full schema (consolidated).
     * Includes: verification, roles, reputation, password expiry, staff permissions.
     */
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->timestamp('password_changed_at')->nullable();
            $table->string('role', 50)->default('requestor');
            $table->json('permissions')->nullable();
            $table->string('custom_role_name', 100)->nullable();
            $table->string('organization')->nullable();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('ghana_card')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_blocked')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->integer('reputation_score')->default(0);
            $table->string('verification_status')->default('pending');
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
        });
        Schema::dropIfExists('users');
    }
};
