import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERN = re.compile(r'src="((?:\.\./)?img/logo-icon\.png)(?:\?v=\d+)?"')

updated = 0
for path in ROOT.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    new_text = PATTERN.sub(r'src="\1?v=4"', text)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        updated += 1

print(f"updated {updated} html files")
