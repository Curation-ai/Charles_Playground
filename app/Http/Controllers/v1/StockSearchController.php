<?php

declare(strict_types=1);

namespace App\Http\Controllers\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StockSearchRequest;
use App\Services\StockSearchService;
use Illuminate\Http\JsonResponse;

class StockSearchController extends Controller
{
    public function __construct(private StockSearchService $searchService) {}

    public function __invoke(StockSearchRequest $request): JsonResponse
    {
        $query = $request->query('q');
        $mode = $request->query('mode', 'hybrid');

        $results = match ($mode) {
            'keyword' => $this->searchService->keywordSearch($query),
            'semantic' => $this->searchService->semanticSearch($query),
            default => $this->searchService->hybridSearch($query),
        };

        return response()->json([
            'mode' => $mode,
            'results' => $results->values(),
        ]);
    }
}
