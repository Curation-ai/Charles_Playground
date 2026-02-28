<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class OpenAIService
{
    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
    }

    public function generateEmbedding(string $text): array
    {
        $ch = curl_init('https://api.openai.com/v1/embeddings');

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer '.$this->apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => 'text-embedding-3-small',
                'input' => $text,
            ]),
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new RuntimeException("OpenAI API curl error: {$error}");
        }

        if ($httpCode !== 200) {
            throw new RuntimeException("OpenAI API error (HTTP {$httpCode}): {$response}");
        }

        $data = json_decode($response, true);

        if (! isset($data['data'][0]['embedding'])) {
            throw new RuntimeException('Unexpected OpenAI API response: missing embedding data');
        }

        return $data['data'][0]['embedding'];
    }
}
