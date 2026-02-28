<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ThesisExtractionServiceInterface;
use App\Models\Stock;
use App\Observers\StockObserver;
use App\Services\Extraction\OpenAIExtractionService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ThesisExtractionServiceInterface::class, OpenAIExtractionService::class);
    }

    public function boot(): void
    {
        Stock::observe(StockObserver::class);
    }
}
