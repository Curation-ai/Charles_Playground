<?php

namespace Database\Seeders;

use App\Models\Stock;
use Illuminate\Database\Seeder;

class StockSeeder extends Seeder
{
    public function run(): void
    {
        $stocks = [
            // Technology
            [
                'name' => 'Apple Inc.', 'ticker' => 'AAPL', 'sector' => 'Technology',
                'description' => 'Consumer electronics, software, and services company.',
                'price' => 189.84, 'market_cap' => 2950000000000,
                'tags' => ['mega-cap', 'dividend', 'sp500'],
                'metadata' => [
                    'investment_thesis' => 'Unmatched brand loyalty and ecosystem lock-in drive predictable recurring revenue through services. iPhone installed base of 2B+ devices creates a durable moat. Services segment margin expansion is the key re-rating catalyst.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'Sarah Chen',
                ],
            ],
            [
                'name' => 'Microsoft Corporation', 'ticker' => 'MSFT', 'sector' => 'Technology',
                'description' => 'Software, cloud computing, and AI services company.',
                'price' => 415.60, 'market_cap' => 3090000000000,
                'tags' => ['mega-cap', 'dividend', 'sp500', 'ai'],
                'metadata' => [
                    'investment_thesis' => 'Azure cloud growth and deep OpenAI integration position Microsoft as the enterprise AI infrastructure winner. Copilot monetisation across Office 365 adds a high-margin revenue layer on top of the existing 300M seat base.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'James Patel',
                ],
            ],
            [
                'name' => 'NVIDIA Corporation', 'ticker' => 'NVDA', 'sector' => 'Technology',
                'description' => 'Graphics processing units and AI chip manufacturer.',
                'price' => 878.35, 'market_cap' => 2170000000000,
                'tags' => ['mega-cap', 'sp500', 'ai', 'semiconductors'],
                'metadata' => [
                    'investment_thesis' => 'CUDA software ecosystem creates an extraordinarily deep moat in AI training. Hyperscaler capex tailwinds will sustain data centre GPU demand for years. Blackwell architecture extends the lead over AMD and custom silicon.',
                    'valuation_view'    => 'Overvalued',
                    'originated_by'     => 'Marcus Liu',
                ],
            ],
            [
                'name' => 'Alphabet Inc.', 'ticker' => 'GOOGL', 'sector' => 'Technology',
                'description' => 'Internet search, advertising, and cloud platform.',
                'price' => 155.72, 'market_cap' => 1940000000000,
                'tags' => ['mega-cap', 'sp500', 'ai'],
                'metadata' => [
                    'investment_thesis' => 'Search monopoly with 90% market share generates enormous cash to fund AI and cloud. Google Cloud is the fastest-growing of the big three hyperscalers. Trading at a meaningful discount to Microsoft despite comparable AI assets.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'Sarah Chen',
                ],
            ],

            // Healthcare
            [
                'name' => 'Johnson & Johnson', 'ticker' => 'JNJ', 'sector' => 'Healthcare',
                'description' => 'Pharmaceuticals, medical devices, and consumer health products.',
                'price' => 156.20, 'market_cap' => 376000000000,
                'tags' => ['large-cap', 'dividend', 'sp500', 'defensive'],
                'metadata' => [
                    'investment_thesis' => 'Post-Kenvue spin-off focuses JNJ on higher-margin pharma and medtech. Strong pipeline with multiple blockbuster candidates. Dividend Aristocrat with 60+ years of consecutive increases provides income floor.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'Priya Nair',
                ],
            ],
            [
                'name' => 'UnitedHealth Group', 'ticker' => 'UNH', 'sector' => 'Healthcare',
                'description' => 'Health insurance and healthcare services conglomerate.',
                'price' => 527.40, 'market_cap' => 487000000000,
                'tags' => ['mega-cap', 'dividend', 'sp500'],
                'metadata' => [
                    'investment_thesis' => 'Optum vertical integration — combining insurance, pharmacy, and care delivery — creates structural cost advantages competitors cannot replicate. Consistent double-digit EPS growth regardless of economic cycle.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'James Patel',
                ],
            ],
            [
                'name' => 'Pfizer Inc.', 'ticker' => 'PFE', 'sector' => 'Healthcare',
                'description' => 'Global pharmaceutical and biotechnology corporation.',
                'price' => 28.15, 'market_cap' => 158000000000,
                'tags' => ['large-cap', 'dividend', 'sp500', 'pharma'],
                'metadata' => [
                    'investment_thesis' => 'Post-COVID revenue reset has compressed valuation to multi-decade lows. Seagen oncology acquisition adds a high-growth ADC pipeline. 6%+ dividend yield provides downside support while pipeline matures.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'Priya Nair',
                ],
            ],

            // Finance
            [
                'name' => 'JPMorgan Chase & Co.', 'ticker' => 'JPM', 'sector' => 'Finance',
                'description' => 'Multinational investment bank and financial services holding company.',
                'price' => 198.45, 'market_cap' => 571000000000,
                'tags' => ['mega-cap', 'dividend', 'sp500', 'banking'],
                'metadata' => [
                    'investment_thesis' => 'Best-in-class management under Dimon and unmatched franchise across retail, IB, and asset management. Benefits from higher-for-longer rate environment. Conservative provisioning history means earnings power is understated.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'Marcus Liu',
                ],
            ],
            [
                'name' => 'Visa Inc.', 'ticker' => 'V', 'sector' => 'Finance',
                'description' => 'Global payments technology company.',
                'price' => 282.30, 'market_cap' => 580000000000,
                'tags' => ['mega-cap', 'dividend', 'sp500', 'fintech'],
                'metadata' => [
                    'investment_thesis' => 'Asset-light toll-road business model on global commerce with 70%+ operating margins. Secular shift from cash to digital payments has decades of runway. Cross-border volume recovery post-COVID is a multi-year tailwind.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'Sarah Chen',
                ],
            ],
            [
                'name' => 'Goldman Sachs Group', 'ticker' => 'GS', 'sector' => 'Finance',
                'description' => 'Investment banking, securities, and asset management firm.',
                'price' => 465.80, 'market_cap' => 155000000000,
                'tags' => ['large-cap', 'dividend', 'sp500', 'banking'],
                'metadata' => [
                    'investment_thesis' => 'Refocused on core IB and asset/wealth management after exiting consumer banking. Dealmaking recovery and capital markets reopening should drive significant earnings leverage from current suppressed levels.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'Marcus Liu',
                ],
            ],
            [
                'name' => 'Berkshire Hathaway', 'ticker' => 'BRK.B', 'sector' => 'Finance',
                'description' => 'Multinational conglomerate holding company.',
                'price' => 408.50, 'market_cap' => 890000000000,
                'tags' => ['mega-cap', 'sp500', 'value'],
                'metadata' => [
                    'investment_thesis' => '$160B+ cash war chest positions Berkshire to deploy aggressively in the next downturn. Insurance float provides near-free leverage. Trades at a discount to intrinsic value — effectively buying Buffett\'s capital allocation skill at a discount.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'James Patel',
                ],
            ],

            // Energy
            [
                'name' => 'Exxon Mobil Corporation', 'ticker' => 'XOM', 'sector' => 'Energy',
                'description' => 'Multinational oil and gas corporation.',
                'price' => 104.75, 'market_cap' => 418000000000,
                'tags' => ['mega-cap', 'dividend', 'sp500', 'oil'],
                'metadata' => [
                    'investment_thesis' => 'Pioneer acquisition dramatically improves Permian Basin position with decades of low-cost inventory. Guyana offshore development adds a world-class low-breakeven asset. Structural cost cuts make the dividend safe at $50/bbl oil.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'Priya Nair',
                ],
            ],
            [
                'name' => 'Chevron Corporation', 'ticker' => 'CVX', 'sector' => 'Energy',
                'description' => 'Integrated energy and chemicals company.',
                'price' => 155.90, 'market_cap' => 289000000000,
                'tags' => ['large-cap', 'dividend', 'sp500', 'oil'],
                'metadata' => [
                    'investment_thesis' => 'Hess acquisition adds best-in-class Guyana assets at an attractive entry point. Industry-leading balance sheet with lowest net debt ratio among majors. 4%+ dividend yield with consistent buyback programme.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'Marcus Liu',
                ],
            ],
            [
                'name' => 'NextEra Energy', 'ticker' => 'NEE', 'sector' => 'Energy',
                'description' => 'Clean energy infrastructure and utility company.',
                'price' => 68.42, 'market_cap' => 140000000000,
                'tags' => ['large-cap', 'dividend', 'sp500', 'renewable'],
                'metadata' => [
                    'investment_thesis' => 'Largest renewable energy platform globally with a 20GW+ development backlog. Regulated Florida utility provides stable cash flows to fund clean energy build-out. Rate normalisation is the key re-rating catalyst after 2023-24 sell-off.',
                    'valuation_view'    => 'Undervalued',
                    'originated_by'     => 'Sarah Chen',
                ],
            ],
            [
                'name' => 'Enphase Energy', 'ticker' => 'ENPH', 'sector' => 'Energy',
                'description' => 'Solar microinverters and energy management technology.',
                'price' => 113.25, 'market_cap' => 15300000000,
                'tags' => ['mid-cap', 'growth', 'solar', 'renewable'],
                'metadata' => [
                    'investment_thesis' => 'Microinverter technology and IQ battery system create a differentiated home energy platform with strong recurring revenue from software and services. Market share gains in Europe provide a second growth engine as US demand normalises.',
                    'valuation_view'    => 'Fair Value',
                    'originated_by'     => 'Priya Nair',
                ],
            ],
        ];

        foreach ($stocks as $stock) {
            Stock::create($stock);
        }
    }
}
