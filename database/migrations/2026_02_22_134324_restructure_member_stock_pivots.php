<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('member_stock');

        Schema::create('member_originated_stocks', function (Blueprint $table) {
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('stock_id')->constrained('stocks')->cascadeOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->primary(['member_id', 'stock_id']);
        });

        Schema::create('member_commented_stocks', function (Blueprint $table) {
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('stock_id')->constrained('stocks')->cascadeOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->primary(['member_id', 'stock_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_originated_stocks');
        Schema::dropIfExists('member_commented_stocks');

        Schema::create('member_stock', function (Blueprint $table) {
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignId('stock_id')->constrained('stocks')->cascadeOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->primary(['member_id', 'stock_id']);
        });
    }
};
