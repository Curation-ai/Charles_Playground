<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Stock;
use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;

class StockObserver
{
    public function __construct(private OpenAIService $openAI) {}

    public function creating(Stock $stock): void
    {
        $metadata = $stock->metadata ?? [];
        $metadata['date_added'] = now()->toDateString();
        $stock->metadata = $metadata;
    }

    public function updating(Stock $stock): void
    {
        $metadata = $stock->metadata ?? [];
        $metadata['last_reviewed'] = now()->toDateString();
        $stock->metadata = $metadata;
    }

    public function created(Stock $stock): void
    {
        $this->generateEmbedding($stock);
    }

    public function updated(Stock $stock): void
    {
        $this->generateEmbedding($stock);
    }

    private function generateEmbedding(Stock $stock): void
    {
        try {
            $embedding = $this->openAI->generateEmbedding($stock->getEmbeddingText());
            $stock->withoutEvents(fn () => $stock->update(['embedding' => $embedding]));
        } catch (\Throwable $e) {
            Log::warning("Failed to generate embedding for stock {$stock->id}: {$e->getMessage()}");
        }
    }
}
