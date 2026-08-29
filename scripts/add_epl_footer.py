#!/usr/bin/env python3
"""Insert EPL footer link after dispatcher link where missing."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAT = re.compile(
    r'(<li><a href="([^"]*)dispetcher\.html">Ведение путевой документации</a></li>\s*)'
    r'(?!<li><a href="[^"]*epl/)'
)


def main() -> None:
    updated = 0
    for fp in ROOT.rglob("*.html"):
        if fp.parts[-2:] == ("epl", "index.html"):
            continue
        text = fp.read_text(encoding="utf-8")
        new = PAT.sub(
            r'\1<li><a href="\2epl/">Электронные путевые листы</a></li>\n              ',
            text,
        )
        if new != text:
            fp.write_text(new, encoding="utf-8")
            updated += 1
    print(f"Footer EPL links added: {updated}")


if __name__ == "__main__":
    main()
