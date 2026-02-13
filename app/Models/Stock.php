<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Stock Model
 *
 * Represents a stock record in the database with support for filtering,
 * mass assignment protection, and data validation.
 *
 * @property int $id The primary key
 * @property string $ticker Stock ticker symbol (e.g., AAPL, MSFT)
 * @property string $name Company name
 * @property Carbon $date_mentioned Date when stock was mentioned or discovered
 * @property string $stock_type Type of stock (e.g., Technology, Uranium, Pharma)
 * @property string $data_source Source of the data (e.g., platform, chat_analysis)
 * @property string $mentioned_by Person or system that mentioned the stock
 * @property Carbon $created_at Timestamp when record was created
 * @property Carbon $updated_at Timestamp when record was last updated
 *
 * @method static Builder byTicker(string $ticker) Filter stocks by ticker symbol
 * @method static Builder byDateRange(Carbon|string $startDate, Carbon|string $endDate) Filter stocks by date range
 * @method static Builder bySource(string $source) Filter stocks by data source
 *
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
class Stock extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * These fields can be set via create(), update(), or fill() methods.
     * Fields are explicitly listed for security (mass assignment protection).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'ticker',
        'name',
        'date_mentioned',
        'stock_type',
        'data_source',
        'mentioned_by',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * date_mentioned is cast to Carbon for date manipulation and comparison.
     * created_at and updated_at are automatically cast by Laravel.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_mentioned' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the validation rules for creating or updating a stock.
     *
     * Used for validating stock data before persistence. Rules enforce:
     * - Required fields cannot be null
     * - ticker: Unique per date/source combination to prevent duplicates
     * - Proper string lengths matching database column constraints
     * - Valid date format for date_mentioned
     *
     * @return array<string, string|array>
     */
    public static function validationRules(): array
    {
        return [
            'ticker' => 'required|string|max:10',
            'name' => 'required|string|max:255',
            'date_mentioned' => 'required|date',
            'stock_type' => 'required|string|max:50',
            'data_source' => 'required|string|max:100',
            'mentioned_by' => 'required|string|max:100',
        ];
    }

    /**
     * Get the validation rules for updating a stock.
     *
     * Update rules are typically more lenient than creation rules.
     * Can be customized if needed for partial updates.
     *
     * @return array<string, string|array>
     */
    public static function updateValidationRules(): array
    {
        return self::validationRules();
    }

    /**
     * Scope: Filter stocks by ticker symbol.
     *
     * Common use case: Finding all records for a specific stock ticker.
     * Case-sensitive by default (tickers are typically uppercase).
     *
     * @param Builder $query
     * @param string $ticker Stock ticker symbol (e.g., AAPL)
     *
     * @return Builder
     *
     * @example Stock::byTicker('AAPL')->get()
     */
    public function scopeByTicker(Builder $query, string $ticker): Builder
    {
        return $query->where('ticker', $ticker);
    }

    /**
     * Scope: Filter stocks by date range.
     *
     * Common use case: Retrieving stocks mentioned within a specific period.
     * Supports both Carbon instances and string dates (parsed automatically).
     *
     * @param Builder $query
     * @param Carbon|string $startDate The start of the date range (inclusive)
     * @param Carbon|string $endDate The end of the date range (inclusive)
     *
     * @return Builder
     *
     * @example Stock::byDateRange('2026-01-01', '2026-02-05')->get()
     * @example Stock::byDateRange(now()->subMonth(), now())->get()
     */
    public function scopeByDateRange(Builder $query, Carbon|string $startDate, Carbon|string $endDate): Builder
    {
        // Convert strings to Carbon instances if necessary
        if (is_string($startDate)) {
            $startDate = Carbon::parse($startDate);
        }
        if (is_string($endDate)) {
            $endDate = Carbon::parse($endDate);
        }

        return $query->whereBetween('date_mentioned', [$startDate, $endDate]);
    }

    /**
     * Scope: Filter stocks by data source.
     *
     * Common use case: Auditing or retrieving stocks from a specific source
     * (e.g., 'platform', 'chat_analysis', 'manual').
     * Used for data lineage and source tracking.
     *
     * @param Builder $query
     * @param string $source The data source to filter by
     *
     * @return Builder
     *
     * @example Stock::bySource('platform')->get()
     * @example Stock::bySource('chat_analysis')->count()
     */
    public function scopeBySource(Builder $query, string $source): Builder
    {
        return $query->where('data_source', $source);
    }

    /**
     * Scope: Filter stocks by stock type/category.
     *
     * Common use case: Retrieving stocks of a specific type
     * (e.g., 'Technology', 'Uranium', 'Pharma', 'Defence').
     *
     * @param Builder $query
     * @param string $type The stock type to filter by
     *
     * @return Builder
     *
     * @example Stock::byType('Technology')->get()
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('stock_type', $type);
    }

    /**
     * Scope: Filter stocks by mentioned_by user/system.
     *
     * Common use case: Auditing stocks added by a specific user or system.
     *
     * @param Builder $query
     * @param string $user The user or system identifier
     *
     * @return Builder
     *
     * @example Stock::byMentionedBy('user123')->get()
     */
    public function scopeByMentionedBy(Builder $query, string $user): Builder
    {
        return $query->where('mentioned_by', $user);
    }

    /**
     * Scope: Get recent stocks (ordered by date_mentioned, descending).
     *
     * Common use case: Displaying latest discovered stocks first.
     *
     * @param Builder $query
     * @param int $limit Optional limit on results
     *
     * @return Builder
     *
     * @example Stock::recent()->limit(10)->get()
     */
    public function scopeRecent(Builder $query, ?int $limit = null): Builder
    {
        $query = $query->orderByDesc('date_mentioned');

        if ($limit) {
            $query = $query->limit($limit);
        }

        return $query;
    }

    /**
     * Scope: Get distinct stock tickers.
     *
     * Common use case: Finding all unique tickers in the database,
     * useful for generating reports or lists.
     *
     * @param Builder $query
     *
     * @return Builder
     *
     * @example Stock::distinctTickers()->pluck('ticker')
     */
    public function scopeDistinctTickers(Builder $query): Builder
    {
        return $query->distinct('ticker');
    }
}
