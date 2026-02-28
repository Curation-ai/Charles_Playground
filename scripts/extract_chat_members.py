#!/usr/bin/env python3
"""
extract_chat_members.py
-----------------------
Parse a WhatsApp group chat TXT export and use the OpenAI API to extract
structured member profiles + their stock relationships.

Usage:
    python scripts/extract_chat_members.py /path/to/chat.txt

Output:
    scripts/members_extracted.json

Requirements:
    pip install openai
    OPENAI_API_KEY must be set in the environment, or the script will
    attempt to read it from the backend .env file automatically.
"""

import json
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

from openai import OpenAI

# ── Constants ────────────────────────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).parent
BACKEND_DIR  = SCRIPT_DIR.parent
OUTPUT_PATH  = SCRIPT_DIR / "members_extracted.json"
STOCKS_PATH  = SCRIPT_DIR / "enriched_stocks.json"
ENV_PATH     = BACKEND_DIR / ".env"

# Matches a WhatsApp message header: [DD/MM/YYYY, HH:MM:SS] ~ Name: or Name:
HEADER_RE = re.compile(
    r"^\[(\d{2}/\d{2}/\d{4}),\s+\d{2}:\d{2}:\d{2}\]\s+(?:~\s+)?([^:]+?):\s+(.*)"
)

# System-message fragments to skip entirely
SYSTEM_FRAGMENTS = [
    "image omitted",
    "video omitted",
    "audio omitted",
    "document omitted",
    "sticker omitted",
    "GIF omitted",
    "Contact card omitted",
    "Messages and calls are end-to-end encrypted",
    "changed the group name",
    "changed the group description",
    "added you",
    "was added",
    "left",
    "removed",
    "joined using this group's invite link",
    "changed this group's icon",
    "This message was deleted",
    "<Media omitted>",
]

