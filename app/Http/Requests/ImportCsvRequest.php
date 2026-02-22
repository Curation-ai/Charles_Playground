<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportCsvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $validFields = array_merge(
            array_keys(config('stock_fields.core_fields')),
            array_keys(config('stock_fields.metadata_fields'))
        );

        return [
            'file'             => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'column_mapping'   => ['sometimes', 'array'],
            'column_mapping.*' => ['string', 'in:' . implode(',', $validFields)],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required'      => 'A CSV file is required.',
            'file.mimes'         => 'The file must be a CSV (.csv or .txt).',
            'file.max'           => 'The file must not exceed 10MB.',
            'column_mapping.*.in' => 'Each column mapping value must be a valid stock field.',
        ];
    }
}
