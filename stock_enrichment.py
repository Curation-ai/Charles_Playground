"""
Simple stock extraction and enrichment from chat file.
Extracts unique stocks and enriches with ticker + related keywords.
"""

# Extracted stocks with enrichment data
# Format: {Company: {ticker, keywords...}}

ENRICHED_STOCKS = {
    "Amazon": {"AMZN", "0R1O", "AWS", "Amazon Web Services", "AI", "AI chips", "Tranium 2", "Cloud", "Retail", "E-commerce", "Prime", "ReInvent"},

    "Tesla": {"TSLA", "EV", "Electric Vehicles", "Robotaxi", "Robotics", "Humanoid", "Optimus", "Elon Musk", "Energy Storage", "Batteries", "xAI"},

    "ASP Isotopes": {"ASPI", "Uranium", "Nuclear", "HALEU", "Green Energy", "Industrial Isotopes", "Minor Metals", "QLE", "TerraPower", "Enrichment"},

    "Nvidia": {"NVDA", "Chips", "AI", "GPU", "Data Centers", "HBM4", "Jensen Huang", "Semiconductors"},

    "Peloton": {"PTON", "Fitness", "GLP-1", "Healthcare", "Longevity", "Sport", "Subscription", "Connected Fitness"},

    "Palantir": {"PLTR", "Peter Thiel", "Big Data", "Ontology", "AI", "Defence Tech", "Government", "SaaS", "Edge Computing"},

    "Oxford Nanopore": {"ONT", "Healthcare", "NHS", "Science", "Sequencing", "Genetics", "NGS", "Long-read", "Larry Ellison", "Roche"},

    "Boeing": {"BA", "Travel", "Aviation", "Space & Security", "Defence", "Aerospace", "Manufacturing"},

    "Evolv": {"EVLV", "Weapons Detection", "AI Screening", "AI", "SaaS", "Defence", "Safety", "Stadium", "Security"},

    "MeiraGTx": {"MGTX", "Riboswitch", "Parkinson's Disease", "J&J", "Johnson & Johnson", "Sanofi", "Gene Therapy", "AAV-GAD", "Eli Lilly", "Blindness", "Ophthalmology"},

    "Microsoft": {"MSFT", "Azure", "Cloud", "AI", "Quantum", "Majorana 1", "OpenAI", "Software"},

    "Alibaba": {"BABA", "China", "E-commerce", "Cloud", "AI", "Fintech", "Ant Group"},

    "UnitedHealth": {"UNH", "Healthcare", "Insurance", "Medicare Advantage", "Value Based Care"},

    "Novo Nordisk": {"NVO", "NOVO", "GLP-1", "Obesity", "Diabetes", "Ozempic", "Wegovy", "Pharma"},

    "Lightbridge": {"LTBR", "Nuclear", "Fuel", "Uranium", "Advanced Fuel", "SMR"},

    "NuScale Power": {"SMR", "Nuclear", "Small Modular Reactors", "Clean Energy"},

    "Centrus Energy": {"LEU", "Uranium", "Nuclear", "Enrichment", "HALEU"},

    "Oklo": {"OKLO", "Nuclear", "SMR", "Clean Energy", "Sam Altman"},

    "Cameco": {"CCJ", "Uranium", "Mining", "Nuclear", "Canada"},

    "Yellow Cake": {"YCA", "Uranium", "Physical", "Commodity", "Trust"},

    "Newmont": {"NEM", "Gold", "Mining", "Precious Metals"},

    "Barrick Gold": {"GOLD", "Gold", "Mining", "Precious Metals"},

    "Allied Gold": {"AAUC", "Gold", "Mining", "Africa", "Kurmuk"},

    "Baidu": {"BIDU", "China", "Search", "AI", "Autonomous Driving", "Cloud"},

    "JD.com": {"JD", "China", "E-commerce", "Logistics", "Retail"},

    "Tencent": {"TCEHY", "0700", "China", "Gaming", "Social Media", "WeChat", "Fintech"},

    "Pioneer Power Solutions": {"PPSI", "EV Charging", "Mobile Chargers", "Infrastructure", "Micro Cap"},

    "Vestas": {"VWS", "Wind", "Renewables", "Green Energy", "Turbines"},

    "Ceres Power": {"CWR", "Hydrogen", "Fuel Cells", "Bosch", "Clean Energy"},

    "Lloyds Bank": {"LLOY", "Banking", "UK", "Financial Services"},

    "Planet Fitness": {"PLNT", "Fitness", "Gym", "GLP-1", "Consumer"},

    "Technogym": {"TGYM", "Fitness", "Equipment", "Treadmills", "Consumer"},

    "Silex": {"SLX", "Uranium", "Enrichment", "Australia", "Nuclear"},

    "Seraphim Space": {"SSIT", "Space", "Investing", "Satellites", "NAV Discount"},

    "Illumina": {"ILMN", "Sequencing", "Genomics", "Healthcare", "Diagnostics"},

    "GameStop": {"GME", "Retail", "Meme Stock", "Bitcoin", "Ryan Cohen"},

    "HSBC": {"HSBA", "Banking", "Asia", "Financial Services"},

    "Indra Sistemas": {"IDR", "Defence", "European Defence", "Spain", "Technology"},

    "Renk": {"RENK", "Defence", "European Defence", "Germany", "Tanks"},

    "Avio": {"AVIO", "Defence", "European Defence", "Space", "Italy", "NATO"},

    "OSI Systems": {"OSIS", "Security", "Inspection", "Screening", "Defence"},

    "ArcelorMittal": {"MT", "Steel", "Mining", "Commodities", "Infrastructure"},

    "Turkcell": {"TKC", "Turkey", "Telecom", "Emerging Markets"},

    "BYD": {"BYDDY", "1211", "China", "EV", "Electric Vehicles", "Batteries"},

    "Raspberry Pi": {"RPI", "Technology", "Hardware", "Robotics", "IoT"},

    "Symbotic": {"SYM", "Robotics", "Automation", "Walmart", "Warehouse"},

    "UEC": {"UEC", "Uranium", "Mining", "Nuclear", "USA"},
}


def display_stocks():
    """Display all enriched stocks in the requested format."""
    print("\n" + "="*70)
    print("ENRICHED STOCK DATABASE")
    print("="*70 + "\n")

    for company, tags in sorted(ENRICHED_STOCKS.items()):
        tags_str = ", ".join(sorted(tags))
        print(f"{{{company}: {{{tags_str}}}}}")
    print()


def get_stock(name):
    """Get enrichment data for a specific stock."""
    if name in ENRICHED_STOCKS:
        return {name: ENRICHED_STOCKS[name]}
    # Search by ticker
    for company, tags in ENRICHED_STOCKS.items():
        if name.upper() in [t.upper() for t in tags]:
            return {company: tags}
    return None


def to_json():
    """Export as JSON-compatible dict."""
    return {k: list(v) for k, v in ENRICHED_STOCKS.items()}


if __name__ == "__main__":
    display_stocks()
    print(f"Total stocks enriched: {len(ENRICHED_STOCKS)}")
