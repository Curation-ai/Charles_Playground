<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'ticker' => ['required', 'string', 'max:10', 'unique:stocks,ticker'],
            'sector' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'market_cap' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
            'metadata.*' => ['nullable'],
        ];
    }
}
