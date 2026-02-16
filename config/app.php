<?php

return [
    'name' => env('APP_NAME', 'Laravel'),
    'env' => env('APP_ENV', 'production'),
    'debug' => env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'UTC',
    'providers' => [
        App\Providers\RouteServiceProvider::class,
        App\Providers\InertiaServiceProvider::class,
    ],
];
