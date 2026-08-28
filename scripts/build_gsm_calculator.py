#!/usr/bin/env python3
"""Build GSM calculator and deploy into gsm-calculator/."""

import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_epl_calc_src"
SHELL = ROOT / "scripts" / "gsm-calculator-shell.html"
OUT = ROOT / "gsm-calculator"
DIST = SRC / "dist"


def main() -> int:
    deploy_only = "--deploy-only" in sys.argv

    if not SRC.exists():
        print("Missing _epl_calc_src — clone EPL_Calculator_MINI first.", file=sys.stderr)
        return 1

    if not deploy_only:
        print("Building React app…")
        subprocess.run(
            "npm run build -- --base=/gsm-calculator/",
            cwd=SRC,
            check=True,
            shell=True,
        )

    built = DIST / "index.html"
    if not built.exists():
        print("Build failed: dist/index.html not found", file=sys.stderr)
        return 1

    built_html = built.read_text(encoding="utf-8")
    js_match = re.search(r'<script type="module" crossorigin src="([^"]+)"></script>', built_html)
    css_match = re.search(r'<link rel="stylesheet" crossorigin href="([^"]+)">', built_html)
    if not js_match or not css_match:
        print("Could not find built asset paths", file=sys.stderr)
        return 1

    js_href = js_match.group(1)
    css_href = css_match.group(1)
    prefix = "/gsm-calculator/"
    if js_href.startswith(prefix):
        js_href = js_href[len(prefix) :]
    if css_href.startswith(prefix):
        css_href = css_href[len(prefix) :]
    assets_block = (
        f'    <script type="module" crossorigin src="{js_href}"></script>\n'
        f'    <link rel="stylesheet" crossorigin href="{css_href}">'
    )

    shell_html = SHELL.read_text(encoding="utf-8")
    final_html = shell_html.replace("    <!-- APP_ASSETS -->", assets_block)

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    shutil.copytree(DIST / "assets", OUT / "assets")

    # Keep only app bundles, drop accidentally copied site assets from older builds
    for path in OUT.rglob("*"):
        if path.is_file() and path.suffix in {".png", ".jpg", ".svg", ".woff", ".woff2", ".eot", ".ttf"}:
            if path.name.startswith(("logo-", "glyphicons", "fontawesome", "favicon")):
                path.unlink()

    (OUT / "index.html").write_text(final_html, encoding="utf-8")
    print(f"Deployed to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
