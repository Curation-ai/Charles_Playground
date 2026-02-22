<?php

namespace Database\Seeders;

use App\Models\Stock;
use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class EnrichedStockSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $path = base_path('scripts/enriched_stocks.json');

        if (!file_exists($path)) {
            $this->command->error("enriched_stocks.json not found at {$path}");
            return;
        }

        $stocks = json_decode(file_get_contents($path), true);
        $created = 0;
        $updated = 0;

        foreach ($stocks as $data) {
            $existing = Stock::where('ticker', $data['ticker'])->first();

            if ($existing) {
                $existing->update([
                    'name'   => $data['name'],
                    'sector' => $data['sector'],
                    'tags'   => $data['tags'],
                ]);
                $updated++;
            } else {
                Stock::create([
                    'name'   => $data['name'],
                    'ticker' => $data['ticker'],
                    'sector' => $data['sector'],
                    'tags'   => $data['tags'],
                ]);
                $created++;
            }
        }

        $this->command->info("Done — {$created} created, {$updated} updated.");
    }
}
