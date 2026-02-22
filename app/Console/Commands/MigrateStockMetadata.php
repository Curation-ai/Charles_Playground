<?php

namespace App\Console\Commands;

use App\Models\Stock;
use Illuminate\Console\Command;

class MigrateStockMetadata extends Command
{
    protected $signature   = 'stocks:migrate-metadata';
    protected $description = 'Migrate old metadata fields to the new investment-focused schema';

    // Old fields that map to new fields
    private array $mappings = [
        'first_mentioned_by' => 'originated_by',
        'date_added'         => 'date_added',   // keep as-is
        'date_updated'       => 'last_reviewed',
    ];

    // Old fields with no equivalent — will be dropped
    private array $drops = [
        'stock_type',
        'commented_by',
        'exchange',
        'ceo',
        'employees',
        'website',
    ];

    public function handle(): int
    {
        $stocks = Stock::all();

        if ($stocks->isEmpty()) {
            $this->info('No stocks found. Nothing to migrate.');
            return self::SUCCESS;
        }

        $migrated = 0;
        $dropped  = 0;
        $skipped  = 0;

        $this->info("Migrating metadata for {$stocks->count()} stocks…");
        $this->newLine();

        foreach ($stocks as $stock) {
            $old = $stock->metadata ?? [];

            if (empty($old)) {
                $skipped++;
                continue;
            }

            $new = $stock->metadata ?? [];

            // Apply field mappings
            foreach ($this->mappings as $oldKey => $newKey) {
                if (array_key_exists($oldKey, $old) && $oldKey !== $newKey) {
                    // Only set new key if it doesn't already exist
                    if (!array_key_exists($newKey, $new)) {
                        $new[$newKey] = $old[$oldKey];
                    }
                    unset($new[$oldKey]);
                    $migrated++;
                }
            }

            // Drop unmapped old fields
            foreach ($this->drops as $key) {
                if (array_key_exists($key, $new)) {
                    unset($new[$key]);
                    $dropped++;
                }
            }

            // Save without triggering observer (avoid overwriting last_reviewed)
            $stock->withoutEvents(fn () => $stock->update(['metadata' => $new]));

            $this->line("  <fg=green>✓</> [{$stock->ticker}] {$stock->name}");
        }

        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Stocks processed', $stocks->count()],
                ['Fields migrated (renamed)',   $migrated],
                ['Fields dropped (unmapped)',   $dropped],
                ['Stocks skipped (no metadata)', $skipped],
            ]
        );

        $this->newLine();
        $this->info('Migration complete.');

        return self::SUCCESS;
    }
}
