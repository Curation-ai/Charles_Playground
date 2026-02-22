<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkUpdateStocksRequest;
use App\Http\Requests\StoreStockRequest;
use App\Http\Requests\UpdateStockRequest;
use App\Http\Resources\StockResource;
use App\Models\Stock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockController extends Controller
{
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
        return new StockResource($stock->load('originatingMembers', 'commentingMembers'));
    }

    public function update(UpdateStockRequest $request, Stock $stock): StockResource
    {
        $data = $request->validated();

        // Merge incoming metadata with existing so partial updates don't wipe other fields
        if (isset($data['metadata'])) {
            $data['metadata'] = array_merge($stock->metadata ?? [], $data['metadata']);
        }

        // Sync originating member links if provided
        if (array_key_exists('originating_member_links', $data)) {
            $syncData = [];
            foreach ($data['originating_member_links'] ?? [] as $link) {
                $syncData[$link['member_id']] = ['note' => $link['note'] ?? null];
            }
            $stock->originatingMembers()->sync($syncData);
            unset($data['originating_member_links']);
        }

        // Sync commenting member links if provided
        if (array_key_exists('commenting_member_links', $data)) {
            $syncData = [];
            foreach ($data['commenting_member_links'] ?? [] as $link) {
                $syncData[$link['member_id']] = ['note' => $link['note'] ?? null];
            }
            $stock->commentingMembers()->sync($syncData);
            unset($data['commenting_member_links']);
        }

        $stock->update($data);

        return new StockResource($stock->fresh()->load('originatingMembers', 'commentingMembers'));
    }

    public function destroy(Stock $stock): JsonResponse
    {
        $stock->delete();

        return response()->json(null, 204);
    }

    public function bulkUpdate(BulkUpdateStocksRequest $request): JsonResponse
    {
        $coreFieldKeys     = array_keys(config('stock_fields.core_fields'));
        $metadataFieldKeys = array_keys(config('stock_fields.metadata_fields'));

        $stockIds   = $request->input('stock_ids');
        $updates    = $request->input('updates');

        $coreUpdates     = [];
        $metadataUpdates = [];

        foreach ($updates as $field => $value) {
            if (in_array($field, $coreFieldKeys)) {
                $coreUpdates[$field] = $value;
            } elseif (in_array($field, $metadataFieldKeys)) {
                $metadataUpdates[$field] = $value;
            }
        }

        $stocks = Stock::whereIn('id', $stockIds)->get();

        foreach ($stocks as $stock) {
            $data = $coreUpdates;

            if (!empty($metadataUpdates)) {
                $data['metadata'] = array_merge($stock->metadata ?? [], $metadataUpdates);
            }

            if (!empty($data)) {
                $stock->update($data);
            }
        }

        return response()->json(['updated_count' => $stocks->count()]);
    }
}
