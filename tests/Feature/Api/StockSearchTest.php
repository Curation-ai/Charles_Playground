<?php

declare(strict_types=1);

use App\Models\Stock;
use App\Services\OpenAIService;

beforeEach(function () {
    $this->mock(OpenAIService::class, function ($mock) {
        $mock->shouldReceive('generateEmbedding')
            ->andReturn(array_fill(0, 1536, 0.1));
    });
});

it('requires the q parameter', function () {
    $this->getJson('/api/v1/stocks/search')->assertUnprocessable();
});

it('returns keyword search results', function () {
    Stock::factory()->create(['name' => 'Energy Corp', 'ticker' => 'ENRG']);
    Stock::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/stocks/search?q=Energy&mode=keyword');

    $response->assertOk()
        ->assertJsonFragment(['mode' => 'keyword'])
        ->assertJsonPath('results.0.name', 'Energy Corp');
});

it('returns semantic search results', function () {
    Stock::factory()->withEmbedding()->count(3)->create();

    $response = $this->getJson('/api/v1/stocks/search?q=technology&mode=semantic');

    $response->assertOk()
        ->assertJsonFragment(['mode' => 'semantic'])
        ->assertJsonStructure(['mode', 'results']);
});

it('returns hybrid search results', function () {
    Stock::factory()->withEmbedding()->count(3)->create();

    $response = $this->getJson('/api/v1/stocks/search?q=energy');

    $response->assertOk()
        ->assertJsonFragment(['mode' => 'hybrid']);
});
