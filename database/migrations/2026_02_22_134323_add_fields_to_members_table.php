<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('investor_type')->nullable()->after('notes');
            $table->json('investment_focus')->nullable()->after('investor_type');
            $table->string('location')->nullable()->after('investment_focus');
            $table->date('last_contact_date')->nullable()->after('location');
            $table->boolean('is_active')->default(true)->after('last_contact_date');
            $table->json('embedding')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['investor_type', 'investment_focus', 'location', 'last_contact_date', 'is_active', 'embedding']);
        });
    }
};
