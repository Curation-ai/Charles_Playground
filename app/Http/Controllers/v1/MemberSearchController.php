<?php

declare(strict_types=1);

namespace App\Http\Controllers\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MemberSearchRequest;
use App\Services\MemberSearchService;
use Illuminate\Http\JsonResponse;

class MemberSearchController extends Controller
{
    public function __construct(private MemberSearchService $searchService) {}

    public function __invoke(MemberSearchRequest $request): JsonResponse
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
