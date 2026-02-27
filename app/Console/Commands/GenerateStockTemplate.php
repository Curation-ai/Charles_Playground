<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateStockTemplate extends Command
{
    protected $signature = 'stocks:template';

    protected $description = 'Generate a CSV import template with all core and metadata fields';

    public function handle(): int
    {
        $coreFields = config('stock_fields.core_fields');
        $metadataFields = config('stock_fields.metadata_fields');
        $headers = array_merge(array_keys($coreFields), array_keys($metadataFields));

        $exampleRows = [
            [
                'Apple Inc.',
                'AAPL',
                'Technology',
                'Consumer electronics, software, and services company.',
                'Strong cash flow and dividend payer.',
                '189.30',
                '2950000000000',
                'mega-cap,dividend,sp500',
                'NASDAQ',
                'Tim Cook',
                '164000',
                'https://www.apple.com',
            ],
            [
                'Microsoft Corporation',
                'MSFT',
                'Technology',
                'Cloud computing and enterprise software.',
                'Azure growth driving revenue expansion.',
                '415.50',
                '3080000000000',
                'mega-cap,dividend,sp500',
                'NASDAQ',
                'Satya Nadella',
                '221000',
                'https://www.microsoft.com',
            ],
            [
                'ExxonMobil Corporation',
                'XOM',
                'Energy',
                'Multinational oil and gas corporation.',
                'Consistent dividend history over 40+ years.',
                '112.40',
                '450000000000',
                'dividend,sp500',
                'NYSE',
                'Darren Woods',
                '62000',
                'https://corporate.exxonmobil.com',
            ],
        ];

        // Build CSV content in memory then write via Storage
        $buffer = fopen('php://temp', 'r+');
        fputcsv($buffer, $headers);
        foreach ($exampleRows as $row) {
            fputcsv($buffer, $row);
        }
        rewind($buffer);
        $csv = stream_get_contents($buffer);
        fclose($buffer);

        Storage::put('templates/stocks_template.csv', $csv);

        $path = storage_path('app/templates/stocks_template.csv');
        $this->info("Template written to: {$path}");
        $this->newLine();
        $this->line('<fg=cyan>Fields:</>');

        foreach ($headers as $field) {
            $config = $coreFields[$field] ?? $metadataFields[$field];
            $required = ($config['required'] ?? false) ? '<fg=red>required</>' : 'optional';
            $bucket = array_key_exists($field, $coreFields) ? 'core' : 'metadata';
            $this->line("  {$field} ({$config['type']}, {$required}, {$bucket})");
        }

        $this->newLine();
        $this->info('Done. Import using: POST /api/v1/import/upload');

        return self::SUCCESS;
    }
}
