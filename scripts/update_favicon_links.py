"""Add favicon cache-bust and missing apple-touch-icon links across HTML pages."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"yandex_4794636cdc1f663f.html", "googlee400f664739544e3.html"}

FAV_RE = re.compile(r'(href="(?:\.\./)?img/favicon\.png)(?:\?v=\d+)?(")')
TOUCH_RE = re.compile(r'(href="(?:\.\./)?img/apple-touch-icon\.png)(?:\?v=\d+)?(")')


def add_apple_touch(text: str) -> str:
    if "apple-touch-icon.png" in text:
        return text
    if '../img/favicon.png?v=5" rel="icon"' in text:
        return text.replace(
            '../img/favicon.png?v=5" rel="icon"',
            '../img/favicon.png?v=5" rel="icon" />\n    <link href="../img/apple-touch-icon.png?v=5" rel="apple-touch-icon"',
            1,
        )
    if 'img/favicon.png?v=5" rel="icon">' in text:
        return text.replace(
            'img/favicon.png?v=5" rel="icon">',
            'img/favicon.png?v=5" rel="icon">\n  <link href="img/apple-touch-icon.png?v=5" rel="apple-touch-icon">',
            1,
        )
    return text


def main() -> None:
    updated: list[str] = []
    for path in sorted(ROOT.rglob("*.html")):
        if path.name in SKIP:
            continue
        text = path.read_text(encoding="utf-8")
        orig = text
        text = FAV_RE.sub(r"\1?v=5\2", text)
        text = TOUCH_RE.sub(r"\1?v=5\2", text)
        text = add_apple_touch(text)
        if text != orig:
            path.write_text(text, encoding="utf-8")
            updated.append(str(path.relative_to(ROOT)))
    print(f"updated {len(updated)} files")
    for item in updated:
        print(f"  {item}")


if __name__ == "__main__":
    main()
