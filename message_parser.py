"""
Message parser for chat log format.
Parses messages in format: [DD/MM/YYYY, HH:MM:SS] ~ {Person}: message
"""

import re
from datetime import datetime
from typing import List, Optional, Iterator
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ParsedMessage:
    """Represents a single parsed message."""
    timestamp: datetime
    sender: str
    content: str
    raw_line: str
    line_number: int
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "timestamp_unix": int(self.timestamp.timestamp()),
            "date": self.timestamp.strftime("%Y-%m-%d"),
            "time": self.timestamp.strftime("%H:%M:%S"),
            "sender": self.sender,
            "content": self.content,
            "line_number": self.line_number,
            "metadata": self.metadata
        }


class MessageParser:
    """
    Parser for chat message format.
    Expected format: [DD/MM/YYYY, HH:MM:SS] ~ {Sender Name}: Message content
    """

    # Primary pattern: [DD/MM/YYYY, HH:MM:SS] ~ {Name}: message
    PRIMARY_PATTERN = re.compile(
        r'^\[(\d{2}/\d{2}/\d{4}),\s*(\d{2}:\d{2}:\d{2})\]\s*~\s*\{([^}]+)\}:\s*(.+)$'
    )

    # Alternative pattern: [DD/MM/YYYY, HH:MM:SS] Name: message
    ALT_PATTERN = re.compile(
        r'^\[(\d{2}/\d{2}/\d{4}),\s*(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)$'
    )

    # WhatsApp-style pattern: DD/MM/YYYY, HH:MM - Name: message
    WHATSAPP_PATTERN = re.compile(
        r'^(\d{2}/\d{2}/\d{4}),\s*(\d{2}:\d{2})\s*-\s*([^:]+):\s*(.+)$'
    )

    def __init__(self, date_format: str = "%d/%m/%Y"):
        """
        Initialize parser.

        Args:
            date_format: Date format string (default DD/MM/YYYY)
        """
        self.date_format = date_format
        self.patterns = [
            (self.PRIMARY_PATTERN, self._parse_primary),
            (self.ALT_PATTERN, self._parse_alt),
            (self.WHATSAPP_PATTERN, self._parse_whatsapp),
        ]

    def _parse_primary(self, match: re.Match, line: str, line_num: int) -> ParsedMessage:
        """Parse primary format: [DD/MM/YYYY, HH:MM:SS] ~ {Name}: message"""
        date_str, time_str, sender, content = match.groups()
        timestamp = datetime.strptime(f"{date_str} {time_str}", f"{self.date_format} %H:%M:%S")
        return ParsedMessage(
            timestamp=timestamp,
            sender=sender.strip(),
            content=content.strip(),
            raw_line=line,
            line_number=line_num
        )

    def _parse_alt(self, match: re.Match, line: str, line_num: int) -> ParsedMessage:
        """Parse alternative format: [DD/MM/YYYY, HH:MM:SS] Name: message"""
        date_str, time_str, sender, content = match.groups()
        timestamp = datetime.strptime(f"{date_str} {time_str}", f"{self.date_format} %H:%M:%S")
        return ParsedMessage(
            timestamp=timestamp,
            sender=sender.strip(),
            content=content.strip(),
            raw_line=line,
            line_number=line_num
        )

    def _parse_whatsapp(self, match: re.Match, line: str, line_num: int) -> ParsedMessage:
        """Parse WhatsApp format: DD/MM/YYYY, HH:MM - Name: message"""
        date_str, time_str, sender, content = match.groups()
        timestamp = datetime.strptime(f"{date_str} {time_str}", f"{self.date_format} %H:%M")
        return ParsedMessage(
            timestamp=timestamp,
            sender=sender.strip(),
            content=content.strip(),
            raw_line=line,
            line_number=line_num
        )

    def parse_line(self, line: str, line_number: int = 0) -> Optional[ParsedMessage]:
        """
        Parse a single line.

        Args:
            line: The line to parse
            line_number: Line number in the source file

        Returns:
            ParsedMessage if successful, None if line doesn't match any pattern
        """
        line = line.strip()
        if not line:
            return None

        for pattern, parser_func in self.patterns:
            match = pattern.match(line)
            if match:
                try:
                    return parser_func(match, line, line_number)
                except ValueError:
                    continue

        return None

    def parse_file(self, file_path: str) -> List[ParsedMessage]:
        """
        Parse all messages from a file.

        Args:
            file_path: Path to the text file

        Returns:
            List of ParsedMessage objects
        """
        messages = []
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, 'r', encoding='utf-8') as f:
            current_message = None

            for line_num, line in enumerate(f, start=1):
                parsed = self.parse_line(line, line_num)

                if parsed:
                    # Save previous message if exists
                    if current_message:
                        messages.append(current_message)
                    current_message = parsed
                elif current_message and line.strip():
                    # Continuation of previous message (multi-line)
                    current_message.content += "\n" + line.strip()

            # Don't forget the last message
            if current_message:
                messages.append(current_message)

        return messages

    def parse_text(self, text: str) -> List[ParsedMessage]:
        """
        Parse messages from a text string.

        Args:
            text: The text content to parse

        Returns:
            List of ParsedMessage objects
        """
        messages = []
        current_message = None

        for line_num, line in enumerate(text.split('\n'), start=1):
            parsed = self.parse_line(line, line_num)

            if parsed:
                if current_message:
                    messages.append(current_message)
                current_message = parsed
            elif current_message and line.strip():
                current_message.content += "\n" + line.strip()

        if current_message:
            messages.append(current_message)

        return messages

    def stream_parse_file(self, file_path: str) -> Iterator[ParsedMessage]:
        """
        Stream parse messages from a file (memory efficient for large files).

        Args:
            file_path: Path to the text file

        Yields:
            ParsedMessage objects one at a time
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, 'r', encoding='utf-8') as f:
            current_message = None

            for line_num, line in enumerate(f, start=1):
                parsed = self.parse_line(line, line_num)

                if parsed:
                    if current_message:
                        yield current_message
                    current_message = parsed
                elif current_message and line.strip():
                    current_message.content += "\n" + line.strip()

            if current_message:
                yield current_message


if __name__ == "__main__":
    # Test the parser
    parser = MessageParser()

    test_messages = """
[06/06/2025, 15:27:23] ~ {John Doe}: AMZN looking strong today, AWS keeps growing
[06/06/2025, 15:28:45] ~ {Jane Smith}: Tesla's Robotaxi launch is exciting! TSLA to the moon
[06/06/2025, 15:30:00] ~ {Bob Wilson}: Anyone watching NVDA? AI chip demand is insane
[07/06/2025, 09:15:30] ~ {Alice Brown}: Good morning everyone! Apple event next week
    """

    messages = parser.parse_text(test_messages)

    print(f"Parsed {len(messages)} messages:\n")
    for msg in messages:
        print(f"[{msg.timestamp}] {msg.sender}: {msg.content[:50]}...")
        print(f"  -> Dict: {msg.to_dict()}\n")
