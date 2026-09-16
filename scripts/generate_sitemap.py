#!/usr/bin/env python3
"""Generate sitemap.xml for предрейс.рф (UTF-8 URLs, current site structure)."""

from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://предрейс.рф"

# path -> (priority, changefreq)
STATIC: dict[str, tuple[str, str]] = {
    "/": ("1.0", "weekly"),
    "/about.html": ("0.8", "monthly"),
    "/service.html": ("0.9", "monthly"),
    "/pmo.html": ("0.9", "monthly"),
    "/ptk.html": ("0.9", "monthly"),
    "/combo.html": ("0.9", "monthly"),
    "/bdd.html": ("0.9", "monthly"),
    "/dispetcher.html": ("0.9", "monthly"),
    "/epl/": ("0.9", "monthly"),
    "/gsm/": ("0.8", "monthly"),
    "/faq.html": ("0.8", "weekly"),
    "/contact.html": ("0.7", "monthly"),
    "/download.html": ("0.7", "monthly"),
    "/zakon.html": ("0.7", "monthly"),
    "/audit.html": ("0.6", "monthly"),
    "/parking.html": ("0.6", "monthly"),
}


def pretty_xml(elem: Element) -> str:
    raw = tostring(elem, encoding="unicode")
    return minidom.parseString(raw).toprettyxml(indent="\t", encoding="UTF-8").decode("utf-8")


def main() -> None:
    urlset = Element(
        "urlset",
        {
            "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xsi:schemaLocation": (
                "http://www.sitemaps.org/schemas/sitemap/0.9 "
                "http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
            ),
        },
    )

    paths: list[tuple[str, str, str]] = []

    for path, meta in STATIC.items():
        paths.append((path, *meta))

    for html in sorted((ROOT / "faq").glob("*.html")):
        paths.append((f"/faq/{html.name}", "0.6", "yearly"))

    for html in sorted((ROOT / "zakoni").glob("*.html")):
        paths.append((f"/zakoni/{html.name}", "0.5", "yearly"))

    seen: set[str] = set()
    for path, priority, changefreq in paths:
        loc = BASE + path
        if loc in seen:
            continue
        seen.add(loc)
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text = loc
        SubElement(url, "priority").text = priority
        SubElement(url, "changefreq").text = changefreq

    out = ROOT / "sitemap.xml"
    header = '<?xml version="1.0" encoding="UTF-8"?>\n'
    out.write_text(header + pretty_xml(urlset).split("\n", 1)[1], encoding="utf-8")
    print(f"Wrote {len(seen)} URLs to {out}")


if __name__ == "__main__":
    main()
