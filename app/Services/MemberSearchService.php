<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Support\Collection;

class MemberSearchService
{
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

    private function cosineSimilarity(array $a, array $b): float
    {
        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0, $len = count($a); $i < $len; $i++) {
            $dotProduct += $a[$i] * $b[$i];
            $normA += $a[$i] * $a[$i];
            $normB += $b[$i] * $b[$i];
        }

        $denominator = sqrt($normA) * sqrt($normB);

        if ($denominator === 0.0) {
            return 0.0;
        }

        return $dotProduct / $denominator;
    }
}
