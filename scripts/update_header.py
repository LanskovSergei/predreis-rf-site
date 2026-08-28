"""Update header markup across all HTML files."""

import re
from pathlib import Path

from update_layout import build_header, get_active, get_prefix

ROOT = Path(__file__).resolve().parent.parent

HEADER_PATTERN = re.compile(
    r'<header class="header pr-header">.*?<!-- end header -->',
    re.DOTALL,
)


def main():
    updated = 0
    for fp in sorted(ROOT.rglob("*.html")):
        content = fp.read_text(encoding="utf-8")
        if not HEADER_PATTERN.search(content):
            continue
        prefix = get_prefix(fp)
        active = get_active(fp)
        header = build_header(prefix, active)
        new_content = HEADER_PATTERN.sub(header, content, count=1)
        if new_content != content:
            fp.write_text(new_content, encoding="utf-8")
            updated += 1
            print(f"Updated: {fp.relative_to(ROOT)}")
    print(f"\nDone: {updated} files")


if __name__ == "__main__":
    main()
