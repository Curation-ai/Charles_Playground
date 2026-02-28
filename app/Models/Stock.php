<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'ticker',
        'sector',
        'description',
        'notes',
        'tags',
        'price',
        'market_cap',
        'embedding',
        'metadata',
        'thesis_metadata',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'price' => 'decimal:2',
            'market_cap' => 'integer',
            'embedding' => 'array',
            'metadata' => 'array',
            'thesis_metadata' => 'array',
        ];
    }

    public function getEmbeddingText(): string
    {
        return implode(' ', array_filter([
            $this->name,
            $this->ticker,
            $this->sector,
            $this->getMetadataField('investment_thesis'),
            $this->description,
            $this->notes,
        ]));
    }

    public function getMetadataField(string $key, $default = null): mixed
    {
        return $this->metadata[$key] ?? $default;
    }

    public function setMetadataField(string $key, $value): void
    {
        $metadata = $this->metadata ?? [];
        $metadata[$key] = $value;
        $this->update(['metadata' => $metadata]);
    }

    public function getAllFields(): array
    {
        return array_merge(
            [
                'id' => $this->id,
                'name' => $this->name,
                'ticker' => $this->ticker,
                'sector' => $this->sector,
                'description' => $this->description,
                'notes' => $this->notes,
                'tags' => $this->tags,
                'price' => $this->price,
                'market_cap' => $this->market_cap,
            ],
            $this->metadata ?? []
        );
    }

    public static function getFieldsByCategory(): array
    {
        $grouped = [];

        foreach (config('stock_fields.core_fields') as $key => $config) {
            $category = $config['category'] ?? 'Basic';
            $grouped[$category][$key] = $config;
        }

        foreach (config('stock_fields.metadata_fields') as $key => $config) {
            $category = $config['category'] ?? 'Additional';
            $grouped[$category][$key] = $config;
        }

        return $grouped;
    }
}
