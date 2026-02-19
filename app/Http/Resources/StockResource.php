<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $metadataFieldKeys = array_keys(config('stock_fields.metadata_fields'));
        $metadata          = $this->metadata ?? [];

        // Flat structure: core fields + all defined metadata fields
        $data = [
            'id'                  => $this->id,
            'name'                => $this->name,
            'ticker'              => $this->ticker,
            'sector'              => $this->sector,
            'description'         => $this->description,
            'notes'               => $this->notes,
            'tags'                => $this->tags,
            'price'               => $this->price,
            'market_cap'          => $this->market_cap,
            'market_cap_formatted'=> $this->formatLargeNumber($this->market_cap),
            'created_at'          => $this->created_at?->toDateTimeString(),
            'updated_at'          => $this->updated_at?->toDateTimeString(),
        ];

        foreach ($metadataFieldKeys as $key) {
            $data[$key] = $metadata[$key] ?? null;
        }

        // Track which fields have values
        $coreFieldKeys   = array_keys(config('stock_fields.core_fields'));
        $allFieldKeys    = array_merge($coreFieldKeys, $metadataFieldKeys);
        $fieldsPopulated = [];

        foreach ($allFieldKeys as $key) {
            $value                  = $data[$key] ?? null;
            $fieldsPopulated[$key]  = $value !== null && $value !== '' && $value !== [];
        }

        $data['fields_populated'] = $fieldsPopulated;
        $data['has_embedding']    = !empty($this->embedding);

        // embedding and raw metadata are intentionally excluded
        return $data;
    }

    private function formatLargeNumber(?int $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return match (true) {
            $value >= 1_000_000_000_000 => number_format($value / 1_000_000_000_000, 2) . 'T',
            $value >= 1_000_000_000     => number_format($value / 1_000_000_000, 2) . 'B',
            $value >= 1_000_000         => number_format($value / 1_000_000, 2) . 'M',
            default                     => (string) $value,
        };
    }
}
