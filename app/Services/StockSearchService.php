<?php

namespace App\Services;

use App\Models\Stock;
use Illuminate\Support\Collection;

class StockSearchService
{
    public function __construct(private OpenAIService $openAI) {}

    public function keywordSearch(string $query): Collection
    {
        return Stock::where('name', 'LIKE', "%{$query}%")
            ->orWhere('ticker', 'LIKE', "%{$query}%")
            ->limit(20)
            ->get();
    }

    public function semanticSearch(string $query): Collection
    {
        $queryEmbedding = $this->openAI->generateEmbedding($query);

        $stocks = Stock::whereNotNull('embedding')->get();

        return $stocks->map(function (Stock $stock) use ($queryEmbedding) {
            $similarity = $this->cosineSimilarity($queryEmbedding, $stock->embedding);
            $stock->setAttribute('similarity', round($similarity, 4));
            return $stock;
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
