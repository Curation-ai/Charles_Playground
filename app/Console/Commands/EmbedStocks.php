<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Stock;
use App\Services\OpenAIService;
use Illuminate\Console\Command;

class EmbedStocks extends Command
{
    protected $signature = 'stocks:embed';

    protected $description = 'Generate OpenAI embeddings for all stocks that are missing one';

    public function handle(OpenAIService $openAI): int
    {
        $stocks = Stock::whereNull('embedding')->get();

        if ($stocks->isEmpty()) {
            $this->info('All stocks already have embeddings.');

            return self::SUCCESS;
        }

        $this->info("Generating embeddings for {$stocks->count()} stocks...");
        $bar = $this->output->createProgressBar($stocks->count());
        $bar->start();

        foreach ($stocks as $stock) {
            try {
                $embedding = $openAI->generateEmbedding($stock->getEmbeddingText());
                $stock->withoutEvents(fn () => $stock->update(['embedding' => $embedding]));
            } catch (\Throwable $e) {
                $this->newLine();
                $this->warn("Failed for {$stock->ticker}: {$e->getMessage()}");
            }

            $bar->advance();
            usleep(500_000); // 500ms delay between calls
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('Done.');

        return self::SUCCESS;
    }
}
