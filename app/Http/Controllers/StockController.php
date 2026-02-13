<?php

namespace App\Http\Controllers;

use App\Models\Stock;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * StockController
 *
 * Handles HTTP requests for stock management.
 * Uses Inertia to render React components with server-side data.
 */
class StockController extends Controller
{
    /**
     * Display a listing of all stocks.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        return Inertia::render('Stocks/Index', [
            'stocks' => Stock::all()
                ->map(fn ($stock) => [
                    'id' => $stock->id,
                    'ticker' => $stock->ticker,
                    'name' => $stock->name,
                    'date_mentioned' => $stock->date_mentioned->format('Y-m-d'),
                    'stock_type' => $stock->stock_type,
                    'data_source' => $stock->data_source,
                    'mentioned_by' => $stock->mentioned_by,
                ])
                ->toArray(),
        ]);
    }

    /**
     * Show the form for creating a new stock.
     *
     * @return \Inertia\Response
     */
    public function create()
    {
        return Inertia::render('Stocks/Create');
    }

    /**
     * Store a newly created stock in the database.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate(Stock::validationRules());

        Stock::create($validated);

        return redirect()->route('stocks.index')->with('success', 'Stock created successfully.');
    }

    /**
     * Display the specified stock.
     *
     * @param \App\Models\Stock $stock
     *
     * @return \Inertia\Response
     */
    public function show(Stock $stock)
    {
        return Inertia::render('Stocks/Show', [
            'stock' => [
                'id' => $stock->id,
                'ticker' => $stock->ticker,
                'name' => $stock->name,
                'date_mentioned' => $stock->date_mentioned->format('Y-m-d'),
                'stock_type' => $stock->stock_type,
                'data_source' => $stock->data_source,
                'mentioned_by' => $stock->mentioned_by,
                'created_at' => $stock->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $stock->updated_at->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified stock.
     *
     * @param \App\Models\Stock $stock
     *
     * @return \Inertia\Response
     */
    public function edit(Stock $stock)
    {
        return Inertia::render('Stocks/Edit', [
            'stock' => [
                'id' => $stock->id,
                'ticker' => $stock->ticker,
                'name' => $stock->name,
                'date_mentioned' => $stock->date_mentioned->format('Y-m-d'),
                'stock_type' => $stock->stock_type,
                'data_source' => $stock->data_source,
                'mentioned_by' => $stock->mentioned_by,
            ],
        ]);
    }

    /**
     * Update the specified stock in the database.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Stock        $stock
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, Stock $stock)
    {
        $validated = $request->validate(Stock::updateValidationRules());

        $stock->update($validated);

        return redirect()->route('stocks.show', $stock->id)->with('success', 'Stock updated successfully.');
    }

    /**
     * Remove the specified stock from the database.
     *
     * @param \App\Models\Stock $stock
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Stock $stock)
    {
        $stock->delete();

        return redirect()->route('stocks.index')->with('success', 'Stock deleted successfully.');
    }
}
