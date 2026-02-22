<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'linkedin_url',
        'twitter_handle',
        'company',
        'job_title',
        'bio',
        'tags',
        'notes',
        'investor_type',
        'investment_focus',
        'location',
        'last_contact_date',
        'is_active',
        'embedding',
    ];

    protected function casts(): array
    {
        return [
            'tags'             => 'array',
            'investment_focus' => 'array',
            'embedding'        => 'array',
            'last_contact_date' => 'date',
            'is_active'        => 'boolean',
        ];
    }

    public function getEmbeddingText(): string
    {
        return implode(' ', array_filter([
            $this->name,
            $this->job_title,
            $this->company,
            $this->bio,
            $this->tags ? implode(', ', $this->tags) : null,
            $this->investment_focus ? implode(', ', $this->investment_focus) : null,
            $this->notes,
        ]));
    }

    public function originatedStocks(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Stock::class, 'member_originated_stocks')->withPivot('note')->withTimestamps();
    }

    public function commentedStocks(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Stock::class, 'member_commented_stocks')->withPivot('note')->withTimestamps();
    }
}
