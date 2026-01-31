#!/usr/bin/env python3
"""
Message Parser and Enrichment Pipeline for ChromaDB.

This script parses chat messages from text files, enriches them with
stock ticker and company information, and outputs data in ChromaDB-compatible
JSON format.

Usage:
    python main.py <input_file.txt> [--output output.json] [--format json|jsonl|chromadb]
    python main.py --demo  # Run with demo data

Output Formats:
    - json: Standard JSON array format
    - jsonl: JSON Lines format (one document per line)
    - chromadb: ChromaDB-native format with ids, documents, metadatas arrays
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from message_parser import MessageParser, ParsedMessage
from enrichment_db import EnrichmentEngine, CompanyProfile, COMPANY_DATABASE
from chromadb_formatter import ChromaDBFormatter, ChromaDBCollection


def process_file(
    input_path: str,
    output_path: Optional[str] = None,
    output_format: str = "chromadb",
    include_summary: bool = True
) -> ChromaDBCollection:
    """
    Process a message file and output enriched data.

    Args:
        input_path: Path to input text file
        output_path: Optional path for output JSON file
        output_format: Output format (json, jsonl, or chromadb)
        include_summary: Whether to include enrichment summary

    Returns:
        ChromaDBCollection with processed messages
    """
    # Initialize components
    parser = MessageParser()
    enrichment_engine = EnrichmentEngine()
    formatter = ChromaDBFormatter(enrichment_engine)

    # Parse messages
    print(f"📂 Reading file: {input_path}")
    messages = parser.parse_file(input_path)
    print(f"📝 Parsed {len(messages)} messages")

    # Format for ChromaDB
    collection = formatter.format_messages(messages)
    print(f"🏷️  Enriched messages with stock/company data")

    # Generate summary
    summary = formatter.create_enrichment_summary(collection)

    # Display summary
    print("\n" + "="*50)
    print("📊 ENRICHMENT SUMMARY")
    print("="*50)
    print(f"Total messages: {summary['total_messages']}")
    print(f"Messages with stock mentions: {summary['messages_with_stock_mentions']}")
    print(f"Unique senders: {len(summary['unique_senders'])}")

    if summary['unique_tickers']:
        print(f"\n🎯 Tickers found: {', '.join(summary['unique_tickers'])}")

    if summary['ticker_frequency']:
        print("\n📈 Ticker frequency:")
        for ticker, count in list(summary['ticker_frequency'].items())[:10]:
            print(f"   {ticker}: {count} mentions")

    if summary['company_frequency']:
        print("\n🏢 Company frequency:")
        for company, count in list(summary['company_frequency'].items())[:10]:
            print(f"   {company}: {count} mentions")

    if summary['sector_breakdown']:
        print("\n📊 Sector breakdown:")
        for sector, count in summary['sector_breakdown'].items():
            print(f"   {sector}: {count} mentions")

    print("="*50 + "\n")

    # Output to file if specified
    if output_path:
        output_data = {
            "collection": collection.to_chromadb_format(),
            "summary": summary if include_summary else None
        }

        if output_format == "jsonl":
            collection.to_jsonl_file(output_path)
            print(f"💾 Saved to {output_path} (JSON Lines format)")
        elif output_format == "json":
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump([doc.to_dict() for doc in collection.documents], f, indent=2, default=str)
            print(f"💾 Saved to {output_path} (JSON array format)")
        else:  # chromadb format
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, default=str)
            print(f"💾 Saved to {output_path} (ChromaDB format)")

        # Also save summary separately if requested
        if include_summary:
            summary_path = output_path.replace('.json', '_summary.json')
            with open(summary_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, default=str)
            print(f"📋 Summary saved to {summary_path}")

    return collection


def run_demo():
    """Run a demonstration with sample data."""
    demo_messages = """[06/06/2025, 09:15:00] ~ {Charles}: Good morning! Looking at AMZN pre-market, AWS revenue looking strong
