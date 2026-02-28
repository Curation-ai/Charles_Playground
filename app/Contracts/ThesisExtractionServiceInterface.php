<?php

declare(strict_types=1);

namespace App\Contracts;

interface ThesisExtractionServiceInterface
{
    /**
     * Extract structured thesis metadata from freeform text.
     *
     * Returns an array with keys: catalyst, competitive_moat, key_risks,
     * conviction_level (low|medium|high), time_horizon (short|medium|long).
     *
     * @throws \RuntimeException on API failure
     */
    public function extract(string $thesis): array;
}
