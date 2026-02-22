<?php

use App\Http\Controllers\ImportController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberSearchController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockSearchController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('stocks/search', StockSearchController::class);
    Route::patch('stocks/bulk', [StockController::class, 'bulkUpdate']);
    Route::apiResource('stocks', StockController::class);

    Route::get('members/search', MemberSearchController::class);
    Route::post('members/embeddings', [MemberController::class, 'generateEmbeddings']);
    Route::apiResource('members', MemberController::class);

    Route::prefix('import')->group(function () {
        Route::post('upload',     [ImportController::class, 'upload']);
        Route::post('preview',    [ImportController::class, 'preview']);
        Route::post('execute',    [ImportController::class, 'execute']);
        Route::post('embeddings', [ImportController::class, 'embeddings']);
    });
});
