<?php

declare(strict_types=1);

namespace App\Observers;

use App\Contracts\ThesisExtractionServiceInterface;
use App\Models\Stock;
use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;

class StockObserver
{
    public function __construct(
        private OpenAIService $openAI,
        private ThesisExtractionServiceInterface $extractor,
    ) {}

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

        // Detect whether investment_thesis changed within the metadata JSON blob
        if ($stock->isDirty('metadata')) {
            $oldThesis = ($stock->getOriginal('metadata') ?? [])['investment_thesis'] ?? null;
            $newThesis = ($stock->metadata ?? [])['investment_thesis'] ?? null;

            if ($oldThesis !== $newThesis) {
                $stock->_thesisChanged = true;
            }
        }
    }

    public function created(Stock $stock): void
    {
        $this->generateEmbedding($stock);
        $this->extractThesisMetadata($stock);
    }

    public function updated(Stock $stock): void
    {
        $this->generateEmbedding($stock);

        if ($stock->_thesisChanged ?? false) {
            $stock->_thesisChanged = false;
            $this->extractThesisMetadata($stock);
        }
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

    private function extractThesisMetadata(Stock $stock): void
    {
        $thesis = $stock->getMetadataField('investment_thesis');

        if (! $thesis || ! trim((string) $thesis)) {
            return;
        }

        try {
            $extracted = $this->extractor->extract((string) $thesis);
            $extracted['extracted_at'] = now()->toIso8601String();
            $extracted['extraction_model'] = config('services.extraction.model', 'gpt-4o');

            $stock->withoutEvents(fn () => $stock->update(['thesis_metadata' => $extracted]));
        } catch (\Throwable $e) {
            Log::warning("Failed to extract thesis metadata for stock {$stock->id}: {$e->getMessage()}");
        }
    }
}
