<?php

namespace Database\Seeders;

use App\Models\Stock;
use Illuminate\Database\Seeder;

class StockSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stocks = [
            [
                'ticker' => 'MSFT',
                'name' => 'Microsoft Corp',
                'date_mentioned' => '2026-02-03',
                'stock_type' => 'Technology',
                'data_source' => 'platform',
                'mentioned_by' => 'system',
            ],
            [
                'ticker' => 'UEC',
                'name' => 'Uranium Energy Corp',
                'date_mentioned' => '2026-02-02',
                'stock_type' => 'Uranium',
                'data_source' => 'chat_analysis',
                'mentioned_by' => 'user_123',
            ],
            [
                'ticker' => 'JNJ',
                'name' => 'Johnson & Johnson',
                'date_mentioned' => '2026-02-01',
                'stock_type' => 'Pharma',
                'data_source' => 'manual',
                'mentioned_by' => 'admin',
            ],
            [
                'ticker' => 'BA',
                'name' => 'Boeing Company',
                'date_mentioned' => '2026-01-31',
                'stock_type' => 'Defence',
                'data_source' => 'platform',
                'mentioned_by' => 'system',
            ],
            [
                'ticker' => 'TSLA',
                'name' => 'Tesla Inc',
                'date_mentioned' => '2026-01-30',
                'stock_type' => 'EV/Auto',
                'data_source' => 'chat_analysis',
                'mentioned_by' => 'user_456',
            ],
        ];

        foreach ($stocks as $stock) {
            Stock::create($stock);
        }
    }
}
