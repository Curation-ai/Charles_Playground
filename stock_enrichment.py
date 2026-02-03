"""
Simple stock extraction and enrichment from chat file.
Extracts unique stocks and enriches with ticker + related keywords.
"""

# Extracted stocks with enrichment data
# Format: {Company: {ticker, keywords...}}

ENRICHED_STOCKS = {
    # Big Tech / Mag 7
    "Amazon": {"AMZN", "0R1O", "AWS", "Amazon Web Services", "AI", "AI chips", "Tranium 2", "Cloud", "Retail", "E-commerce", "Prime", "ReInvent"},
    "Tesla": {"TSLA", "EV", "Electric Vehicles", "Robotaxi", "Robotics", "Humanoid", "Optimus", "Elon Musk", "Energy Storage", "Batteries", "xAI", "Autonomous Driving"},
    "Nvidia": {"NVDA", "Chips", "AI", "GPU", "Data Centers", "HBM4", "Jensen Huang", "Semiconductors", "Blackwell"},
    "Microsoft": {"MSFT", "Azure", "Cloud", "AI", "Quantum", "Majorana 1", "OpenAI", "Software", "Copilot"},
    "Alphabet": {"GOOGL", "GOOG", "Google", "Search", "YouTube", "Cloud", "AI", "DeepMind", "Waymo", "Quantum Computing"},
    "Apple": {"AAPL", "iPhone", "Services", "Hardware", "Ecosystem", "AI", "Vision Pro"},
    "Meta": {"META", "Facebook", "Instagram", "WhatsApp", "Metaverse", "AI", "Social Media", "Advertising"},

    # Uranium / Nuclear
    "ASP Isotopes": {"ASPI", "Uranium", "Nuclear", "HALEU", "Green Energy", "Industrial Isotopes", "Minor Metals", "QLE", "TerraPower", "Enrichment"},
    "Lightbridge": {"LTBR", "Nuclear", "Fuel", "Uranium", "Advanced Fuel", "SMR", "Metal Fuel Rods"},
    "NuScale Power": {"SMR", "Nuclear", "Small Modular Reactors", "Clean Energy"},
    "Centrus Energy": {"LEU", "Uranium", "Nuclear", "Enrichment", "HALEU"},
    "Oklo": {"OKLO", "Nuclear", "SMR", "Clean Energy", "Sam Altman"},
    "Cameco": {"CCJ", "Uranium", "Mining", "Nuclear", "Canada"},
    "Yellow Cake": {"YCA", "Uranium", "Physical", "Commodity", "Trust"},
    "Silex": {"SLX", "Uranium", "Enrichment", "Australia", "Nuclear"},
    "UEC": {"UEC", "Uranium", "Mining", "Nuclear", "USA"},
    "Sprott Physical Uranium": {"SPUT", "U.U", "Uranium", "Physical", "Trust", "ETF"},
    "Ur-Energy": {"URG", "Uranium", "Mining", "USA", "ISR"},
    "enCore Energy": {"EU", "Uranium", "Mining", "USA"},
    "Peninsula Energy": {"PENMF", "Uranium", "Mining", "Wyoming"},

    # Healthcare / Pharma / Biotech
    "Oxford Nanopore": {"ONT", "Healthcare", "NHS", "Science", "Sequencing", "Genetics", "NGS", "Long-read", "Larry Ellison", "Roche", "Epigenetics"},
    "MeiraGTx": {"MGTX", "Riboswitch", "Parkinson's Disease", "J&J", "Johnson & Johnson", "Sanofi", "Gene Therapy", "AAV-GAD", "Eli Lilly", "Blindness", "Ophthalmology"},
    "UnitedHealth": {"UNH", "Healthcare", "Insurance", "Medicare Advantage", "Value Based Care", "Optum"},
    "Novo Nordisk": {"NVO", "NOVO", "GLP-1", "Obesity", "Diabetes", "Ozempic", "Wegovy", "Pharma", "CagriSema"},
    "Eli Lilly": {"LLY", "GLP-1", "Obesity", "Diabetes", "Zepbound", "Mounjaro", "Pharma"},
    "Illumina": {"ILMN", "Sequencing", "Genomics", "Healthcare", "Diagnostics"},
    "Immutep": {"IMM", "Biotech", "Cancer", "Immunotherapy", "Keytruda", "LAG-3"},
    "Implantica": {"IMP-A-SDB", "Medical Devices", "RefluxStop", "NHS", "GI"},

    # Defence / Security
    "Boeing": {"BA", "Travel", "Aviation", "Space & Security", "Defence", "Aerospace", "Manufacturing"},
    "Evolv": {"EVLV", "Weapons Detection", "AI Screening", "AI", "SaaS", "Defence", "Safety", "Stadium", "Security"},
    "OSI Systems": {"OSIS", "Security", "Inspection", "Screening", "Defence", "Border", "Rapiscan"},
    "Indra Sistemas": {"IDR", "Defence", "European Defence", "Spain", "Technology"},
    "Renk": {"RENK", "Defence", "European Defence", "Germany", "Tanks"},
    "Avio": {"AVIO", "Defence", "European Defence", "Space", "Italy", "NATO", "Rockets", "Vega"},
    "Palantir": {"PLTR", "Peter Thiel", "Big Data", "Ontology", "AI", "Defence Tech", "Government", "SaaS", "Edge Computing"},
    "Smiths Group": {"SMIN", "Detection", "Security", "Industrial", "Spin-off"},
    "Axon": {"AXON", "Taser", "Police", "Body Cameras", "Law Enforcement"},
    "ZenaTech": {"ZENA", "Drones", "Agriculture", "Defence", "Military"},

    # Fitness / Consumer
    "Peloton": {"PTON", "Fitness", "GLP-1", "Healthcare", "Longevity", "Sport", "Subscription", "Connected Fitness"},
    "Planet Fitness": {"PLNT", "Fitness", "Gym", "GLP-1", "Consumer"},
    "Technogym": {"TGYM", "Fitness", "Equipment", "Treadmills", "Consumer"},
    "Nike": {"NKE", "Sportswear", "Footwear", "Apparel", "Consumer", "Retail"},
    "On Holding": {"ONON", "Running", "Shoes", "Federer", "Sportswear", "Zendaya"},
    "Starbucks": {"SBUX", "Coffee", "Consumer", "Retail", "Brian Niccol", "Footfall"},
    "Lululemon": {"LULU", "Athleisure", "Apparel", "Consumer"},

    # China Tech
    "Alibaba": {"BABA", "China", "E-commerce", "Cloud", "AI", "Fintech", "Ant Group"},
    "Baidu": {"BIDU", "China", "Search", "AI", "Autonomous Driving", "Cloud"},
    "JD.com": {"JD", "China", "E-commerce", "Logistics", "Retail"},
    "Tencent": {"TCEHY", "0700", "China", "Gaming", "Social Media", "WeChat", "Fintech"},
    "BYD": {"BYDDY", "1211", "China", "EV", "Electric Vehicles", "Batteries"},

    # Gold / Mining
    "Newmont": {"NEM", "Gold", "Mining", "Precious Metals"},
    "Barrick Gold": {"GOLD", "Gold", "Mining", "Precious Metals"},
    "Allied Gold": {"AAUC", "Gold", "Mining", "Africa", "Kurmuk"},

    # Crypto / Fintech
    "Coinbase": {"COIN", "Crypto", "Exchange", "Bitcoin", "Digital Assets"},
    "MicroStrategy": {"MSTR", "Bitcoin", "BTC", "Michael Saylor", "Treasury"},
    "Robinhood": {"HOOD", "Trading", "Retail", "Crypto", "Commission-free"},
    "Lemonade": {"LMND", "Insurance", "AI", "Insurtech", "Disruption"},

    # Semiconductors
    "TSMC": {"TSM", "Semiconductors", "Foundry", "Chips", "AI", "Taiwan"},
    "ASML": {"ASML", "Lithography", "EUV", "Semiconductors", "Equipment", "Monopoly"},
    "Intel": {"INTC", "Semiconductors", "Foundry", "Chips", "USA"},
    "AMD": {"AMD", "Semiconductors", "GPU", "CPU", "AI"},
    "Samsung": {"005930", "SSNLF", "Memory", "HBM", "Semiconductors", "Korea"},
    "Micron": {"MU", "Memory", "DRAM", "NAND", "Semiconductors"},
    "SK Hynix": {"000660", "Memory", "HBM", "Semiconductors", "Korea"},
    "Astera Labs": {"ALAB", "Connectivity", "Data Centers", "Semiconductors"},
    "Ouster": {"OUST", "LiDAR", "Sensors", "Autonomous", "Robotics"},

    # Energy / Commodities
    "Vestas": {"VWS", "Wind", "Renewables", "Green Energy", "Turbines"},
    "Ceres Power": {"CWR", "Hydrogen", "Fuel Cells", "Bosch", "Clean Energy"},
    "Golar LNG": {"GLNG", "LNG", "Natural Gas", "Shipping", "Energy"},
    "Flex LNG": {"FLNG", "LNG", "Shipping", "Natural Gas", "Tankers"},
    "Prysmian": {"PRY", "Cables", "High Voltage", "Data Centers", "Offshore Wind"},
    "Cadiz": {"CDZI", "Water", "California", "Infrastructure", "Aquifer"},

    # UK Stocks
    "IP Group": {"IPO", "Venture Capital", "Universities", "Spin-outs", "UK"},
    "Seraphim Space": {"SSIT", "Space", "Investing", "Satellites", "NAV Discount"},
    "Trustpilot": {"TRST", "Reviews", "Consumer", "SaaS", "UK"},
    "Fever-Tree": {"FEVR", "Beverages", "Tonic", "Premium Mixers", "Molson Coors"},
    "Raspberry Pi": {"RPI", "Technology", "Hardware", "Robotics", "IoT", "UK"},
    "Beazley": {"BEZ", "Insurance", "Specialty", "Lloyd's", "UK"},
    "Admiral": {"ADM", "Insurance", "Motor", "UK"},
    "LSEG": {"LSEG", "Exchange", "Data", "AI", "Microsoft", "Financial Services"},
    "Lloyds Bank": {"LLOY", "Banking", "UK", "Financial Services"},
    "HSBC": {"HSBA", "Banking", "Asia", "Financial Services"},
    "Direct Line": {"DLG", "Insurance", "Motor", "Aviva", "M&A"},
    "Aviva": {"AV", "Insurance", "UK", "Consolidation"},
    "Renewi": {"RWI", "Waste", "Recycling", "UK", "Netherlands"},
    "Kneat": {"KSI", "Software", "Validation", "Life Sciences", "SaaS"},
    "Herald Investment Trust": {"HRI", "Technology", "Investment Trust", "UK"},

    # Space
    "SpaceX": {"SPACE", "Rockets", "Starlink", "Elon Musk", "Private"},

    # Software / Cloud
    "Spotify": {"SPOT", "Music", "Streaming", "Podcasts", "Subscription"},
    "Zoom": {"ZM", "Video", "Conferencing", "SaaS", "Remote Work"},
    "Salesforce": {"CRM", "CRM", "Cloud", "SaaS", "Enterprise"},
    "Block": {"SQ", "Payments", "Square", "Cash App", "Fintech"},
    "Snowflake": {"SNOW", "Data", "Cloud", "Analytics", "AI"},

    # EV / Auto
    "Rivian": {"RIVN", "EV", "Electric Trucks", "Amazon", "Startup"},
    "Lucid": {"LCID", "EV", "Luxury", "Saudi", "Startup"},
    "Ferrari": {"RACE", "Luxury", "Auto", "F80", "Sports Cars"},
    "Wayve": {"WAYVE", "Autonomous", "AI", "UK", "Private"},

    # Other
    "Pioneer Power Solutions": {"PPSI", "EV Charging", "Mobile Chargers", "Infrastructure", "Micro Cap"},
    "GameStop": {"GME", "Retail", "Meme Stock", "Bitcoin", "Ryan Cohen"},
    "Soho House": {"SHCO", "Hospitality", "Membership", "Lifestyle", "Private Clubs"},
    "Helium": {"HNT", "Crypto", "IoT", "5G", "DePIN", "Telecom"},
    "ArcelorMittal": {"MT", "Steel", "Mining", "Commodities", "Infrastructure"},
    "Turkcell": {"TKC", "Turkey", "Telecom", "Emerging Markets"},
    "Symbotic": {"SYM", "Robotics", "Automation", "Walmart", "Warehouse"},
    "PB Fintech": {"POLICYBZR", "India", "Insurance", "Fintech", "PolicyBazaar"},
    "Power Nickel": {"PNPN", "Nickel", "Mining", "Canada", "Battery Metals"},
    "Schroders": {"SDR", "Asset Management", "UK", "Finance"},
    "Nokia": {"NOK", "Telecom", "5G", "Networks", "Finland"},
    "DBV Technologies": {"DBVT", "Biotech", "Allergies", "Peanut", "Viaskin"},

    # Additional Healthcare / Pharma
    "Merck": {"MRK", "Pharma", "Keytruda", "Oncology", "Immunotherapy"},
    "Roche": {"ROG", "RHHBY", "Pharma", "Diagnostics", "Oncology", "Sequencing"},

    # Additional Consumer / Retail
    "Chipotle": {"CMG", "Fast Casual", "Restaurants", "Consumer", "Brian Niccol"},
    "Shake Shack": {"SHAK", "Restaurants", "Fast Casual", "Consumer", "Burgers"},
    "Foot Locker": {"FL", "Retail", "Footwear", "Sneakers", "Consumer"},
    "Kraft Heinz": {"KHC", "Food", "Consumer Staples", "CPG"},
    "British American Tobacco": {"BTI", "BATS", "Tobacco", "Consumer Staples", "Dividend"},
    "Herbalife": {"HLF", "MLM", "Nutrition", "Consumer", "Controversy"},

    # Additional China / Emerging Markets
    "TAL Education": {"TAL", "China", "Education", "Tutoring", "Consumer"},
    "KWEB China Internet ETF": {"KWEB", "China", "ETF", "Internet", "Tech"},

    # Additional UK Stocks
    "abrdn": {"ABDN", "Asset Management", "UK", "Finance", "Aberdeen"},
    "St. James's Place": {"SJP", "Wealth Management", "UK", "Finance"},
    "Hargreaves Lansdown": {"HL", "Platform", "UK", "Finance", "Retail Investing"},
    "Burford Capital": {"BUR", "Litigation Finance", "Legal", "UK", "Muddy Waters"},
    "Kistos": {"KIST", "Oil & Gas", "North Sea", "UK", "Energy"},
    "Rockhopper": {"RKH", "Oil & Gas", "Exploration", "UK", "Falklands"},
    "Jersey Oil & Gas": {"JOG", "Oil & Gas", "North Sea", "UK", "Energy"},
    "Henderson Euro Trust": {"HNE", "Investment Trust", "Europe", "UK", "Small Caps"},
    "Intelligent Ultrasound": {"IUG", "Medical Devices", "AI", "UK", "Healthcare"},

    # Additional Fintech / Finance
    "Visa": {"V", "Payments", "Fintech", "Credit Cards", "Global"},
    "Icahn Enterprises": {"IEP", "Conglomerate", "Activist", "Carl Icahn"},
    "Partners Group": {"PGHN", "Private Equity", "Switzerland", "Asset Management"},
    "ICG": {"ICP", "Private Credit", "Asset Management", "UK", "Alternative Assets"},

    # Additional EV / Auto
    "Nikola": {"NKLA", "EV", "Hydrogen", "Trucks", "Hindenburg"},
    "Carvana": {"CVNA", "Used Cars", "E-commerce", "Auto", "Hindenburg"},
    "Luckin Coffee": {"LKNCY", "Coffee", "China", "Muddy Waters", "Consumer"},

    # Additional Tech / Data
    "Super Micro Computer": {"SMCI", "Servers", "Data Centers", "AI Infrastructure", "Short Attack"},
    "Netflix": {"NFLX", "Streaming", "Entertainment", "Subscription", "Content"},
    "Uber": {"UBER", "Rideshare", "Delivery", "Mobility", "Gig Economy"},

    # Additional Asset Managers
    "BlackRock": {"BLK", "Asset Management", "ETF", "iShares", "Larry Fink"},
    "Goldman Sachs": {"GS", "Investment Bank", "Trading", "Asset Management"},
    "JPMorgan": {"JPM", "Banking", "Investment Bank", "Asset Management", "Jamie Dimon"},
    "Morgan Stanley": {"MS", "Investment Bank", "Wealth Management", "Trading"},
    "T. Rowe Price": {"TROW", "Asset Management", "Mutual Funds", "Active Management"},

    # Space / Aerospace
    "Rocket Lab": {"RKLB", "Space", "Rockets", "Satellites", "Launch Services", "Peter Beck"},

    # Luxury / Fashion
    "LVMH": {"MC", "LVMUY", "Luxury", "Fashion", "Louis Vuitton", "Bernard Arnault"},
    "Richemont": {"CFR", "Luxury", "Watches", "Cartier", "YNAP", "Jewellery"},
    "MyTheresa": {"MYTE", "Luxury", "E-commerce", "Fashion", "YNAP"},

    # UK Fashion / E-commerce
    "ASOS": {"ASC", "Fashion", "E-commerce", "UK", "Online Retail"},
    "Boohoo": {"BOO", "Fashion", "E-commerce", "UK", "Fast Fashion"},

    # Additional Biotech / Healthcare
    "Cybin": {"CYBN", "Psychedelics", "Depression", "Biotech", "Mental Health", "RFK"},
    "Bristol-Myers Squibb": {"BMY", "Pharma", "Oncology", "Immunology", "Karuna"},
    "CRISPR Therapeutics": {"CRSP", "Gene Editing", "Biotech", "CRISPR", "RFK"},
    "INmune Bio": {"INMB", "Biotech", "Inflammation", "Cancer", "Neurodegeneration"},
    "Cardiol Therapeutics": {"CRDL", "Biotech", "Cardiology", "Heart Disease"},
    "Oxford Biomedica": {"OXB", "Gene Therapy", "Viral Vectors", "UK", "Biotech"},
    "Tempus AI": {"TEM", "Healthcare AI", "Diagnostics", "Precision Medicine", "Pelosi"},

    # Additional Fintech
    "SoFi": {"SOFI", "Fintech", "Banking", "Lending", "Student Loans"},
    "Coupang": {"CPNG", "E-commerce", "Korea", "Delivery", "Farfetch"},

    # Coal / Energy
    "Arch Resources": {"ARCH", "Coal", "Metallurgical", "Energy", "Mining"},
    "CONSOL Energy": {"CEIX", "Coal", "Energy", "Mining", "Pennsylvania"},

    # Additional Uranium
    "Kazatomprom": {"KAP", "Uranium", "Kazakhstan", "Mining", "Nuclear"},

    # Streaming / Media
    "Roku": {"ROKU", "Streaming", "Connected TV", "Advertising", "Platform"},

    # Conglomerates
    "Berkshire Hathaway": {"BRK.A", "BRK.B", "Conglomerate", "Warren Buffett", "Insurance", "Value"},

    # Additional UK
    "Barclays": {"BARC", "Banking", "UK", "Investment Bank", "Credit Cards"},
    "Phoenix Digital Assets": {"PNIX", "Crypto", "UK", "Digital Assets", "Bitcoin"},

    # Additional Auto
    "Volkswagen": {"VOW3", "VWAGY", "Auto", "EV", "Germany", "Europe"},

    # Additional Semiconductors / China
    "SMIC": {"0981", "Semiconductors", "China", "Foundry", "Chips"},

    # Additional Retail
    "Costco": {"COST", "Retail", "Warehouse", "Membership", "Gold Bars"},

    # Additional Defence / Security
    "Motorola Solutions": {"MSI", "Security", "Communications", "Police", "First Responders"},

    # Stocks added from chat analysis - European Defence
    "Leonardo": {"LDO", "Defence", "European Defence", "Italy", "Helicopters", "Aerospace"},
    "Babcock": {"BAB", "Defence", "UK", "Naval", "Marine", "Engineering"},
    "BAE Systems": {"BA.", "BAESY", "Defence", "UK", "Aerospace", "Naval"},
    "Rheinmetall": {"RHM", "Defence", "European Defence", "Germany", "Tanks", "Ammunition"},
    "Dassault Aviation": {"AM", "Defence", "France", "Rafale", "Fighter Jets", "Aerospace"},
    "MilDef": {"MILDEF", "Defence", "European Defence", "Sweden", "Rugged IT"},
    "Anduril": {"ANDURIL", "Defence Tech", "AI", "Drones", "Palmer Luckey", "Private"},

    # Space / Satellites
    "Eutelsat": {"ETL", "Satellites", "Telecom", "Space", "Broadband", "OneWeb"},

    # Biotech / Healthcare additions
    "Compass Pathways": {"CMPS", "Psychedelics", "Depression", "Biotech", "Mental Health", "Psilocybin"},
    "Innovent Biologics": {"1801", "China", "Biotech", "GLP-1", "Obesity", "Mazdutide"},

    # Crypto / Digital Assets
    "Marathon Digital": {"MARA", "Bitcoin", "Mining", "Crypto", "BTC"},
    "Riot Platforms": {"RIOT", "Bitcoin", "Mining", "Crypto", "BTC"},
    "CoinShares": {"CS", "Crypto", "Asset Management", "ETF", "Digital Assets"},
    "Bitcoin Group SE": {"ADE", "Crypto", "Bitcoin", "Germany", "Treasury", "Bank"},
    "Northern Data": {"NB2", "Data Centers", "AI", "Bitcoin Mining", "Germany"},

    # Building Materials / Infrastructure
    "Heidelberg Materials": {"HEI", "Building Materials", "Cement", "Germany", "Infrastructure"},
    "Holcim": {"HOLN", "Building Materials", "Cement", "Switzerland", "Infrastructure"},
    "CRH": {"CRH", "Building Materials", "Cement", "Ireland", "Infrastructure"},
    "ThyssenKrupp": {"TKA", "Steel", "Germany", "Industrial", "Engineering"},

    # Mining / Commodities additions
    "Fresnillo": {"FRES", "Silver", "Gold", "Mining", "Mexico", "Precious Metals"},
    "MP Materials": {"MP", "Rare Earths", "Mining", "USA", "Magnets", "EV"},
    "Rainbow Rare Earths": {"RBW", "Rare Earths", "Mining", "Recycling", "Critical Minerals"},
    "Alphamin": {"AFM", "Tin", "Mining", "DRC", "Critical Minerals"},
    "Tungsten West": {"TUN", "Tungsten", "Mining", "UK", "Critical Minerals", "Defence"},
    "Deep Yellow": {"DYL", "Uranium", "Mining", "Australia", "Namibia"},
    "Paladin Energy": {"PDN", "Uranium", "Mining", "Australia", "Nuclear"},
    "Fission Uranium": {"FCU", "Uranium", "Mining", "Canada", "Athabasca"},
    "Skyharbour Resources": {"SYH", "Uranium", "Mining", "Canada", "Athabasca", "Junior"},
    "Valterra": {"VAL", "PGM", "Platinum", "Mining", "South Africa", "Anglo"},

    # Offshore / Energy Services
    "Valaris": {"VAL", "Offshore", "Drilling", "Oil Services", "Deepwater"},
    "Seadrill": {"SDRL", "Offshore", "Drilling", "Oil Services", "Deepwater"},
    "Noble Corporation": {"NE", "Offshore", "Drilling", "Oil Services", "Deepwater"},
    "Saipem": {"SPM", "Offshore", "Engineering", "Oil Services", "Italy"},
    "Viridien": {"VIRI", "Seismic", "Oil Services", "Data", "Geoscience"},

    # Technology / Software additions
    "Vertiv": {"VRT", "Data Centers", "Infrastructure", "Cooling", "Power"},
    "Roblox": {"RBLX", "Gaming", "Metaverse", "Kids", "Platform", "UGC"},
    "Unity Software": {"U", "Gaming", "Engine", "3D", "Metaverse", "Developers"},

    # Live Events / Entertainment
    "Sphere Entertainment": {"SPHR", "Live Events", "Las Vegas", "Entertainment", "MSG"},
    "Live Nation": {"LYV", "Live Events", "Concerts", "Ticketmaster", "Entertainment"},
    "Eventbrite": {"EB", "Ticketing", "Events", "Platform", "SaaS"},
    "IMAX": {"IMAX", "Cinema", "Entertainment", "Technology", "Premium"},
    "Manchester United": {"MANU", "Sports", "Football", "UK", "Media"},
    "CTS Eventim": {"EVD", "Ticketing", "Events", "Germany", "Entertainment"},

    # Prisons / Real Assets
    "GEO Group": {"GEO", "Prisons", "REIT", "Immigration", "Corrections"},

    # Fintech additions
    "Marqeta": {"MQ", "Fintech", "Payments", "Cards", "API", "BaaS"},

    # Banking additions
    "BAWAG": {"BG", "Banking", "Austria", "Europe", "Cerberus"},

    # Industrials / Robotics
    "Fanuc": {"6954", "Robotics", "Japan", "Automation", "CNC", "Industrial"},
    "John Deere": {"DE", "Agriculture", "Tractors", "Robotics", "Automation", "Farming"},
    "SMC Corporation": {"6273", "Pneumatics", "Japan", "Automation", "Industrial"},
    "Schneider Electric": {"SU", "Industrial", "Energy Management", "Automation", "Data Centers"},

    # Aviation
    "Embraer": {"ERJ", "Aviation", "Brazil", "Regional Jets", "Defence", "Aerospace"},
    "Archer Aviation": {"ACHR", "eVTOL", "Flying Taxis", "Urban Air Mobility", "Anduril"},

    # Cannabis
    "Glass House Brands": {"GLASF", "Cannabis", "California", "Greenhouse", "USA"},

    # Social Media
    "Pinterest": {"PINS", "Social Media", "Visual Search", "E-commerce", "Advertising"},

    # Clean Energy
    "Atome Energy": {"ATOM", "Hydrogen", "Green Energy", "Iceland", "Paraguay", "Ammonia"},

    # Asset Management
    "Sprott Inc": {"SII", "Asset Management", "Commodities", "Gold", "Uranium", "ETF"},

    # Funds / Investment vehicles
    "Pershing Square Holdings": {"PSH", "Hedge Fund", "Bill Ackman", "Activism", "Concentrated"},
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
