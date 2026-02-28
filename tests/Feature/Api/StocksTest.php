<?php

declare(strict_types=1);

use App\Models\Stock;

it('lists stocks with pagination', function () {
    Stock::factory()->count(5)->create();

    $response = $this->getJson('/api/v1/stocks');

    $response->assertOk()
        ->assertJsonStructure(['data', 'meta', 'links']);
});

it('shows a single stock', function () {
    $stock = Stock::factory()->create();

    $response = $this->getJson("/api/v1/stocks/{$stock->id}");

    $response->assertOk()
        ->assertJsonFragment(['ticker' => $stock->ticker]);
});

it('creates a stock with valid data', function () {
    $response = $this->postJson('/api/v1/stocks', [
        'ticker' => 'TEST',
        'name' => 'Test Corp',
    ]);

    $response->assertCreated()
        ->assertJsonFragment(['ticker' => 'TEST']);

    $this->assertDatabaseHas('stocks', ['ticker' => 'TEST']);
});

it('rejects a duplicate ticker', function () {
    Stock::factory()->create(['ticker' => 'DUPE']);

    $response = $this->postJson('/api/v1/stocks', [
        'ticker' => 'DUPE',
        'name' => 'Another Corp',
    ]);

    $response->assertUnprocessable();
});

it('updates a stock', function () {
    $stock = Stock::factory()->create(['name' => 'Old Name']);

    $response = $this->patchJson("/api/v1/stocks/{$stock->id}", ['name' => 'New Name']);

    $response->assertOk()
        ->assertJsonFragment(['name' => 'New Name']);
});

it('deletes a stock', function () {
    $stock = Stock::factory()->create();

    $this->deleteJson("/api/v1/stocks/{$stock->id}")->assertNoContent();

    $this->assertDatabaseMissing('stocks', ['id' => $stock->id]);
});

it('bulk updates stocks', function () {
    $stocks = Stock::factory()->count(3)->create();

    $response = $this->patchJson('/api/v1/stocks/bulk', [
        'stock_ids' => $stocks->pluck('id')->toArray(),
        'updates' => ['sector' => 'Technology'],
    ]);

    $response->assertOk()
        ->assertJsonFragment(['updated_count' => 3]);
});
