#!/usr/bin/env python3
"""Replace header and footer in all HTML files with new layout."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

BDD_PAGES = {
    "faq.html", "download.html", "zakon.html",
}
BDD_DIRS = {"faq", "zakoni"}

SERVICE_PAGES = {
    "service.html", "pmo.html", "ptk.html", "combo.html",
    "bdd.html", "dispetcher.html", "audit.html", "parking.html",
    "sertificate1.html", "sertificate2.html", "license1.html", "license2.html",
}
SERVICE_DIRS = {"epl"}

ABOUT_PAGES = {"contact.html", "about.html"}


def get_prefix(filepath: Path) -> str:
    rel = filepath.relative_to(ROOT)
    depth = len(rel.parts) - 1
    return "../" * depth if depth else ""


def get_active(filepath: Path) -> dict:
    name = filepath.name
    parts = filepath.relative_to(ROOT).parts

    active = {"home": "", "services": "", "bdd": "", "about": ""}

    if name == "index.html":
        active["home"] = ' class="active"'
    elif name in BDD_PAGES or (parts and parts[0] in BDD_DIRS):
        active["bdd"] = ' class="active"'
    elif name in SERVICE_PAGES or (parts and parts[0] in SERVICE_DIRS):
        active["services"] = ' class="active"'
    elif name in ABOUT_PAGES:
        active["about"] = ' class="active"'

    return active


def build_header(prefix: str, active: dict) -> str:
    p = prefix
    return f"""  <header class="header pr-header">
    <div class="container">
      <div class="pr-header__inner clearfix">
        <a href="{p}index.html" class="pr-header__logo">
          <img src="{p}img/logo-predreis.png?v=3" alt="ПРЕДРЕЙС — линии безопасности" height="56">
        </a>
        <div class="pr-header__nav-wrap">
          <div id="nav">
            <ul id="jetmenu" class="jetmenu pr-nav blue">
              <li{active['home']}><a href="{p}index.html">Главная</a></li>
              <li{active['services']}><a href="#">Услуги</a>
                <ul class="dropdown">
                  <li><a href="{p}service.html">Все услуги</a></li>
                  <li><a href="{p}pmo.html">Предрейсовый медосмотр</a></li>
                  <li><a href="{p}ptk.html">Предрейсовый техконтроль</a></li>
                  <li><a href="{p}combo.html">Медосмотр + Техконтроль</a></li>
                  <li><a href="{p}bdd.html">Специалист по БДД</a></li>
                  <li><a href="{p}dispetcher.html">Ведение путевой документации</a></li>
                  <li><a href="/epl/">Электронные путевые листы</a></li>
                </ul>
              </li>
              <li><a href="{p}gsm/">Калькулятор ГСМ</a></li>
              <li{active['bdd']}><a href="#">Всё о БДД</a>
                <ul class="dropdown">
                  <li><a href="{p}faq.html">Узнать больше</a></li>
                  <li><a href="{p}download.html">Скачать</a></li>
                  <li><a href="{p}zakon.html">Законы</a></li>
                </ul>
              </li>
              <li{active['about']}><a href="#">ПРЕДРЕЙС</a>
                <ul class="dropdown">
                  <li><a href="{p}contact.html">Контакты</a></li>
                  <li><a href="{p}about.html">О нас</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        <a href="https://predreis.online" class="pr-header__online" target="_blank" rel="noopener" title="ПРЕДРЕЙС ONLINE">
          <img src="{p}img/logo-icon.png?v=4" alt="ПРЕДРЕЙС ONLINE" width="40" height="40">
        </a>
        <div class="pr-header__contacts">
          <a href="tel:+79250288755" class="pr-header__phone">+7 925 028-87-55</a>
          <a href="mailto:predreis@predreis.online">predreis@predreis.online</a>
          <a href="mailto:predreis@predreis.info">predreis@predreis.info</a>
        </div>
      </div>
    </div>
  </header>
  <!-- end header -->"""


def build_footer(prefix: str) -> str:
    p = prefix
    return f"""  <footer class="footer pr-footer">
    <div class="pr-footer__main">
      <div class="container">
        <div class="row pr-footer__grid">
          <div class="col-lg-4 col-md-4 col-sm-12 pr-footer__about">
            <a href="{p}index.html" class="pr-footer__logo">
              <img src="{p}img/logo-predreis-footer.png" alt="ПРЕДРЕЙС — линии безопасности">
            </a>
            <p>ООО «ПРЕДРЕЙС» объединяет специалистов и экспертов в области организации мероприятий по безопасности дорожного движения</p>
            <a class="pr-footer__more" href="{p}about.html">Подробнее &rarr;</a>
          </div>
          <div class="col-lg-5 col-md-5 col-sm-12 pr-footer__contacts">
            <p class="pr-footer__label">Телефон</p>
            <a href="tel:+79250288755" class="pr-footer__phone">+7 925 028-87-55</a>
            <a href="tel:+79267996136" class="pr-footer__phone">+7 926 799-61-36</a>
            <p class="pr-footer__label">Email</p>
            <a href="mailto:predreis@predreis.online" class="pr-footer__email">predreis@predreis.online</a>
            <a href="mailto:predreis@predreis.info" class="pr-footer__email">predreis@predreis.info</a>
            <p class="pr-footer__label">Адрес</p>
            <span class="pr-footer__address">
              <strong class="pr-footer__address-city">Москва,</strong>
              <span class="pr-footer__address-line">Варшавское шоссе, 141А, к. 4</span>
            </span>
            <a href="{p}contact.html" class="pr-footer__map">На карте</a>
          </div>
          <div class="col-lg-3 col-md-3 col-sm-12 pr-footer__services">
            <p class="pr-footer__label">Услуги</p>
            <ul>
              <li><a href="{p}pmo.html">Предрейсовый медосмотр</a></li>
              <li><a href="{p}ptk.html">Предрейсовый техконтроль</a></li>
              <li><a href="{p}combo.html">Медосмотр + техконтроль</a></li>
              <li><a href="{p}bdd.html">Специалист по БДД</a></li>
              <li><a href="{p}dispetcher.html">Ведение путевой документации</a></li>
              <li><a href="/epl/">Электронные путевые листы</a></li>
              <li><a href="{p}gsm/">Калькулятор ГСМ</a></li>
            </ul>
            <a href="https://predreis.online" class="pr-footer__online-badge" target="_blank" rel="noopener">
              <img src="{p}img/logo-predreis-online.png" alt="ПРЕДРЕЙС ONLINE">
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="pr-footer__bar">
      <div class="container">
        <p class="pr-footer__copyright">Copyright &copy; 2026 - All rights reserved</p>
        <div class="pr-footer__search-wrap">
          <form class="pr-footer__search-form" action="https://yandex.ru/search/site/" method="get" target="_blank">
            <input type="hidden" name="searchid" value="">
            <input type="text" name="text" placeholder="Поиск по сайту..." aria-label="Поиск">
            <button type="submit">Найти</button>
          </form>
          <button type="button" class="pr-footer__search-toggle" aria-expanded="false">
            <i class="fa fa-search"></i> Поиск
          </button>
        </div>
      </div>
    </div>
  </footer>
  <!-- end footer -->"""


HEADER_PATTERN = re.compile(
    r'<div class="topbar clearfix">.*?<!-- end header -->',
    re.DOTALL,
)

FOOTER_PATTERN = re.compile(
    r'<footer class="footer">.*?<!-- end footer -->',
    re.DOTALL,
)

LAYOUT_CSS_PATTERN = re.compile(r'<link[^>]+href="[^"]*css/layout\.css"[^>]*>\s*')


def ensure_layout_css(content: str, prefix: str) -> str:
    if LAYOUT_CSS_PATTERN.search(content):
        return content
    link = f'  <link href="{prefix}css/layout.css" rel="stylesheet">\n'
    marker = '<link rel="stylesheet" href="'
    idx = content.find(marker)
    if idx == -1:
        marker = '<link href="'
        idx = content.find('css/colors/blue.css')
        if idx != -1:
            end = content.find('>', idx) + 1
            return content[:end] + "\n" + link + content[end:]
        return content
    # insert after blue.css line
    blue = content.find('css/colors/blue.css')
    if blue != -1:
        end = content.find('>', blue) + 1
        return content[:end] + "\n" + link + content[end:]
    return content


def ensure_layout_js(content: str, prefix: str) -> str:
    script = f'  <script src="{prefix}js/layout.js"></script>\n'
    if 'js/layout.js' in content:
        return content
    marker = f'<script src="{prefix}js/main.js"></script>'
    if marker in content:
        return content.replace(marker, script + marker)
    return content


def process_file(filepath: Path) -> bool:
    content = filepath.read_text(encoding="utf-8")
    original = content

    prefix = get_prefix(filepath)
    active = get_active(filepath)

    header = build_header(prefix, active)
    footer = build_footer(prefix)

    if HEADER_PATTERN.search(content):
        content = HEADER_PATTERN.sub(header, content, count=1)
    elif '<header class="header pr-header">' not in content:
        print(f"  SKIP header: {filepath.relative_to(ROOT)}")
        return False

    if FOOTER_PATTERN.search(content):
        content = FOOTER_PATTERN.sub(footer, content, count=1)
    elif '<footer class="footer pr-footer">' not in content:
        print(f"  SKIP footer: {filepath.relative_to(ROOT)}")
        return False

    content = ensure_layout_css(content, prefix)
    content = ensure_layout_js(content, prefix)

    if content != original:
        filepath.write_text(content, encoding="utf-8")
        return True
    return False


def main():
    html_files = list(ROOT.rglob("*.html"))
    updated = 0
    for fp in sorted(html_files):
        if process_file(fp):
            updated += 1
            print(f"Updated: {fp.relative_to(ROOT)}")
    print(f"\nDone: {updated}/{len(html_files)} files updated")


if __name__ == "__main__":
    main()
