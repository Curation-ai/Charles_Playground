<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Member;

class MemberService
{
    public function __construct(private OpenAIService $openAI) {}

    public function syncOriginatedStocks(Member $member, array $links): void
    {
        $syncData = [];

        foreach ($links as $link) {
            $syncData[$link['stock_id']] = ['note' => $link['note'] ?? null];
        }

        $member->originatedStocks()->sync($syncData);
    }

    public function syncCommentedStocks(Member $member, array $links): void
    {
        $syncData = [];

        foreach ($links as $link) {
            $syncData[$link['stock_id']] = ['note' => $link['note'] ?? null];
        }

        $member->commentedStocks()->sync($syncData);
    }

    public function generateEmbedding(Member $member): void
    {
        try {
            $embedding = $this->openAI->generateEmbedding($member->getEmbeddingText());
            $member->update(['embedding' => $embedding]);
        } catch (\Throwable) {
            // Non-fatal — embedding can be regenerated later
        }
    }
}
