<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Member;
use App\Models\Stock;
use App\Services\OpenAIService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportChatMembers extends Command
{
    protected $signature = 'members:import-chat
                                {--path= : Path to members_extracted.json (defaults to scripts/members_extracted.json)}
                                {--no-embed : Skip embedding generation after import}';

    protected $description = 'Import members + stock links from the chat extraction JSON into the database';

    public function handle(OpenAIService $openAI): int
    {
        $jsonPath = $this->option('path')
            ? base_path($this->option('path'))
            : base_path('scripts/members_extracted.json');

        if (! file_exists($jsonPath)) {
            $this->error("File not found: {$jsonPath}");
            $this->line('Run the extraction script first:');
            $this->line('  python scripts/extract_chat_members.py /path/to/chat.txt');

            return self::FAILURE;
        }

        $members = json_decode(file_get_contents($jsonPath), true);

        if (! is_array($members) || empty($members)) {
            $this->error("JSON file is empty or invalid: {$jsonPath}");

            return self::FAILURE;
        }

        $this->info('Found '.count($members)." members in {$jsonPath}");
        $this->newLine();

        // ── Pre-load all stocks indexed by ticker for O(1) lookup ────────────
        $stockByTicker = Stock::all()->keyBy('ticker');
        $this->line('Loaded '.$stockByTicker->count().' stocks for ticker matching.');
        $this->newLine();

        $created = 0;
        $updated = 0;
        $originatedLinks = 0;
        $commentedLinks = 0;
        $newMemberIds = [];

        $bar = $this->output->createProgressBar(count($members));
        $bar->start();

        foreach ($members as $data) {
            $name = trim($data['name'] ?? '');

            if (! $name) {
                $bar->advance();

                continue;
            }

            // ── Upsert member ─────────────────────────────────────────────────
            $isNew = ! Member::where('name', $name)->exists();
            $member = Member::updateOrCreate(
                ['name' => $name],
                array_filter([
                    'bio' => $data['bio'] ?? null,
                    'investor_type' => $data['investor_type'] ?? null,
                    'investment_focus' => $data['investment_focus'] ?? [],
                    'is_active' => true,
                ], fn ($v) => $v !== null)
            );

            if ($isNew) {
                $created++;
                $newMemberIds[] = $member->id;
            } else {
                $updated++;
            }

            // ── Originated stocks ─────────────────────────────────────────────
            foreach ($data['originated_tickers'] ?? [] as $ticker) {
                $stock = $stockByTicker->get(strtoupper($ticker));
                if (! $stock) {
                    continue;
                }

                DB::table('member_originated_stocks')->insertOrIgnore([
                    'member_id' => $member->id,
                    'stock_id' => $stock->id,
                    'note' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $originatedLinks++;
            }

            // ── Commented stocks ──────────────────────────────────────────────
            foreach ($data['commented_tickers'] ?? [] as $ticker) {
                $stock = $stockByTicker->get(strtoupper($ticker));
                if (! $stock) {
                    continue;
                }

                DB::table('member_commented_stocks')->insertOrIgnore([
                    'member_id' => $member->id,
                    'stock_id' => $stock->id,
                    'note' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $commentedLinks++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // ── Summary ───────────────────────────────────────────────────────────
        $this->info('Import complete:');
        $this->line("  Members created : {$created}");
        $this->line("  Members updated : {$updated}");
        $this->line("  Originated links: {$originatedLinks}");
        $this->line("  Commented links : {$commentedLinks}");

        // ── Generate embeddings for new members ───────────────────────────────
        if ($this->option('no-embed') || empty($newMemberIds)) {
            if (! empty($newMemberIds)) {
                $this->newLine();
                $this->line('Skipping embedding generation (--no-embed flag set).');
                $this->line('To generate later: POST /api/v1/members/embeddings');
            }

            return self::SUCCESS;
        }

        $this->newLine();
        $this->info("Generating embeddings for {$created} new member(s)…");

        $newMembers = Member::whereIn('id', $newMemberIds)->get();
        $embedBar = $this->output->createProgressBar($newMembers->count());
        $embedBar->start();
        $embedded = 0;

        foreach ($newMembers as $member) {
            try {
                $text = $member->getEmbeddingText();
                if (! trim($text)) {
                    $embedBar->advance();

                    continue;
                }
                $embedding = $openAI->generateEmbedding($text);
                $member->withoutEvents(fn () => $member->update(['embedding' => $embedding]));
                $embedded++;
            } catch (\Throwable $e) {
                $this->newLine();
                $this->warn("  Embedding failed for {$member->name}: {$e->getMessage()}");
            }

            $embedBar->advance();
            usleep(300_000); // 300ms between embedding calls
        }

        $embedBar->finish();
        $this->newLine(2);
        $this->info("Embeddings generated: {$embedded}/{$created}");

        return self::SUCCESS;
    }
}
