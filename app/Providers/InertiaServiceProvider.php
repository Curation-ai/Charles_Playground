<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class InertiaServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Inertia::version(fn () => md5_file(public_path('hot') ?: public_path('build/manifest.json')));

        Inertia::share([
            'app' => [
                'name' => config('app.name'),
            ],
        ]);
    }
}
