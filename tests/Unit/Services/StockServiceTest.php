<?php

declare(strict_types=1);

use App\Models\Stock;
use App\Services\StockService;

it('bulk updates core fields on the given stocks', function () {
    $stocks = Stock::factory()->count(3)->create(['sector' => 'Energy']);

    $service = new StockService;
    $result = $service->bulkUpdate(
        $stocks->pluck('id')->toArray(),
        ['sector' => 'Technology'],
    );

    expect($result)->toHaveCount(3);

    foreach ($stocks as $stock) {
        expect($stock->fresh()->sector)->toBe('Technology');
    }
});

it('returns only the matching stocks', function () {
    Stock::factory()->count(5)->create();
    $targets = Stock::factory()->count(2)->create();

    $service = new StockService;
    $result = $service->bulkUpdate(
        $targets->pluck('id')->toArray(),
        ['sector' => 'Materials'],
    );

    expect($result)->toHaveCount(2);
});
