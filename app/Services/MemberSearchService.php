<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Member;
use App\Traits\ComputesCosineSimilarity;
use Illuminate\Support\Collection;

class MemberSearchService
{
    use ComputesCosineSimilarity;

    public function __construct(private OpenAIService $openAI) {}

    public function keywordSearch(string $query): Collection
    {
        return Member::where('name', 'LIKE', "%{$query}%")
            ->orWhere('company', 'LIKE', "%{$query}%")
            ->orWhere('job_title', 'LIKE', "%{$query}%")
            ->orWhere('bio', 'LIKE', "%{$query}%")
            ->limit(20)
            ->get();
    }

    public function semanticSearch(string $query): Collection
    {
        $queryEmbedding = $this->openAI->generateEmbedding($query);

        $members = Member::whereNotNull('embedding')->get();

        return $members->map(function (Member $member) use ($queryEmbedding) {
            $similarity = $this->cosineSimilarity($queryEmbedding, $member->embedding);
            $member->setAttribute('similarity', round($similarity, 4));

            return $member;
        })
            ->sortByDesc('similarity')
            ->take(10)
            ->values();
    }

    public function hybridSearch(string $query): Collection
    {
        $semantic = $this->semanticSearch($query);
        $keyword = $this->keywordSearch($query);

        $seenIds = $semantic->pluck('id')->toArray();

        $keywordOnly = $keyword->filter(fn (Member $member) => ! in_array($member->id, $seenIds));

        return $semantic->concat($keywordOnly)->values();
    }
}
