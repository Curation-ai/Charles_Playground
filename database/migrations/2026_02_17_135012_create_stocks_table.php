<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('ticker')->unique();
            $table->string('sector')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            $table->decimal('price', 15, 2)->nullable();
            $table->bigInteger('market_cap')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
