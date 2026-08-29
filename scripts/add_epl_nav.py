#!/usr/bin/env python3
"""Add EPL page links to header and footer across HTML files."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HEADER_NEEDLE = re.compile(
    r'(<li><a href="([^"]*)dispetcher\.html">Ведение путевой документации</a></li>\s*)'
    r'(</ul>\s*</li>\s*<li><a href="[^"]*gsm/)'
)

FOOTER_NEEDLE = re.compile(
    r'(<li><a href="([^"]*)dispetcher\.html">Ведение путевой документации</a></li>\s*)'
    r'(<li><a href="[^"]*gsm/)'
)


def patch(content: str) -> str:
    def header_repl(match: re.Match[str]) -> str:
        prefix = match.group(2)
        epl = f'<li><a href="{prefix}epl/">Электронные путевые листы</a></li>\n              '
        if epl.strip() in match.group(0):
            return match.group(0)
        return match.group(1) + epl + match.group(3)

    def footer_repl(match: re.Match[str]) -> str:
        prefix = match.group(2)
        epl = f'<li><a href="{prefix}epl/">Электронные путевые листы</a></li>\n              '
        if epl.strip() in match.group(0):
            return match.group(0)
        return match.group(1) + epl + match.group(3)

    updated = HEADER_NEEDLE.sub(header_repl, content, count=1)
    updated = FOOTER_NEEDLE.sub(footer_repl, updated, count=1)
    return updated


def main() -> None:
    updated = 0
    for fp in sorted(ROOT.rglob("*.html")):
        if fp.parts[-2:] == ("epl", "index.html"):
            continue
        original = fp.read_text(encoding="utf-8")
        content = patch(original)
        if content != original:
            fp.write_text(content, encoding="utf-8")
            updated += 1
            print(f"Updated: {fp.relative_to(ROOT)}")
    print(f"\nDone: {updated} files")


if __name__ == "__main__":
    main()
