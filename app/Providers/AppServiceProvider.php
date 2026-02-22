<?php

namespace App\Providers;

use App\Models\Stock;
use App\Observers\StockObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Stock::observe(StockObserver::class);
    }
}
