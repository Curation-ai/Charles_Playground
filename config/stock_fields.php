<?php

declare(strict_types=1);

return [

    'core_fields' => [
        'name' => ['type' => 'string',  'required' => true,  'label' => 'Name',        'category' => 'Basic'],
        'ticker' => ['type' => 'string',  'required' => true,  'label' => 'Ticker',       'category' => 'Basic', 'unique' => true],
        'sector' => ['type' => 'string',  'required' => false, 'label' => 'Sector',       'category' => 'Basic'],
        'price' => ['type' => 'decimal', 'required' => false, 'label' => 'Price',        'category' => 'Basic'],
        'market_cap' => ['type' => 'integer', 'required' => false, 'label' => 'Market Cap',   'category' => 'Basic'],
        'tags' => ['type' => 'array',   'required' => false, 'label' => 'Tags',         'category' => 'Basic'],
        'description' => ['type' => 'text',    'required' => false, 'label' => 'Description',  'category' => 'Additional'],
        'notes' => ['type' => 'text',    'required' => false, 'label' => 'Notes',        'category' => 'Additional'],
    ],

    'metadata_fields' => [

        // Investment Analysis
        'investment_thesis' => ['type' => 'text',   'required' => false, 'label' => 'Investment Thesis',      'category' => 'Investment Analysis', 'description' => 'Why we like this stock'],
        'valuation_view' => ['type' => 'string', 'required' => false, 'label' => 'Valuation Perspective',  'category' => 'Investment Analysis', 'options' => ['Undervalued', 'Fair Value', 'Overvalued', 'Unknown']],

        // Team
        'originated_by' => ['type' => 'string', 'required' => false, 'label' => 'Originated By',  'category' => 'Team', 'description' => 'Team member who first identified this opportunity'],
        'date_added' => ['type' => 'date',   'required' => false, 'label' => 'Date Added',      'category' => 'Team'],
        'last_reviewed' => ['type' => 'date',   'required' => false, 'label' => 'Last Reviewed',   'category' => 'Team'],

    ],

];
