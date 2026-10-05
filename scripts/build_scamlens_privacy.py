#!/usr/bin/env python3
"""Generate the English ScamLens privacy page from Docs/privacy_policy.md.

The page URL stays /scamlens/privacy/. Translations stay in i18n/*.json.
The script fails if a translation's effective date or network-connection
list does not match the English source, or if a translated page still shows
an English sentence. Brand names, URLs, and email addresses may stay as written.
"""

import html
import html.parser
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Volumes/Randomness/MyApps/ScamLensUK/Docs/privacy_policy.md")
OUT = ROOT / "scamlens" / "privacy" / "index.html"
LANGS = ("es", "pt", "de", "fr")
CANONICAL = "https://randomminiapps.github.io/scamlens/privacy/"

MONTHS = {
    "January": {"es": "enero", "pt": "janeiro", "de": "januar", "fr": "janvier"},
    "February": {"es": "febrero", "pt": "fevereiro", "de": "februar", "fr": "février"},
    "March": {"es": "marzo", "pt": "março", "de": "märz", "fr": "mars"},
    "April": {"es": "abril", "pt": "abril", "de": "april", "fr": "avril"},
    "May": {"es": "mayo", "pt": "maio", "de": "mai", "fr": "mai"},
    "June": {"es": "junio", "pt": "junho", "de": "juni", "fr": "juin"},
    "July": {"es": "julio", "pt": "julho", "de": "juli", "fr": "juillet"},
    "August": {"es": "agosto", "pt": "agosto", "de": "august", "fr": "août"},
    "September": {"es": "septiembre", "pt": "setembro", "de": "september", "fr": "septembre"},
    "October": {"es": "octubre", "pt": "outubro", "de": "oktober", "fr": "octobre"},
    "November": {"es": "noviembre", "pt": "novembro", "de": "november", "fr": "novembre"},
    "December": {"es": "diciembre", "pt": "dezembro", "de": "dezember", "fr": "décembre"},
}

HEAD = """<!DOCTYPE html>
<html lang="en-GB" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #1d1d1f; background: #fff; }}
    h1 {{ font-size: 1.75rem; }}
    h2 {{ font-size: 1.2rem; margin-top: 1.5rem; }}
    p, li {{ font-size: 1rem; }}
    a {{ color: #0066cc; }}
  </style>
<link rel="stylesheet" href="/i18n/i18n.css">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="en-GB" href="{canonical}">
<link rel="alternate" hreflang="es" href="{canonical}?lang=es">
<link rel="alternate" hreflang="pt-BR" href="{canonical}?lang=pt">
<link rel="alternate" hreflang="de" href="{canonical}?lang=de">
<link rel="alternate" hreflang="fr" href="{canonical}?lang=fr">
<link rel="alternate" hreflang="x-default" href="{canonical}">
<script>try{{var codes={{en:"en-GB",es:"es",pt:"pt-BR",de:"de",fr:"fr"}};var q=new URLSearchParams(location.search).get("lang");var stored=localStorage.getItem("siteLang");var active="en";if(q&&codes[q])active=q;else if(!q&&stored&&codes[stored])active=stored;document.documentElement.lang=codes[active];document.documentElement.dir="ltr";if(active!=="en")document.documentElement.dataset.pendingLang=active}}catch(e){{}}</script>
<script src="/i18n/i18n.js" defer></script>
</head>
<body>
"""


def inline(text):
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    return re.sub(
        r"<strong>([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})</strong>",
        r'<a href="mailto:\1">\1</a>',
        escaped,
    )


def blocks(markdown):
    return re.split(r"\n\s*\n", markdown.strip())


def render(markdown):
    parts = []
    title = "ScamLens Privacy Policy"
    effective = None
    network = []
    in_network = False
    for block in blocks(markdown):
        lines = block.split("\n")
        if lines[0].startswith("# "):
            title = lines[0][2:].strip()
            parts.append(f"  <h1>{html.escape(title)}</h1>")
            continue
        if lines[0].startswith("## "):
            heading = lines[0][3:].strip()
            in_network = heading == "The complete list of network connections"
            parts.append(f"  <h2>{html.escape(heading)}</h2>")
            continue
        if re.match(r"^\d+\. ", lines[0]):
            items = []
            for line in lines:
                match = re.match(r"^\d+\. \*\*(.+?)\*\*\s*(.*)$", line.strip())
                if not match:
                    raise SystemExit(f"network item is not '**title.** body': {line}")
                item_title, body = match.group(1), match.group(2).strip()
                items.append((item_title, body))
                if in_network:
                    network.append((item_title, body))
            rendered = ["  <ol>"]
            for item_title, body in items:
                rendered.append(
                    f"    <li><strong>{html.escape(item_title)}</strong> {inline(body)}</li>"
                )
            rendered.append("  </ol>")
            parts.append("\n".join(rendered))
            continue
        effective_match = re.match(
            r"^\*\*Effective: (.+?) · Contact: ([^\*]+)\*\*$",
            block.strip(),
        )
        if effective_match:
            effective = effective_match.group(1).strip()
            email = effective_match.group(2).strip()
            parts.append(
                "  <p><strong>Effective:</strong> "
                f"{html.escape(effective)} · <strong>Contact:</strong> "
                f'<a href="mailto:{html.escape(email)}">{html.escape(email)}</a></p>'
            )
            continue
        text = "<br>\n  ".join(inline(line) for line in lines)
        parts.append(f"  <p>{text}</p>")
    if not effective:
        raise SystemExit("privacy source has no Effective date")
    if not network:
        raise SystemExit("privacy source has no network-connection list")
    body = "\n\n".join(parts)
    footer = (
        '\n  <p><a href="../">← ScamLens</a> · '
        '<a href="https://randomminiapps.github.io/">Random Mini Apps</a></p>\n'
    )
    page = HEAD.format(title=html.escape(title), canonical=CANONICAL) + body + footer + "</body>\n</html>\n"
    return page, effective, network