[06/06/2025, 09:18:23] ~ {Sarah}: Tesla's Robotaxi announcement next week, TSLA could breakout
[06/06/2025, 09:22:45] ~ {Mike}: NVDA hitting ATH again, AI chip demand is insane. Blackwell sales through the roof
[06/06/2025, 09:30:00] ~ {Charles}: Anyone looking at AAPL? Vision Pro getting mixed reviews
[06/06/2025, 09:35:12] ~ {Lisa}: Microsoft Copilot integration across Office is bullish for MSFT
[06/06/2025, 09:40:30] ~ {Sarah}: Palantir PLTR getting more government contracts, Alex Karp interview was good
[06/06/2025, 09:45:00] ~ {Mike}: Google's Gemini update is impressive, GOOGL undervalued vs Meta
[06/06/2025, 10:00:00] ~ {Charles}: Amazon's Trainium 2 chips could challenge NVDA in the long term
[06/06/2025, 10:15:00] ~ {Lisa}: Elon Musk tweeted about Optimus again, Tesla robotics is the future
[06/06/2025, 10:30:00] ~ {Sarah}: Coinbase COIN up 5% on Bitcoin rally, ETF flows strong
"""

    print("🎮 Running demo with sample messages...\n")

    # Initialize components
    parser = MessageParser()
    enrichment_engine = EnrichmentEngine()
    formatter = ChromaDBFormatter(enrichment_engine)

    # Parse and process
    messages = parser.parse_text(demo_messages)
    collection = formatter.format_messages(messages)
    summary = formatter.create_enrichment_summary(collection)

    # Display results
    print("="*60)
    print("📊 DEMO RESULTS")
    print("="*60)

    print(f"\nTotal messages parsed: {len(messages)}")
    print(f"Messages with stock mentions: {summary['messages_with_stock_mentions']}")

    print("\n🎯 TICKERS FOUND (Highest Priority):")
    for ticker, count in summary['ticker_frequency'].items():
        print(f"   ${ticker}: {count} mention(s)")

    print("\n🏢 COMPANIES IDENTIFIED:")
    for company, count in summary['company_frequency'].items():
        print(f"   {company}: {count} mention(s)")

    print("\n📊 SECTOR BREAKDOWN:")
    for sector, count in summary['sector_breakdown'].items():
        print(f"   {sector}: {count}")

    print("\n" + "="*60)
    print("📄 CHROMADB OUTPUT FORMAT (first 2 documents):")
    print("="*60)

    chromadb_format = collection.to_chromadb_format()
    preview = {
        "ids": chromadb_format["ids"][:2],
        "documents": chromadb_format["documents"][:2],
        "metadatas": chromadb_format["metadatas"][:2]
    }
    print(json.dumps(preview, indent=2, default=str))

    print("\n" + "="*60)
    print("💡 USAGE WITH CHROMADB:")
    print("="*60)
    print("""
import chromadb

# Initialize client
client = chromadb.Client()
collection = client.create_collection("stock_messages")

# Load the JSON output
import json
with open("output.json") as f:
    data = json.load(f)

# Add to ChromaDB
collection.add(
    ids=data["collection"]["ids"],
    documents=data["collection"]["documents"],
    metadatas=data["collection"]["metadatas"]
)

# Query by ticker
results = collection.query(
    query_texts=["Amazon stock news"],
    where={"tickers": {"$contains": "AMZN"}},
    n_results=10
)
""")

    # Save demo output
    demo_output_path = "demo_output.json"
    with open(demo_output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "collection": collection.to_chromadb_format(),
            "summary": summary
        }, f, indent=2, default=str)
    print(f"\n💾 Demo output saved to: {demo_output_path}")


def add_custom_company(
    key: str,
    name: str,
    tickers: list,
    keywords: list,
    sector: str = "Other"
):
    """Helper to add custom companies to the database."""
    COMPANY_DATABASE[key] = CompanyProfile(
        name=name,
        tickers=set(tickers),
        keywords=set(keywords),
        sector=sector
    )


def main():
    parser = argparse.ArgumentParser(
        description="Parse chat messages and enrich with stock/company data for ChromaDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py messages.txt
  python main.py messages.txt --output enriched.json
  python main.py messages.txt --output data.jsonl --format jsonl
  python main.py --demo
        """
    )

    parser.add_argument(
        "input_file",
        nargs="?",
        help="Path to input text file with messages"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file path (default: <input>_enriched.json)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["json", "jsonl", "chromadb"],
        default="chromadb",
        help="Output format (default: chromadb)"
    )
    parser.add_argument(
        "--no-summary",
        action="store_true",
        help="Don't include enrichment summary"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run demonstration with sample data"
    )

    args = parser.parse_args()

    if args.demo:
        run_demo()
        return

    if not args.input_file:
        parser.print_help()
        sys.exit(1)

    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"❌ Error: File not found: {args.input_file}")
        sys.exit(1)

    output_path = args.output
    if not output_path:
        output_path = str(input_path.stem) + "_enriched.json"

    process_file(
        str(input_path),
        output_path,
        args.format,
        include_summary=not args.no_summary
    )


if __name__ == "__main__":
    main()
