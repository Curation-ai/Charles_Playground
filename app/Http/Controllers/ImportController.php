<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportCsvRequest;
use App\Services\CsvImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportController extends Controller
{
    public function __construct(private CsvImportService $importer) {}

    /**
     * POST /api/v1/import/upload
     * Accept a CSV, return a preview of the first 10 rows + detected headers.
     */
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
            'headers'          => $data['headers'],
            'preview'          => array_slice($data['rows'], 0, 10),
            'total_rows'       => count($data['rows']),
            'available_fields' => $availableFields,
        ]);
    }

    /**
     * POST /api/v1/import/preview
     * Accept a CSV + column mapping, run validation, return errors + valid row count.
     */
    public function preview(ImportCsvRequest $request): JsonResponse
    {
        try {
            $data = $this->importer->parseFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $columnMapping = $request->input('column_mapping', []);
        $result        = $this->importer->validateData($data, $columnMapping);

        return response()->json([
            'valid_count' => count($result['valid']),
            'error_count' => count($result['errors']),
            'errors'      => $result['errors'],
        ]);
    }

    /**
     * POST /api/v1/import/execute
     * Run the full import. Returns created/updated/skipped counts + imported IDs.
     */
    public function execute(ImportCsvRequest $request): JsonResponse
    {
        try {
            $data = $this->importer->parseFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $columnMapping = $request->input('column_mapping', []);
        $validated     = $this->importer->validateData($data, $columnMapping);

        if (empty($validated['valid'])) {
            return response()->json([
                'error'  => 'No valid rows to import.',
                'errors' => $validated['errors'],
            ], 422);
        }

        $result = $this->importer->importData($validated['valid'], $columnMapping);

        return response()->json([
            'created'           => $result['created'],
            'updated'           => $result['updated'],
            'skipped'           => $result['skipped'],
            'stock_ids'         => $result['stock_ids'],
            'validation_errors' => $validated['errors'],
        ]);
    }

    /**
     * POST /api/v1/import/embeddings
     * Trigger synchronous embedding generation for the given stock IDs.
     */
    public function embeddings(Request $request): JsonResponse
    {
        $request->validate([
            'stock_ids'   => ['required', 'array'],
            'stock_ids.*' => ['integer', 'exists:stocks,id'],
        ]);

        $stockIds = $request->input('stock_ids');

        try {
            $this->importer->generateEmbeddings($stockIds);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }

        return response()->json([
            'status'    => 'complete',
            'processed' => count($stockIds),
        ]);
    }
}
