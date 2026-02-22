<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'ticker' => ['sometimes', 'required', 'string', 'max:10', Rule::unique('stocks', 'ticker')->ignore($this->route('stock'))],
            'sector' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'market_cap' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
            'metadata.*' => ['nullable'],
            'originating_member_links' => ['nullable', 'array'],
            'originating_member_links.*.member_id' => ['required', 'integer', 'exists:members,id'],
            'originating_member_links.*.note' => ['nullable', 'string', 'max:255'],
            'commenting_member_links' => ['nullable', 'array'],
            'commenting_member_links.*.member_id' => ['required', 'integer', 'exists:members,id'],
            'commenting_member_links.*.note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
