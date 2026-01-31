"""
ChromaDB-compatible output formatter.
Structures parsed and enriched messages for ChromaDB ingestion.
"""

import json
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

from message_parser import ParsedMessage
from enrichment_db import EnrichmentEngine, CompanyProfile


@dataclass
class ChromaDBDocument:
    """
    Represents a document ready for ChromaDB ingestion.

    ChromaDB expects:
    - ids: Unique identifiers
    - documents: Text content
    - metadatas: Dictionary of metadata
    - embeddings: (optional) Pre-computed embeddings
    """
    id: str
    document: str
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON export."""
        return {
            "id": self.id,
            "document": self.document,
            "metadata": self.metadata
        }


@dataclass
class ChromaDBCollection:
    """
    Represents a collection of documents for ChromaDB.
    Can be exported directly for use with chromadb.Collection.add()
    """
    documents: List[ChromaDBDocument] = field(default_factory=list)
    name: str = "messages"

    def add(self, doc: ChromaDBDocument):
        """Add a document to the collection."""
        self.documents.append(doc)

    def to_chromadb_format(self) -> Dict[str, List]:
        """
        Convert to format expected by chromadb.Collection.add()

        Returns:
            Dict with 'ids', 'documents', and 'metadatas' lists
        """
        return {
            "ids": [doc.id for doc in self.documents],
            "documents": [doc.document for doc in self.documents],
            "metadatas": [doc.metadata for doc in self.documents]
        }

    def to_json(self, indent: int = 2) -> str:
        """Export collection as JSON string."""
        return json.dumps(self.to_chromadb_format(), indent=indent, default=str)

    def to_json_file(self, file_path: str, indent: int = 2):
        """Export collection to a JSON file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_chromadb_format(), f, indent=indent, default=str)

    def to_jsonl(self) -> str:
        """Export as JSON Lines (one document per line)."""
        lines = []
        for doc in self.documents:
            lines.append(json.dumps(doc.to_dict(), default=str))
        return '\n'.join(lines)

    def to_jsonl_file(self, file_path: str):
        """Export to JSON Lines file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            for doc in self.documents:
                f.write(json.dumps(doc.to_dict(), default=str) + '\n')


class ChromaDBFormatter:
    """
    Formats parsed messages with enrichment for ChromaDB.
    """

    def __init__(self, enrichment_engine: Optional[EnrichmentEngine] = None):
        """
        Initialize formatter.

        Args:
            enrichment_engine: EnrichmentEngine instance for company/ticker enrichment
        """
        self.enrichment_engine = enrichment_engine or EnrichmentEngine()

    def _generate_id(self, message: ParsedMessage) -> str:
        """Generate a unique ID for a message."""
        # Create hash from timestamp, sender, and content
        content = f"{message.timestamp.isoformat()}|{message.sender}|{message.content}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _flatten_metadata(self, data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """
        Flatten nested metadata for ChromaDB compatibility.
        ChromaDB only supports string, int, float, bool values.
        """
        flat = {}
        for key, value in data.items():
            full_key = f"{prefix}_{key}" if prefix else key

            if isinstance(value, (str, int, float, bool)):
                flat[full_key] = value
            elif isinstance(value, list):
                # Convert lists to comma-separated strings
                flat[full_key] = ",".join(str(v) for v in value)
                flat[f"{full_key}_count"] = len(value)
            elif isinstance(value, dict):
                # Recursively flatten nested dicts
                flat.update(self._flatten_metadata(value, full_key))
            elif value is None:
                flat[full_key] = ""
            else:
                flat[full_key] = str(value)

        return flat

    def format_message(self, message: ParsedMessage) -> ChromaDBDocument:
        """
        Format a single message for ChromaDB.

        Args:
            message: ParsedMessage to format

        Returns:
            ChromaDBDocument ready for ingestion
        """
        # Get enrichment data
        enrichments = self.enrichment_engine.find_companies_in_text(message.content)

        # Build metadata
        metadata = {
            "timestamp": message.timestamp.isoformat(),
            "timestamp_unix": int(message.timestamp.timestamp()),
            "date": message.timestamp.strftime("%Y-%m-%d"),
            "time": message.timestamp.strftime("%H:%M:%S"),
            "year": message.timestamp.year,
            "month": message.timestamp.month,
            "day": message.timestamp.day,
            "hour": message.timestamp.hour,
            "day_of_week": message.timestamp.strftime("%A"),
            "sender": message.sender,
            "line_number": message.line_number,
            "content_length": len(message.content),
            "word_count": len(message.content.split()),
        }

        # Add enrichment data
        if enrichments:
            # All tickers found (prioritized)
            all_tickers = []
            all_companies = []
            all_sectors = []
            all_matched_keywords = []

            for e in enrichments:
                all_tickers.extend(e["tickers"])
                all_companies.append(e["company"])
                all_sectors.append(e["sector"])
                all_matched_keywords.extend(e["matched_keywords"])

            metadata["tickers"] = ",".join(all_tickers) if all_tickers else ""
            metadata["ticker_count"] = len(all_tickers)
            metadata["companies"] = ",".join(all_companies)
            metadata["company_count"] = len(all_companies)
            metadata["sectors"] = ",".join(set(all_sectors))
            metadata["matched_keywords"] = ",".join(set(all_matched_keywords))
            metadata["has_stock_mention"] = len(all_tickers) > 0

            # Store first/primary ticker for easy filtering
            if all_tickers:
                metadata["primary_ticker"] = all_tickers[0]
        else:
            metadata["tickers"] = ""
            metadata["ticker_count"] = 0
            metadata["companies"] = ""
            metadata["company_count"] = 0
            metadata["sectors"] = ""
            metadata["matched_keywords"] = ""
            metadata["has_stock_mention"] = False

        return ChromaDBDocument(
            id=self._generate_id(message),
            document=message.content,
            metadata=metadata
        )

    def format_messages(self, messages: List[ParsedMessage]) -> ChromaDBCollection:
        """
        Format multiple messages for ChromaDB.

        Args:
            messages: List of ParsedMessage objects

        Returns:
            ChromaDBCollection ready for ingestion
        """
        collection = ChromaDBCollection()

        for message in messages:
            doc = self.format_message(message)
            collection.add(doc)

        return collection

    def create_enrichment_summary(self, collection: ChromaDBCollection) -> Dict[str, Any]:
        """
        Create a summary of enrichment data from the collection.

        Args:
            collection: ChromaDBCollection to summarize

        Returns:
            Summary statistics and enrichment breakdown
        """
        summary = {
            "total_messages": len(collection.documents),
            "messages_with_stock_mentions": 0,
            "unique_tickers": set(),
            "unique_companies": set(),
            "unique_senders": set(),
            "ticker_frequency": {},
            "company_frequency": {},
            "sector_breakdown": {},
            "date_range": {"earliest": None, "latest": None}
        }

        for doc in collection.documents:
            meta = doc.metadata

            summary["unique_senders"].add(meta["sender"])

            if meta.get("has_stock_mention"):
                summary["messages_with_stock_mentions"] += 1

            # Track tickers
            tickers = meta.get("tickers", "")
            if tickers:
                for ticker in tickers.split(","):
                    ticker = ticker.strip()
                    if ticker:
                        summary["unique_tickers"].add(ticker)
                        summary["ticker_frequency"][ticker] = summary["ticker_frequency"].get(ticker, 0) + 1

            # Track companies
            companies = meta.get("companies", "")
            if companies:
                for company in companies.split(","):
                    company = company.strip()
                    if company:
                        summary["unique_companies"].add(company)
                        summary["company_frequency"][company] = summary["company_frequency"].get(company, 0) + 1

            # Track sectors
            sectors = meta.get("sectors", "")
            if sectors:
                for sector in sectors.split(","):
                    sector = sector.strip()
                    if sector:
                        summary["sector_breakdown"][sector] = summary["sector_breakdown"].get(sector, 0) + 1

            # Track date range
            timestamp = meta.get("timestamp")
            if timestamp:
                if summary["date_range"]["earliest"] is None or timestamp < summary["date_range"]["earliest"]:
                    summary["date_range"]["earliest"] = timestamp
                if summary["date_range"]["latest"] is None or timestamp > summary["date_range"]["latest"]:
                    summary["date_range"]["latest"] = timestamp

        # Convert sets to lists for JSON serialization
        summary["unique_tickers"] = sorted(list(summary["unique_tickers"]))
        summary["unique_companies"] = sorted(list(summary["unique_companies"]))
        summary["unique_senders"] = sorted(list(summary["unique_senders"]))

        # Sort frequencies
        summary["ticker_frequency"] = dict(sorted(
            summary["ticker_frequency"].items(),
            key=lambda x: x[1],
            reverse=True
        ))
        summary["company_frequency"] = dict(sorted(
            summary["company_frequency"].items(),
            key=lambda x: x[1],
            reverse=True
        ))

        return summary


if __name__ == "__main__":
    from message_parser import MessageParser

    # Test with sample data
    parser = MessageParser()
    formatter = ChromaDBFormatter()

    test_messages = """
[06/06/2025, 15:27:23] ~ {John}: AMZN looking strong today, AWS keeps growing
[06/06/2025, 15:28:45] ~ {Jane}: Tesla's Robotaxi launch is exciting! TSLA to the moon
[06/06/2025, 15:30:00] ~ {Bob}: Anyone watching NVDA? AI chip demand is insane
[07/06/2025, 09:15:30] ~ {Alice}: Good morning everyone! Apple event next week
    """

    messages = parser.parse_text(test_messages)
    collection = formatter.format_messages(messages)

    print("=== ChromaDB Format ===")
    print(collection.to_json())

    print("\n=== Summary ===")
    summary = formatter.create_enrichment_summary(collection)
    print(json.dumps(summary, indent=2))
