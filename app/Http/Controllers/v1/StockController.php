<?php

declare(strict_types=1);

namespace App\Http\Controllers\v1;

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

class StockController extends Controller
{
    public function __construct(private StockService $stockService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Stock::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('ticker', 'LIKE', "%{$search}%");
            });
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
}
