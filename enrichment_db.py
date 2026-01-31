"""
Company and ticker enrichment database.
Maps companies to their tickers and related keywords for message enrichment.
"""

from typing import Dict, Set, List, Optional
from dataclasses import dataclass


@dataclass
class CompanyProfile:
    """Profile containing company information for enrichment."""
    name: str
    tickers: Set[str]
    keywords: Set[str]
    sector: str

    def all_identifiers(self) -> Set[str]:
        """Return all identifiers that could match this company."""
        identifiers = set()
        identifiers.add(self.name.lower())
        identifiers.update(t.lower() for t in self.tickers)
        identifiers.update(k.lower() for k in self.keywords)
        return identifiers


# Company enrichment database - tickers are highest priority
COMPANY_DATABASE: Dict[str, CompanyProfile] = {
    "amazon": CompanyProfile(
        name="Amazon",
        tickers={"AMZN", "0R1O"},
        keywords={
            "AWS", "Amazon Web Services", "Prime", "Alexa",
            "AI chips", "AWS AI", "Trainium", "Trainium 2",
            "Inferentia", "Bedrock", "EC2", "S3", "Lambda",
            "Whole Foods", "Ring", "Twitch", "MGM", "Kuiper"
        },
        sector="Technology/E-commerce"
    ),
    "tesla": CompanyProfile(
        name="Tesla",
        tickers={"TSLA"},
        keywords={
            "Robotics", "EV", "EVs", "Electric Vehicle", "Robotaxi",
            "Humanoid robotics", "Optimus", "Defence", "Defense",
            "Batteries", "Gigafactory", "Supercharger", "Autopilot",
            "FSD", "Full Self-Driving", "Cybertruck", "Model S",
            "Model 3", "Model X", "Model Y", "Powerwall", "Megapack",
            "Solar Roof", "Elon Musk", "Musk"
        },
        sector="Automotive/Energy"
    ),
    "apple": CompanyProfile(
        name="Apple",
        tickers={"AAPL", "0R2V"},
        keywords={
            "iPhone", "iPad", "Mac", "MacBook", "Apple Watch",
            "AirPods", "Vision Pro", "iOS", "macOS", "App Store",
            "Apple TV", "Apple Music", "iCloud", "M1", "M2", "M3", "M4",
            "Apple Silicon", "Tim Cook", "Siri", "Apple Intelligence"
        },
        sector="Technology"
    ),
    "microsoft": CompanyProfile(
        name="Microsoft",
        tickers={"MSFT", "0QYP"},
        keywords={
            "Windows", "Azure", "Office", "Office 365", "Teams",
            "LinkedIn", "GitHub", "Xbox", "Bing", "Copilot",
            "OpenAI", "ChatGPT", "Surface", "Visual Studio",
            "VS Code", "Satya Nadella", "Activision", "Blizzard"
        },
        sector="Technology"
    ),
    "nvidia": CompanyProfile(
        name="NVIDIA",
        tickers={"NVDA", "0R1G"},
        keywords={
            "GPU", "GPUs", "Graphics", "GeForce", "RTX", "CUDA",
            "AI chips", "H100", "H200", "A100", "Blackwell", "Hopper",
            "DGX", "Omniverse", "Jensen Huang", "Data Center",
            "Gaming", "Automotive", "Mellanox", "Arm"
        },
        sector="Semiconductors"
    ),
    "google": CompanyProfile(
        name="Google",
        tickers={"GOOGL", "GOOG"},
        keywords={
            "Alphabet", "YouTube", "Android", "Chrome", "Search",
            "Google Cloud", "GCP", "Waymo", "DeepMind", "Gemini",
            "Bard", "Pixel", "Nest", "Gmail", "Google Maps",
            "Google Drive", "Sundar Pichai", "TPU", "Tensor"
        },
        sector="Technology"
    ),
    "meta": CompanyProfile(
        name="Meta",
        tickers={"META"},
        keywords={
            "Facebook", "Instagram", "WhatsApp", "Messenger",
            "Oculus", "Quest", "VR", "Virtual Reality", "Metaverse",
            "Reels", "Threads", "Mark Zuckerberg", "Zuckerberg",
            "LLaMA", "AI", "Reality Labs"
        },
        sector="Technology"
    ),
    "palantir": CompanyProfile(
        name="Palantir",
        tickers={"PLTR"},
        keywords={
            "Gotham", "Foundry", "AIP", "Apollo", "Data Analytics",
            "Government", "Defense", "Alex Karp", "Big Data",
            "AI Platform", "Ontology"
        },
        sector="Technology/Defense"
    ),
    "coinbase": CompanyProfile(
        name="Coinbase",
        tickers={"COIN"},
        keywords={
            "Crypto", "Cryptocurrency", "Bitcoin", "BTC", "Ethereum",
            "ETH", "Exchange", "Wallet", "Base", "Layer 2", "Web3"
        },
        sector="Fintech/Crypto"
    ),
    "amd": CompanyProfile(
        name="AMD",
        tickers={"AMD"},
        keywords={
            "Ryzen", "EPYC", "Radeon", "CPU", "GPU", "Xilinx",
            "MI300", "MI250", "Data Center", "Lisa Su", "Instinct",
            "ROCm", "Pensando"
        },
        sector="Semiconductors"
    ),
    "intel": CompanyProfile(
        name="Intel",
        tickers={"INTC"},
        keywords={
            "Core", "Xeon", "Arc", "Foundry", "Altera", "Mobileye",
            "Pat Gelsinger", "IDM 2.0", "Gaudi", "Habana"
        },
        sector="Semiconductors"
    ),
    "broadcom": CompanyProfile(
        name="Broadcom",
        tickers={"AVGO"},
        keywords={
            "VMware", "Symantec", "CA Technologies", "Networking",
            "Semiconductors", "Infrastructure Software", "ASIC"
        },
        sector="Semiconductors"
    ),
    "netflix": CompanyProfile(
        name="Netflix",
        tickers={"NFLX"},
        keywords={
            "Streaming", "Content", "Originals", "Ad-tier",
            "Password sharing", "Reed Hastings", "Ted Sarandos"
        },
        sector="Entertainment"
    ),
    "disney": CompanyProfile(
        name="Disney",
        tickers={"DIS"},
        keywords={
            "Disney+", "ESPN", "Hulu", "Marvel", "Star Wars",
            "Pixar", "Parks", "Theme Parks", "Bob Iger", "Streaming"
        },
        sector="Entertainment"
    ),
    "jpmorgan": CompanyProfile(
        name="JPMorgan",
        tickers={"JPM"},
        keywords={
            "Chase", "Investment Banking", "Jamie Dimon",
            "Asset Management", "Trading", "Wealth Management"
        },
        sector="Finance"
    ),
    "berkshire": CompanyProfile(
        name="Berkshire Hathaway",
        tickers={"BRK.A", "BRK.B", "BRK"},
        keywords={
            "Warren Buffett", "Buffett", "Charlie Munger",
            "GEICO", "Insurance", "Value Investing"
        },
        sector="Conglomerate"
    ),
    "spacex": CompanyProfile(
        name="SpaceX",
        tickers=set(),  # Private company
        keywords={
            "Starlink", "Falcon", "Falcon 9", "Starship",
            "Dragon", "Crew Dragon", "Elon Musk", "Musk",
            "Rocket", "Launch", "ISS", "NASA"
        },
        sector="Aerospace"
    ),
    "openai": CompanyProfile(
        name="OpenAI",
        tickers=set(),  # Private company
        keywords={
            "ChatGPT", "GPT-4", "GPT-5", "DALL-E", "Whisper",
            "Sam Altman", "AGI", "AI Safety", "Codex", "Sora"
        },
        sector="AI"
    ),
    "anthropic": CompanyProfile(
        name="Anthropic",
        tickers=set(),  # Private company
        keywords={
            "Claude", "Constitutional AI", "Dario Amodei",
            "AI Safety", "LLM"
        },
        sector="AI"
    ),
}


