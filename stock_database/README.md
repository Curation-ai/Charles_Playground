# Stock Database

A centralized database for managing and organizing enriched stock data with detailed tagging, categorization, and multi-format exports.

## Folder Structure

### `/raw/`
Raw data sources from various platforms and imports:
- `platform_symbols.json` - Stock symbols and metadata from external platforms
- `chat_extracted.json` - Stocks extracted from chat analysis and curation
- `manual_inputs.json` - Manually added or edited stocks

### `/processed/`
Processed and enriched data ready for use:
- `enriched_stocks.json` - Complete enriched stock dataset with all tags and categories
- `stocks_by_category/` - Stocks organized by thematic categories
  - `tech.json` - Technology, AI, Cloud, GPU stocks
  - `uranium.json` - Nuclear/Uranium sector
  - `pharma.json` - Healthcare/Pharmaceutical stocks
  - `defence.json` - Defence and aerospace stocks
  - `evs.json` - Electric vehicles and automotive
  - `fintech.json` - Financial technology
  - `other.json` - Additional categories
- `stocks_by_exchange.json` - Stocks organized by exchange (NASDAQ, NYSE, LON, TSE, etc.)

### `/metadata/`
Metadata and configuration files:
- `categories.json` - Tag definitions and category descriptions
- `exchanges.json` - Stock exchange codes and metadata
- `data_sources.json` - Tracking which data came from which source
- `schema.json` - Data structure and validation schema

### `/exports/`
Export files in various formats:
- `all_stocks.json` - Complete export in JSON format
- `all_stocks.csv` - Complete export in CSV format for spreadsheet applications
- `all_stocks.py` - Python module export for backwards compatibility with stock_enrichment.py

## Connection to Existing Data

This database integrates with:
- **`stock_enrichment.py`** - The primary enrichment data source with 346+ stocks and their tags
- **`stock_symbols.json`** - The curated list of 134 key stocks with exchange metadata

Data flows:
1. Raw data from various sources → `/raw/`
2. Processing & enrichment logic applies tags and categorization
3. Enriched data organized into formats in `/processed/`
4. Exported in multiple formats to `/exports/`

## Getting Started

1. **Review existing data**: Check `stock_enrichment.py` for the current enrichment taxonomy
2. **Set up raw data**: Import data sources into `/raw/` subdirectory
3. **Process and organize**: Run enrichment scripts to populate `/processed/`
4. **Export**: Generate exports in `/exports/` for use in applications

## Development Notes

- Keep raw data immutable for audit trail
- Generated files in `/processed/` and `/exports/` can be regenerated from raw data
- Update `/metadata/categories.json` when adding new stock categories or tags
- Maintain consistency with existing `stock_enrichment.py` tags and ticker symbols
