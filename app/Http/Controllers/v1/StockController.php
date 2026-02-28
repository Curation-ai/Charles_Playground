<?php

declare(strict_types=1);

namespace App\Http\Controllers\v1;

use App\Contracts\ThesisExtractionServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\BulkUpdateStocksRequest;
use App\Http\Requests\StoreStockRequest;
use App\Http\Requests\UpdateStockRequest;
use App\Http\Resources\StockResource;
use App\Models\Stock;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;

class StockController extends Controller
{
    public function __construct(
        private StockService $stockService,
        private ThesisExtractionServiceInterface $extractor,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Stock::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('ticker', 'LIKE', "%{$search}%");
            });
        }

        if ($sector = $request->query('sector')) {
            $query->where('sector', $sector);
        }

        if ($ticker = $request->query('ticker')) {
            $query->whereRaw('LOWER(ticker) = ?', [strtolower($ticker)]);
        }

        if ($request->filled('has_thesis')) {
            $hasThesis = filter_var($request->query('has_thesis'), FILTER_VALIDATE_BOOLEAN);
            $hasThesis
                ? $query->whereNotNull(\DB::raw("JSON_EXTRACT(metadata, '$.investment_thesis')"))
                : $query->whereNull(\DB::raw("JSON_EXTRACT(metadata, '$.investment_thesis')"));
        }

        if ($request->filled('has_embedding')) {
            $hasEmbedding = filter_var($request->query('has_embedding'), FILTER_VALIDATE_BOOLEAN);
            $hasEmbedding ? $query->whereNotNull('embedding') : $query->whereNull('embedding');
        }

        if ($convictionLevel = $request->query('conviction_level')) {
            $query->whereRaw("JSON_EXTRACT(thesis_metadata, '$.conviction_level') = ?", [$convictionLevel]);
        }

        return StockResource::collection($query->paginate(20));
    }

    public function store(StoreStockRequest $request): StockResource
    {
        $stock = Stock::create($request->validated());

        return new StockResource($stock);
    }

    public function show(Stock $stock): StockResource
    {
        return new StockResource($stock);
    }

    public function update(UpdateStockRequest $request, Stock $stock): StockResource
    {
        $data = $request->validated();

        if (isset($data['metadata'])) {
            $data['metadata'] = array_merge($stock->metadata ?? [], $data['metadata']);
        }

        $stock->update($data);

        return new StockResource($stock->fresh());
    }

    public function destroy(Stock $stock): JsonResponse
    {
        $stock->delete();

        return response()->json(null, 204);
    }

    public function bulkUpdate(BulkUpdateStocksRequest $request): JsonResponse
    {
        $stocks = $this->stockService->bulkUpdate(
            $request->input('stock_ids'),
            $request->input('updates'),
        );

        return response()->json(['updated_count' => $stocks->count()]);
    }

    public function extractThesis(Stock $stock): StockResource
    {
        $thesis = $stock->getMetadataField('investment_thesis');

        if (! $thesis || ! trim((string) $thesis)) {
            return new StockResource($stock);
        }

        try {
            $extracted = $this->extractor->extract((string) $thesis);
            $extracted['extracted_at'] = now()->toIso8601String();
            $extracted['extraction_model'] = config('services.extraction.model', 'gpt-4o');

            $stock->withoutEvents(fn () => $stock->update(['thesis_metadata' => $extracted]));
        } catch (\Throwable $e) {
            Log::warning("Manual thesis extraction failed for stock {$stock->id}: {$e->getMessage()}");
        }

        return new StockResource($stock->fresh());
    }

    public function needsAttention(): AnonymousResourceCollection
    {
        $cutoff = now()->subDays(90)->toDateString();

        $query = Stock::where(function ($q) use ($cutoff) {
            $q->whereNull(\DB::raw("JSON_EXTRACT(metadata, '$.investment_thesis')"))
                ->orWhereNull('thesis_metadata')
                ->orWhereNull('embedding')
                ->orWhereRaw("JSON_EXTRACT(metadata, '$.last_reviewed') <= ?", [$cutoff]);
        });

        return StockResource::collection($query->paginate(50));
    }
}
