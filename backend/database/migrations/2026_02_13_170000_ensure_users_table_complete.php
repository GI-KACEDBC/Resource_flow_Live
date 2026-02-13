<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ensures users table has all required columns.
 * Safe for both fresh installs (no-op) and upgrades from older migrations.
 */
return new class extends Migration
{
    public function up(): void
    {
        $additions = [];

        if (!Schema::hasColumn('users', 'password_changed_at')) {
            $additions[] = fn (Blueprint $t) => $t->timestamp('password_changed_at')->nullable()->after('password');
        }
        if (!Schema::hasColumn('users', 'permissions')) {
            $additions[] = fn (Blueprint $t) => $t->json('permissions')->nullable()->after('role');
        }
        if (!Schema::hasColumn('users', 'custom_role_name')) {
            $additions[] = fn (Blueprint $t) => $t->string('custom_role_name', 100)->nullable()->after('permissions');
        }
        if (!Schema::hasColumn('users', 'ghana_card')) {
            $additions[] = fn (Blueprint $t) => $t->string('ghana_card')->nullable()->after('phone');
        }
        if (!Schema::hasColumn('users', 'is_verified')) {
            $additions[] = fn (Blueprint $t) => $t->boolean('is_verified')->default(false)->after('is_active');
        }
        if (!Schema::hasColumn('users', 'is_blocked')) {
            $additions[] = fn (Blueprint $t) => $t->boolean('is_blocked')->default(false)->after('is_verified');
        }
        if (!Schema::hasColumn('users', 'verified_at')) {
            $additions[] = fn (Blueprint $t) => $t->timestamp('verified_at')->nullable()->after('is_blocked');
        }
        if (!Schema::hasColumn('users', 'reputation_score')) {
            $additions[] = fn (Blueprint $t) => $t->integer('reputation_score')->default(0)->after('verified_at');
        }
        if (!Schema::hasColumn('users', 'verification_status')) {
            $additions[] = fn (Blueprint $t) => $t->string('verification_status')->default('pending')->after('reputation_score');
        }
        if (!Schema::hasColumn('users', 'verified_by')) {
            $additions[] = fn (Blueprint $t) => $t->unsignedBigInteger('verified_by')->nullable()->after('verification_status');
        }

        if (!empty($additions)) {
            Schema::table('users', function (Blueprint $table) use ($additions) {
                foreach ($additions as $add) {
                    $add($table);
                }
            });
        }

        if (Schema::hasColumn('users', 'verified_by')) {
            try {
                Schema::table('users', function (Blueprint $table) {
                    $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
                });
            } catch (\Illuminate\Database\QueryException $e) {
                // Foreign key may already exist
            }
        }
    }

    public function down(): void
    {
        // No down - this migration is additive for schema sync
    }
};
