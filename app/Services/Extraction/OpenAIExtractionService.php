<?php

declare(strict_types=1);

namespace App\Services\Extraction;

use App\Contracts\ThesisExtractionServiceInterface;
use RuntimeException;

class OpenAIExtractionService implements ThesisExtractionServiceInterface
{
    private string $apiKey;

    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
        $this->model = config('services.extraction.model', 'gpt-4o');
    }

    public function extract(string $thesis): array
    {
        $payload = [
            'model' => $this->model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a financial analyst assistant. Extract structured investment thesis information from the provided text. Be concise and factual. If a field cannot be determined from the text, use null.',
                ],
                [
                    'role' => 'user',
                    'content' => "Extract the investment thesis components from this text:\n\n{$thesis}",
                ],
            ],
            'response_format' => [
                'type' => 'json_schema',
                'json_schema' => [
                    'name' => 'thesis_extraction',
                    'strict' => true,
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'catalyst' => [
                                'type' => ['string', 'null'],
                                'description' => 'The main investment trigger or opportunity',
                            ],
                            'competitive_moat' => [
                                'type' => ['string', 'null'],
                                'description' => 'What protects the business from competition',
                            ],
                            'key_risks' => [
                                'type' => ['string', 'null'],
                                'description' => 'Main risks that could prevent the thesis playing out',
                            ],
                            'conviction_level' => [
                                'type' => ['string', 'null'],
                                'enum' => ['low', 'medium', 'high', null],
                                'description' => 'Overall conviction in the investment',
                            ],
                            'time_horizon' => [
                                'type' => ['string', 'null'],
                                'enum' => ['short', 'medium', 'long', null],
                                'description' => 'Expected investment time horizon: short (<1yr), medium (1-3yr), long (3yr+)',
                            ],
                        ],
                        'required' => ['catalyst', 'competitive_moat', 'key_risks', 'conviction_level', 'time_horizon'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            'temperature' => 0,
        ];

        $ch = curl_init('https://api.openai.com/v1/chat/completions');

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer '.$this->apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
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

        $content = $data['choices'][0]['message']['content'] ?? null;

        if (! $content) {
            throw new RuntimeException('Unexpected OpenAI API response: missing content');
        }

        $extracted = json_decode($content, true);

        if (! is_array($extracted)) {
            throw new RuntimeException('OpenAI returned invalid JSON for thesis extraction');
        }

        return $extracted;
    }
}
