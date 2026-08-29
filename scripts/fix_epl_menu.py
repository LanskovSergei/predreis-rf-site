#!/usr/bin/env python3
"""Normalize EPL menu links and remove duplicates."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPL_ITEM = '<li><a href="/epl/">Электронные путевые листы</a></li>'
DUPES = re.compile(
    r"(?:\s*<li><a href=\"[^\"]*epl/\">Электронные путевые листы</a></li>)+"
)


def normalize(content: str) -> str:
    return DUPES.sub(f"\n              {EPL_ITEM}", content)


def main() -> None:
    updated = 0
    for fp in ROOT.rglob("*.html"):
        original = fp.read_text(encoding="utf-8")
        content = normalize(original)
        if content != original:
            fp.write_text(content, encoding="utf-8")
            updated += 1
    print(f"Normalized EPL links in {updated} files")


if __name__ == "__main__":
    main()