class EnrichmentEngine:
    """Engine to enrich messages with company/ticker information."""

    def __init__(self, database: Dict[str, CompanyProfile] = None):
        self.database = database or COMPANY_DATABASE
        self._build_index()

    def _build_index(self):
        """Build a reverse index for fast lookups."""
        self.keyword_index: Dict[str, List[str]] = {}

        for company_key, profile in self.database.items():
            for identifier in profile.all_identifiers():
                identifier_lower = identifier.lower()
                if identifier_lower not in self.keyword_index:
                    self.keyword_index[identifier_lower] = []
                self.keyword_index[identifier_lower].append(company_key)

    def find_companies_in_text(self, text: str) -> List[Dict]:
        """
        Find all company references in text.
        Returns list of enrichment data with tickers prioritized.
        """
        text_lower = text.lower()
        words = set(text_lower.split())
        found_companies = set()

        # Check for exact word matches first (tickers, single keywords)
        for word in words:
            # Clean punctuation
            clean_word = word.strip('.,!?;:()[]{}"\'-')
            if clean_word in self.keyword_index:
                found_companies.update(self.keyword_index[clean_word])

        # Check for multi-word phrases
        for company_key, profile in self.database.items():
            for keyword in profile.keywords:
                if len(keyword.split()) > 1:  # Multi-word phrase
                    if keyword.lower() in text_lower:
                        found_companies.add(company_key)

        # Build enrichment results
        results = []
        for company_key in found_companies:
            profile = self.database[company_key]
            results.append({
                "company": profile.name,
                "tickers": list(profile.tickers),
                "matched_keywords": self._find_matched_keywords(text_lower, profile),
                "sector": profile.sector,
                "all_related_keywords": list(profile.keywords)
            })

        # Sort by number of tickers (prioritize companies with tickers)
        results.sort(key=lambda x: len(x["tickers"]), reverse=True)

        return results

    def _find_matched_keywords(self, text_lower: str, profile: CompanyProfile) -> List[str]:
        """Find which specific keywords matched in the text."""
        matched = []

        # Check tickers first (highest priority)
        for ticker in profile.tickers:
            if ticker.lower() in text_lower:
                matched.append(ticker)

        # Check company name
        if profile.name.lower() in text_lower:
            matched.append(profile.name)

        # Check other keywords
        for keyword in profile.keywords:
            if keyword.lower() in text_lower:
                matched.append(keyword)

        return list(set(matched))

    def add_company(self, key: str, profile: CompanyProfile):
        """Add a new company to the database."""
        self.database[key] = profile
        self._build_index()

    def get_all_tickers(self) -> Set[str]:
        """Get all known tickers."""
        tickers = set()
        for profile in self.database.values():
            tickers.update(profile.tickers)
        return tickers


if __name__ == "__main__":
    # Test the enrichment engine
    engine = EnrichmentEngine()

    test_messages = [
        "AMZN is looking strong today, AWS revenue keeps growing",
        "Tesla's Robotaxi launch could be a game changer for TSLA",
        "NVDA hitting all time highs on AI chip demand",
        "Bought some Apple and Microsoft shares today",
    ]

    for msg in test_messages:
        print(f"\nMessage: {msg}")
        enrichments = engine.find_companies_in_text(msg)
        for e in enrichments:
            print(f"  -> {e['company']}: Tickers={e['tickers']}, Matched={e['matched_keywords']}")
