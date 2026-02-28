<?php

declare(strict_types=1);

use App\Models\Member;
use App\Services\OpenAIService;

beforeEach(function () {
    $this->mock(OpenAIService::class, function ($mock) {
        $mock->shouldReceive('generateEmbedding')
            ->andReturn(array_fill(0, 1536, 0.1));
    });
});

it('requires the q parameter', function () {
    $this->getJson('/api/v1/members/search')->assertUnprocessable();
});

it('returns keyword search results', function () {
    Member::factory()->create(['name' => 'Alice Investor', 'bio' => 'UK small cap specialist.']);
    Member::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/members/search?q=Alice&mode=keyword');

    $response->assertOk()
        ->assertJsonFragment(['mode' => 'keyword']);
});

it('returns semantic search results', function () {
    Member::factory()->withEmbedding()->count(3)->create();

    $response = $this->getJson('/api/v1/members/search?q=energy investor&mode=semantic');

    $response->assertOk()
        ->assertJsonFragment(['mode' => 'semantic'])
        ->assertJsonStructure(['mode', 'results']);
});

it('returns hybrid search results by default', function () {
    Member::factory()->withEmbedding()->count(3)->create();

    $response = $this->getJson('/api/v1/members/search?q=investor');

    $response->assertOk()
        ->assertJsonFragment(['mode' => 'hybrid']);
});
