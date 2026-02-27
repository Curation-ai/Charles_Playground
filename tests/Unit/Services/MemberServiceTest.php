<?php

declare(strict_types=1);

use App\Models\Member;
use App\Models\Stock;
use App\Services\MemberService;
use App\Services\OpenAIService;
use Mockery\MockInterface;

it('syncs originated stocks for a member', function () {
    $member = Member::factory()->create();
    $stocks = Stock::factory()->count(2)->create();

    $openAI = Mockery::mock(OpenAIService::class);
    $service = new MemberService($openAI);

    $links = $stocks->map(fn ($s) => ['stock_id' => $s->id, 'note' => null])->toArray();
    $service->syncOriginatedStocks($member, $links);

    expect($member->originatedStocks()->count())->toBe(2);
});

it('syncs commented stocks for a member', function () {
    $member = Member::factory()->create();
    $stocks = Stock::factory()->count(3)->create();

    $openAI = Mockery::mock(OpenAIService::class);
    $service = new MemberService($openAI);

    $links = $stocks->map(fn ($s) => ['stock_id' => $s->id, 'note' => 'interesting'])->toArray();
    $service->syncCommentedStocks($member, $links);

    expect($member->commentedStocks()->count())->toBe(3);
});

it('silently ignores embedding failures', function () {
    $member = Member::factory()->create(['bio' => 'A test bio.']);

    $openAI = Mockery::mock(OpenAIService::class, function (MockInterface $mock) {
        $mock->shouldReceive('generateEmbedding')->andThrow(new RuntimeException('API down'));
    });

    $service = new MemberService($openAI);

    expect(fn () => $service->generateEmbedding($member))->not->toThrow(RuntimeException::class);
    expect($member->fresh()->embedding)->toBeNull();
});
