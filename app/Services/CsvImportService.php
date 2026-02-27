<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Stock;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CsvImportService
{
    public function __construct(private OpenAIService $openAI) {}

    /**
     * Parse a CSV file into headers + rows.
     * Returns: ['headers' => [...], 'rows' => [[col => val, ...], ...]]
     */
    public function parseFile(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if (! $handle) {
            throw new RuntimeException('Could not open CSV file.');
        }

        $headers = null;
        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if ($headers === null) {
                $headers = array_map('trim', $line);

                continue;
            }

            // Skip rows that don't match header column count
            if (count($line) !== count($headers)) {
                continue;
            }

            $rows[] = array_combine($headers, array_map('trim', $line));
        }

        fclose($handle);

        if (empty($headers)) {
            throw new RuntimeException('CSV file is empty or has no headers.');
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
        ];
    }

    /**
     * Validate raw CSV data against a column mapping.
     *
     * $columnMapping: ['CSV Column Name' => 'stock_field_name', ...]
     *
     * Returns: ['valid' => [mapped rows...], 'errors' => [string messages...]]
     */
    public function validateData(array $data, array $columnMapping): array
    {
        $coreFields = config('stock_fields.core_fields');
        $metadataFields = config('stock_fields.metadata_fields');
        $allFields = array_merge($coreFields, $metadataFields);

        $requiredFields = array_keys(array_filter($allFields, fn ($f) => $f['required']));

        $valid = [];
        $errors = [];
        $seenTickers = [];

        foreach ($data['rows'] as $index => $row) {
            $rowNumber = $index + 2; // Row 1 is the header
            $rowErrors = [];

            // Apply column mapping: CSV column name => stock field name
            $mappedRow = [];
            foreach ($columnMapping as $csvColumn => $stockField) {
                if (array_key_exists($csvColumn, $row) && $row[$csvColumn] !== '') {
                    $mappedRow[$stockField] = $row[$csvColumn];
                }
            }

            // Check required fields
            foreach ($requiredFields as $field) {
                if (empty($mappedRow[$field])) {
                    $rowErrors[] = "Row {$rowNumber}: Required field '{$field}' is missing or empty.";
                }
            }

            // Normalise ticker and check for duplicates within the CSV
            if (! empty($mappedRow['ticker'])) {
                $ticker = strtoupper(trim($mappedRow['ticker']));
                if (in_array($ticker, $seenTickers)) {
                    $rowErrors[] = "Row {$rowNumber}: Duplicate ticker '{$ticker}' found in CSV.";
                } else {
                    $seenTickers[] = $ticker;
                }
                $mappedRow['ticker'] = $ticker;
            }

            // Type validation
            foreach ($mappedRow as $field => $value) {
                $fieldConfig = $allFields[$field] ?? null;
                if (! $fieldConfig) {
                    continue;
                }

                $typeError = $this->validateType($field, $value, $fieldConfig['type'], $rowNumber);
                if ($typeError) {
                    $rowErrors[] = $typeError;
                }
            }

            if (empty($rowErrors)) {
                $valid[] = $mappedRow;
            } else {
                $errors = array_merge($errors, $rowErrors);
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors,
        ];
    }

    /**
     * Import validated (already-mapped) rows into the database.
     * Upserts on ticker. Core fields go to columns; metadata fields go to the
     * metadata JSON column. Merges with existing metadata so nothing is lost.
     *
     * Returns: ['created' => n, 'updated' => n, 'skipped' => n, 'stock_ids' => [...]]
     */
    public function importData(array $validatedData, array $columnMapping): array
    {
        $coreFieldKeys = array_keys(config('stock_fields.core_fields'));
        $metadataFieldKeys = array_keys(config('stock_fields.metadata_fields'));

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $stockIds = [];

        foreach ($validatedData as $row) {
            if (empty($row['ticker'])) {
                $skipped++;

                continue;
            }

            $coreData = [];
            $metadataData = [];

            foreach ($row as $field => $value) {
                if ($value === '' || $value === null) {
                    continue;
                }

                if (in_array($field, $coreFieldKeys)) {
                    $type = config("stock_fields.core_fields.{$field}.type");
                    $coreData[$field] = $this->castValue($value, $type);
                } elseif (in_array($field, $metadataFieldKeys)) {
                    $type = config("stock_fields.metadata_fields.{$field}.type");
                    $metadataData[$field] = $this->castValue($value, $type);
                }
            }

            // Preserve existing metadata fields not present in this import
            $existing = Stock::where('ticker', $coreData['ticker'])->first();
            if ($existing && ! empty($existing->metadata)) {
                $metadataData = array_merge($existing->metadata, $metadataData);
            }

            if (! empty($metadataData)) {
                $coreData['metadata'] = $metadataData;
            }

            $stock = Stock::updateOrCreate(
                ['ticker' => $coreData['ticker']],
                $coreData
            );

            $stockIds[] = $stock->id;

            $stock->wasRecentlyCreated ? $created++ : $updated++;
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'stock_ids' => $stockIds,
        ];
    }

    /**
     * Generate OpenAI embeddings for the given stock IDs.
     * Includes a 500ms delay between calls to respect rate limits.
     *
     * $progress callable signature: function(int $current, int $total, Stock $stock): void
     */
    public function generateEmbeddings(array $stockIds, ?callable $progress = null): void
    {
        $stocks = Stock::whereIn('id', $stockIds)->get();
        $total = $stocks->count();
        $done = 0;

        foreach ($stocks as $stock) {
            try {
                $embedding = $this->openAI->generateEmbedding($stock->getEmbeddingText());
                $stock->withoutEvents(fn () => $stock->update(['embedding' => $embedding]));
            } catch (\Throwable $e) {
                Log::warning("CsvImport: failed embedding for {$stock->ticker}: {$e->getMessage()}");
            }

            $done++;

            if ($progress) {
                $progress($done, $total, $stock);
            }

            if ($done < $total) {
                usleep(500_000); // 500ms between calls
            }
        }
    }

    // -------------------------------------------------------------------------

    private function validateType(string $field, mixed $value, string $type, int $rowNumber): ?string
    {
        return match ($type) {
            'integer' => is_numeric($value) && (int) $value == $value
                ? null
                : "Row {$rowNumber}: Field '{$field}' must be an integer, got '{$value}'.",
            'decimal' => is_numeric($value)
                ? null
                : "Row {$rowNumber}: Field '{$field}' must be a number, got '{$value}'.",
            default => null, // string, text, array — no strict type check needed
        };
    }

    private function castValue(mixed $value, string $type): mixed
    {
        return match ($type) {
            'integer' => (int) $value,
            'decimal' => (float) $value,
            'array' => array_map('trim', explode(',', $value)),
            default => (string) $value,
        };
    }
}
