<?php

declare(strict_types=1);

namespace App\Http\Controllers\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportCsvRequest;
use App\Http\Requests\ImportEmbeddingsRequest;
use App\Services\CsvImportService;
use Illuminate\Http\JsonResponse;

class ImportController extends Controller
{
    public function __construct(private CsvImportService $importer) {}

    public function upload(ImportCsvRequest $request): JsonResponse
    {
        try {
            $data = $this->importer->parseFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $availableFields = array_merge(
            array_keys(config('stock_fields.core_fields')),
            array_keys(config('stock_fields.metadata_fields'))
        );

        return response()->json([
            'headers' => $data['headers'],
            'preview' => array_slice($data['rows'], 0, 10),
            'total_rows' => count($data['rows']),
            'available_fields' => $availableFields,
        ]);
    }

    public function preview(ImportCsvRequest $request): JsonResponse
    {
        try {
            $data = $this->importer->parseFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $columnMapping = $request->input('column_mapping', []);
        $result = $this->importer->validateData($data, $columnMapping);

        return response()->json([
            'valid_count' => count($result['valid']),
            'error_count' => count($result['errors']),
            'errors' => $result['errors'],
        ]);
    }

    public function execute(ImportCsvRequest $request): JsonResponse
    {
        try {
            $data = $this->importer->parseFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $columnMapping = $request->input('column_mapping', []);
        $validated = $this->importer->validateData($data, $columnMapping);

        if (empty($validated['valid'])) {
            return response()->json([
                'error' => 'No valid rows to import.',
                'errors' => $validated['errors'],
            ], 422);
        }

        $result = $this->importer->importData($validated['valid'], $columnMapping);

        return response()->json([
            'created' => $result['created'],
            'updated' => $result['updated'],
            'skipped' => $result['skipped'],
            'stock_ids' => $result['stock_ids'],
            'validation_errors' => $validated['errors'],
        ]);
    }

    public function embeddings(ImportEmbeddingsRequest $request): JsonResponse
    {
        $stockIds = $request->input('stock_ids');

        try {
            $this->importer->generateEmbeddings($stockIds);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }

        return response()->json([
            'status' => 'complete',
            'processed' => count($stockIds),
        ]);
    }
}
