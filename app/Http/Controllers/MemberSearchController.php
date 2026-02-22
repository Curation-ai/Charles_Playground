<?php

namespace App\Http\Controllers;

use App\Services\MemberSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberSearchController extends Controller
{
    public function __construct(private MemberSearchService $searchService) {}

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'q'    => ['required', 'string', 'min:1'],
            'mode' => ['nullable', 'string', 'in:keyword,semantic,hybrid'],
        ]);

        $query = $request->query('q');
        $mode  = $request->query('mode', 'hybrid');

        $results = match ($mode) {
            'keyword'  => $this->searchService->keywordSearch($query),
            'semantic' => $this->searchService->semanticSearch($query),
            'hybrid'   => $this->hybridSearch($query),
        };

        return response()->json([
            'mode'    => $mode,
            'results' => $results->values(),
        ]);
    }

    private function hybridSearch(string $query): \Illuminate\Support\Collection
    {
        $semantic = $this->searchService->semanticSearch($query);
        $keyword  = $this->searchService->keywordSearch($query);

        $seenIds = $semantic->pluck('id')->toArray();

        $keywordOnly = $keyword->filter(fn ($member) => !in_array($member->id, $seenIds));

        return $semantic->concat($keywordOnly)->values();
    }
}
