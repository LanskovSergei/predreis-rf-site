"""Update footer markup across all HTML files."""

import re
from pathlib import Path

from update_layout import build_footer, get_prefix

ROOT = Path(__file__).resolve().parent.parent

FOOTER_PATTERN = re.compile(
    r'<footer class="footer pr-footer">.*?<!-- end footer -->',
    re.DOTALL,
)


def main():
    updated = 0
    for fp in sorted(ROOT.rglob("*.html")):
        content = fp.read_text(encoding="utf-8")
        if not FOOTER_PATTERN.search(content):
            continue
        prefix = get_prefix(fp)
        footer = build_footer(prefix)
        new_content = FOOTER_PATTERN.sub(footer, content, count=1)
        if new_content != content:
            fp.write_text(new_content, encoding="utf-8")
            updated += 1
            print(f"Updated: {fp.relative_to(ROOT)}")
    print(f"\nDone: {updated} files")


if __name__ == "__main__":
    main()