def date_parts(effective):
    match = re.match(r"(\d{1,2}) ([A-Za-z]+) (\d{4})$", effective)
    if not match:
        raise SystemExit(f"effective date is not 'D Month YYYY': {effective}")
    day, month, year = match.groups()
    if month not in MONTHS:
        raise SystemExit(f"no translation check for month {month}")
    return day, month, year


def translated_date_ok(value, day, month, year, lang):
    if not re.search(rf"(?<!\d){day}(?!\d)", value):
        return False
    if year not in value:
        return False
    return MONTHS[month][lang] in value.lower()


BRANDS = (
    "ScamLens UK",
    "Random Mini Apps",
    "Foundation Models",
    "Share Extension",
    "App Store",
    "App Group",
    "ScamLens",
    "iPhone",
    "iPad",
    "Apple",
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL_RE = re.compile(r"https?://\S+|www\.\S+")


class TextNodes(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.nodes = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if self.skip:
            return
        text = re.sub(r"\s+", " ", data).strip()
        if text:
            self.nodes.append(text)


def page_sentences(page):
    title = re.search(r"<title>(.*?)</title>", page, re.S)
    body = page.split("<body>", 1)[1].split("</body>", 1)[0]
    parser = TextNodes()
    parser.feed(body)
    sentences = []
    if title:
        sentences.append(html.unescape(title.group(1).strip()))
    sentences.extend(parser.nodes)
    return sentences


def english_may_remain(text):
    if not re.search(r"[A-Za-z]", text):
        return True
    stripped = EMAIL_RE.sub(" ", text)
    stripped = URL_RE.sub(" ", stripped)
    for brand in BRANDS:
        stripped = stripped.replace(brand, " ")
    return not re.search(r"[A-Za-z]", stripped)


def check_translations(page, effective, network):
    day, month, year = date_parts(effective)
    date_key = f"{effective} ·"
    if date_key not in page:
        raise SystemExit("generated page is missing the effective date")
    errors = []
    for lang in LANGS:
        data = json.loads((ROOT / "i18n" / f"{lang}.json").read_text())
        strings = data.get("strings") or {}
        translated_date = strings.get(date_key)
        if translated_date is None:
            errors.append(f"{lang}: missing translation for effective date {date_key!r}")
        elif not translated_date_ok(translated_date, day, month, year, lang):
            errors.append(
                f"{lang}: effective date {translated_date!r} does not match {effective}"
            )
        if len(network) != page.count("<li><strong>"):
            errors.append("generated network list does not match the source list")
        for title, body in network:
            if f"<strong>{html.escape(title)}</strong>" not in page:
                errors.append(f"generated page dropped network item {title!r}")
            if title not in strings:
                errors.append(f"{lang}: missing translation for network item {title!r}")
            elif not strings[title].strip():
                errors.append(f"{lang}: empty translation for network item {title!r}")
            if body not in strings:
                errors.append(f"{lang}: missing translation for network detail {body[:80]!r}")
            elif not strings[body].strip():
                errors.append(f"{lang}: empty translation for a network detail")
        for sentence in page_sentences(page):
            shown = strings.get(sentence, sentence)
            if shown == sentence and not english_may_remain(sentence):
                errors.append(f"{lang}: English sentence still shown: {sentence[:140]!r}")
    if errors:
        raise SystemExit("privacy translation check failed:\n- " + "\n- ".join(errors))


def main():
    if not SOURCE.is_file():
        raise SystemExit(f"missing privacy source: {SOURCE}")
    page, effective, network = render(SOURCE.read_text())
    if CANONICAL not in page:
        raise SystemExit("canonical URL changed")
    check_translations(page, effective, network)
    OUT.write_text(page)
    print(f"wrote {OUT}")
    print(f"effective {effective}")
    print(f"network items {len(network)}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
