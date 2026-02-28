<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class BulkUpdateStocksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'stock_ids' => ['required', 'array', 'min:1'],
            'stock_ids.*' => ['required', 'integer', 'exists:stocks,id'],
            'updates' => ['required', 'array', 'min:1'],
            'updates.*' => ['nullable'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $validFields = array_merge(
                array_keys(config('stock_fields.core_fields')),
                array_keys(config('stock_fields.metadata_fields'))
            );

            foreach (array_keys($this->input('updates', [])) as $field) {
                if (! in_array($field, $validFields)) {
                    $validator->errors()->add('updates', "'{$field}' is not a valid stock field.");
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'stock_ids.required' => 'At least one stock ID is required.',
            'stock_ids.*.exists' => 'One or more stock IDs do not exist.',
            'updates.required' => 'At least one field to update is required.',
        ];
    }
}
