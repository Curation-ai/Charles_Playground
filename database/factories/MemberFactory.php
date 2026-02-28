<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    protected $model = Member::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional()->phoneNumber(),
            'linkedin_url' => fake()->optional()->url(),
            'twitter_handle' => fake()->optional()->userName(),
            'company' => fake()->optional()->company(),
            'job_title' => fake()->optional()->jobTitle(),
            'bio' => fake()->optional()->paragraph(),
            'tags' => fake()->optional()->randomElements(['value', 'growth', 'macro', 'crypto'], 2),
            'notes' => fake()->optional()->sentence(),
            'investor_type' => fake()->optional()->randomElement(['Retail', 'Professional', 'Analyst', 'Portfolio Manager', 'Fund Manager', 'VC / Angel', 'Sell-side']),
            'investment_focus' => fake()->optional()->randomElements(['UK Small Cap', 'Energy', 'Technology', 'Healthcare', 'Crypto'], 2),
            'location' => fake()->optional()->city(),
            'last_contact_date' => fake()->optional()->date(),
            'is_active' => true,
            'embedding' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function withEmbedding(): static
    {
        return $this->state(fn () => [
            'embedding' => array_map(fn () => fake()->randomFloat(6, -1, 1), range(0, 1535)),
        ]);
    }
}
