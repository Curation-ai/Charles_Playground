<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Stock;
use Illuminate\Support\Collection;

class StockService
{
    public function bulkUpdate(array $stockIds, array $updates): Collection
    {
        $coreFieldKeys = array_keys(config('stock_fields.core_fields'));
        $metadataFieldKeys = array_keys(config('stock_fields.metadata_fields'));

        $coreUpdates = [];
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

            if (! empty($metadataUpdates)) {
                $data['metadata'] = array_merge($stock->metadata ?? [], $metadataUpdates);
            }

            if (! empty($data)) {
                $stock->update($data);
            }
        }

        return $stocks;
    }
}
