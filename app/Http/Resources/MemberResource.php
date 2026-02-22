<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'linkedin_url'      => $this->linkedin_url,
            'twitter_handle'    => $this->twitter_handle,
            'company'           => $this->company,
            'job_title'         => $this->job_title,
            'bio'               => $this->bio,
            'tags'              => $this->tags ?? [],
            'notes'             => $this->notes,
            'investor_type'     => $this->investor_type,
            'investment_focus'  => $this->investment_focus ?? [],
            'location'          => $this->location,
            'last_contact_date' => $this->last_contact_date?->toDateString(),
            'is_active'         => $this->is_active,
            'has_embedding'     => !is_null($this->embedding),
            'created_at'        => $this->created_at?->toDateTimeString(),
            'updated_at'        => $this->updated_at?->toDateTimeString(),
        ];

        // Originated stocks (when relation loaded)
        if ($this->relationLoaded('originatedStocks')) {
            $data['originated_stocks'] = $this->originatedStocks->map(fn ($stock) => [
                'id'     => $stock->id,
                'name'   => $stock->name,
                'ticker' => $stock->ticker,
                'note'   => $stock->pivot->note,
            ])->values()->all();
        } else {
            $data['originated_stocks'] = [];
        }

        // Commented stocks (when relation loaded)
        if ($this->relationLoaded('commentedStocks')) {
            $data['commented_stocks'] = $this->commentedStocks->map(fn ($stock) => [
                'id'     => $stock->id,
                'name'   => $stock->name,
                'ticker' => $stock->ticker,
                'note'   => $stock->pivot->note,
            ])->values()->all();
        } else {
            $data['commented_stocks'] = [];
        }

        // Lightweight total stocks count for list view (deduped by stock_id)
        $originatedIds = $this->relationLoaded('originatedStocks') ? $this->originatedStocks->pluck('id') : collect();
        $commentedIds  = $this->relationLoaded('commentedStocks')  ? $this->commentedStocks->pluck('id')  : collect();
        $data['stocks_count'] = $originatedIds->merge($commentedIds)->unique()->count();

        return $data;
    }
}
