import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = [
    (
        re.compile(r'src="((?:\.\./)?img/logo-predreis\.png)(?:\?v=\d+)?"'),
        r'src="\1?v=3"',
    ),
    (
        re.compile(r'src="((?:\.\./)?img/logo-icon\.png)(?:\?v=\d+)?"'),
        r'src="\1?v=3"',
    ),
]

updated = 0
for path in ROOT.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    new_text = text
    for pattern, repl in PATTERNS:
        new_text = pattern.sub(repl, new_text)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        updated += 1

print(f"updated {updated} html files")
