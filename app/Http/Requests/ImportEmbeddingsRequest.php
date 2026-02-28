<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportEmbeddingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'stock_ids' => ['required', 'array'],
            'stock_ids.*' => ['integer', 'exists:stocks,id'],
        ];
    }
}
