<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * DESIGN DECISIONS:
     * - ticker: Indexed for fast lookups, required field for all stocks
     * - date_mentioned: Indexed separately for range queries and filtering by date
     * - Composite index on (ticker, date_mentioned) for common filtering patterns
     * - stock_type and data_source: Required to track categorization and data lineage
     * - mentioned_by: Tracks the source/person mentioning the stock for audit trail
     * - timestamps (created_at, updated_at): Standard Laravel timestamps for audit
     * - bigIncrements for id: Allows for future scaling beyond 2.1 billion records
     */
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            // Primary Key
            $table->id(); // bigIncrements('id')

            // Stock Identification
            $table->string('ticker', 10)->comment('Stock ticker symbol (e.g., AAPL, MSFT)');
            $table->string('name')->comment('Company name or stock name');

            // Tracking & Categorization
            $table->date('date_mentioned')->comment('Date when the stock was mentioned or discovered');
            $table->string('stock_type', 50)->comment('Type of stock (e.g., Technology, Uranium, Pharma, Defence)');
            $table->string('data_source', 100)->comment('Source of the data (e.g., platform, chat_analysis, manual)');
            $table->string('mentioned_by', 100)->comment('Person or system that mentioned/added this stock (audit trail)');

            // Timestamps
            $table->timestamps(); // created_at, updated_at for audit trail

            // INDEXES FOR PERFORMANCE
            // Single column indexes
            $table->index('ticker')->comment('Fast lookup by ticker symbol');
            $table->index('date_mentioned')->comment('Enable date range queries');
            $table->index('stock_type')->comment('Filter by stock type');
            $table->index('data_source')->comment('Track data provenance');
            $table->index('mentioned_by')->comment('Audit queries by user/system');
            $table->index('created_at')->comment('Time-based filtering');

            // Composite index for common query pattern: find stocks by ticker on a date
            $table->index(['ticker', 'date_mentioned'])->comment('Optimize queries filtering by ticker AND date');

            // Composite index for audit queries: find stocks added by source on date range
            $table->index(['data_source', 'created_at'])->comment('Optimize data source auditing and time-based reporting');

            // Make ticker + date unique to prevent duplicate mentions
            // Allow same ticker on different dates, but prevent exact duplicates
            $table->unique(['ticker', 'date_mentioned', 'data_source'])->comment('Prevent duplicate stock mentions from same source on same date');
        });
    }

    /**
     * Reverse the migrations.
     *
     * Clean rollback that:
     * - Drops all indexes (automatically handled by Schema::dropIfExists)
     * - Drops the stocks table
     * - Safe for development and staging environments
     */
    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