INVESTOR_TYPES = [
    "Retail",
    "Professional",
    "Analyst",
    "Portfolio Manager",
    "Fund Manager",
    "VC / Angel",
    "Sell-side",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_api_key() -> str:
    """Return OPENAI_API_KEY from env or .env file."""
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key

    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENAI_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
                if key:
                    return key

    print("ERROR: OPENAI_API_KEY not found in environment or .env file.", file=sys.stderr)
    sys.exit(1)


def is_system_message(text: str) -> bool:
    t = text.lower()
    return any(frag.lower() in t for frag in SYSTEM_FRAGMENTS)


# Invisible/directional Unicode chars WhatsApp inserts around names and at line starts
_UNICODE_STRIP = "\u200e\u200f\u200b\u200c\u200d\ufeff\u202a\u202b\u202c\u202d\u202e"

_PHONE_RE = re.compile(r"^[\+\d\s\-\(\)]{7,}$")


def is_valid_member_name(name: str) -> bool:
    """Return True only if the sender name looks like a real person."""
    if len(name) < 3:
        return False
    if _PHONE_RE.match(name):
        return False
    return True


def parse_whatsapp_txt(path: Path) -> dict[str, list[str]]:
    """
    Parse a WhatsApp TXT export.

    Returns a dict mapping cleaned member name -> list of message texts.
    Handles multi-line messages (continuation lines have no [timestamp] prefix).
    """
    messages: dict[str, list[str]] = defaultdict(list)
    current_sender: str | None = None
    current_text: list[str] = []

    def flush():
        if current_sender and current_text:
            full = " ".join(current_text).strip()
            if full and not is_system_message(full):
                messages[current_sender].append(full)

    raw = path.read_text(encoding="utf-8", errors="replace")

    for line in raw.splitlines():
        # Bug 1 fix: strip LTR/RTL marks WhatsApp prepends to some lines
        line = line.lstrip(_UNICODE_STRIP)
        m = HEADER_RE.match(line)
        if m:
            flush()
            # Bug 2 fix: strip directional embedding chars from sender names
            sender = m.group(2).strip().strip(_UNICODE_STRIP)
            text   = m.group(3).strip()
            current_sender = sender
            current_text   = [text] if text else []
        else:
            # Continuation of previous message
            stripped = line.strip()
            if stripped and current_sender:
                current_text.append(stripped)

    flush()
    return dict(messages)


def load_stock_ticker_map() -> dict[str, str]:
    """Return {ticker: name} from enriched_stocks.json."""
    if not STOCKS_PATH.exists():
        print(f"WARNING: {STOCKS_PATH} not found — Claude won't have stock context.", file=sys.stderr)
        return {}
    stocks = json.loads(STOCKS_PATH.read_text())
    return {s["ticker"]: s["name"] for s in stocks if "ticker" in s}


def build_extraction_prompt(name: str, messages: list[str], ticker_map: dict[str, str]) -> str:
    ticker_list = ", ".join(
        f"{ticker} ({company})" for ticker, company in sorted(ticker_map.items())
    )

    message_block = "\n".join(f"- {msg}" for msg in messages[:300])  # cap to avoid context limits

    return f"""You are analysing messages from an investment community WhatsApp group.

Member name: {name}

Their messages (chronological sample):
{message_block}

Known stocks in our database (ticker → company name):
{ticker_list}

Based ONLY on the messages above, return a JSON object with these fields:

{{
  "bio": "2-4 sentence summary of this person's investment style, expertise and focus areas. Be specific and grounded in what they actually said.",
  "investor_type": "one of: Retail, Professional, Analyst, Portfolio Manager, Fund Manager, VC / Angel, Sell-side — pick the best fit based on their messages",
  "investment_focus": ["array", "of", "themes", "or", "sectors", "they", "discuss"],
  "originated_tickers": ["tickers they clearly championed or first pitched as investment ideas — only tickers from the known stock list above"],
  "commented_tickers": ["tickers they discussed, reacted to, or analysed but did not clearly originate — only tickers from the known stock list above"]
}}

Rules:
- Only include tickers that appear in the known stock list provided.
- A ticker belongs in originated_tickers if the member was clearly advocating for it as an original idea (e.g. "I own X", "X is a buy", "I've been in X since...", introducing the stock to the group).
- A ticker belongs in commented_tickers if the member discussed it in response to someone else, or just mentioned it neutrally or negatively.
- A ticker should NOT appear in both lists — pick the most accurate one.
- If no clear stock relationships exist, return empty arrays.
- investment_focus should be 2-6 short strings like "UK Small Cap", "Energy Transition", "Crypto", "Healthcare", "Tech", etc.
- Return ONLY the raw JSON object with no markdown, no explanation, no preamble."""


def extract_member(
    client: OpenAI,
    name: str,
    messages: list[str],
    ticker_map: dict[str, str],
) -> dict:
    """Call OpenAI to extract structured profile for one member."""
    prompt = build_extraction_prompt(name, messages, ticker_map)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

        data = json.loads(raw)

        # Validate / sanitise
        valid_tickers = set(ticker_map.keys())
        data["name"]             = name
        data["bio"]              = str(data.get("bio", "")).strip() or None
        data["investor_type"]    = data.get("investor_type") if data.get("investor_type") in INVESTOR_TYPES else None
        data["investment_focus"] = [str(f) for f in data.get("investment_focus", []) if f]
        data["originated_tickers"] = [t for t in data.get("originated_tickers", []) if t in valid_tickers]
        data["commented_tickers"]  = [t for t in data.get("commented_tickers", [])  if t in valid_tickers]

        # Ensure no ticker is in both lists (originated takes priority)
        orig_set = set(data["originated_tickers"])
        data["commented_tickers"] = [t for t in data["commented_tickers"] if t not in orig_set]

        return data

    except json.JSONDecodeError as e:
        print(f"  WARNING: JSON parse failed for {name}: {e}", file=sys.stderr)
        return {
            "name": name,
            "bio": None,
            "investor_type": None,
            "investment_focus": [],
            "originated_tickers": [],
            "commented_tickers": [],
        }
    except Exception as e:
        print(f"  WARNING: API error for {name}: {e}", file=sys.stderr)
        return {
            "name": name,
            "bio": None,
            "investor_type": None,
            "investment_focus": [],
            "originated_tickers": [],
            "commented_tickers": [],
        }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} /path/to/chat.txt", file=sys.stderr)
        sys.exit(1)

    chat_path = Path(sys.argv[1])
    if not chat_path.exists():
        print(f"ERROR: File not found: {chat_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading API key…")
    api_key = load_api_key()
    client  = OpenAI(api_key=api_key)

    print(f"Parsing {chat_path.name}…")
    member_messages = parse_whatsapp_txt(chat_path)
    print(f"  Found {len(member_messages)} unique senders.")

    print(f"Loading stock reference list…")
    ticker_map = load_stock_ticker_map()
    print(f"  {len(ticker_map)} tickers available for matching.")

    results = []
    total   = len(member_messages)

    for i, (name, messages) in enumerate(sorted(member_messages.items()), start=1):
        msg_count = len(messages)
        print(f"  [{i}/{total}] {name} ({msg_count} messages)…", end=" ", flush=True)

        # Bug 2 fix: skip phone-number or single/two-char sender names
        if not is_valid_member_name(name):
            print("skipped (invalid name)")
            continue

        # Bug 3 fix: raise minimum signal threshold from 2 → 5
        if msg_count < 5:
            print("skipped (too few messages)")
            continue

        result = extract_member(client, name, messages, ticker_map)
        results.append(result)
        print(
            f"done — {len(result['originated_tickers'])} originated, "
            f"{len(result['commented_tickers'])} commented"
        )

        # Respect rate limits: small delay between calls
        if i < total:
            time.sleep(0.3)

    print(f"\nWriting {len(results)} member profiles to {OUTPUT_PATH}…")
    OUTPUT_PATH.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"Done. ✓")
    print(f"\nNext step:")
    print(f"  php artisan members:import-chat")


if __name__ == "__main__":
    main()
