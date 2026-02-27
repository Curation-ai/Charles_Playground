<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Stock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Stock>
 */
class StockFactory extends Factory
{
    protected $model = Stock::class;

    public function definition(): array
    {
        return [
            'ticker' => strtoupper(fake()->unique()->lexify('????')),
            'name' => fake()->company(),
            'description' => fake()->optional()->paragraph(),
            'sector' => fake()->optional()->randomElement(['Energy', 'Technology', 'Healthcare', 'Finance', 'Materials']),
            'tags' => fake()->optional()->randomElements(['growth', 'dividend', 'small-cap', 'value', 'momentum'], 2),
            'metadata' => null,
            'embedding' => null,
        ];
    }

    public function withEmbedding(): static
    {
        return $this->state(fn () => [
            'embedding' => array_map(fn () => fake()->randomFloat(6, -1, 1), range(0, 1535)),
        ]);
    }
}
