<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Stock;
use App\Traits\ComputesCosineSimilarity;
use Illuminate\Support\Collection;

class StockSearchService
{
    use ComputesCosineSimilarity;

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

    public function hybridSearch(string $query): Collection
    {
        $semantic = $this->semanticSearch($query);
        $keyword = $this->keywordSearch($query);

        $seenIds = $semantic->pluck('id')->toArray();

        $keywordOnly = $keyword->filter(fn (Stock $stock) => ! in_array($stock->id, $seenIds));

        return $semantic->concat($keywordOnly)->values();
    }
}
