<?php

declare(strict_types=1);

use App\Http\Controllers\v1\ImportController;
use App\Http\Controllers\v1\MemberController;
use App\Http\Controllers\v1\MemberSearchController;
use App\Http\Controllers\v1\StockController;
use App\Http\Controllers\v1\StockSearchController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Stocks
    Route::get('stocks/search', StockSearchController::class);
    Route::patch('stocks/bulk', [StockController::class, 'bulkUpdate']);
    Route::apiResource('stocks', StockController::class);

    // Members
    Route::get('members/search', MemberSearchController::class);
    Route::post('members/embeddings', [MemberController::class, 'generateEmbeddings']);
    Route::apiResource('members', MemberController::class);

    // Import
    Route::prefix('import')->group(function () {
        Route::post('upload', [ImportController::class, 'upload']);
        Route::post('preview', [ImportController::class, 'preview']);
        Route::post('execute', [ImportController::class, 'execute']);
        Route::post('embeddings', [ImportController::class, 'embeddings']);
    });
});
