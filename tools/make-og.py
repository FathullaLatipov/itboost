"""
Generates the site's static brand assets into public/ (re-run after brand changes):

  public/favicon.svg          BrandMark in Boost Blue on a navy rounded square (vector)
  public/favicon.ico          16/32/48 px raster fallback of the same (needs Pillow)
  public/apple-touch-icon.png 180×180, full-bleed navy (iOS applies its own mask)
  public/icon-192.png         192×192 } referenced by public/site.webmanifest
  public/icon-512.png         512×512 }
  public/og-image.png         1200×630 Open Graph / Twitter card (tools/og-template.html)

Rendering goes through headless Chromium (Playwright) so Onest + Cyrillic render exactly like
the site. Requires: `pip install playwright && playwright install chromium`, `npm ci` (fonts).

Usage:  python tools/make-og.py [--only og|icons]
"""

from __future__ import annotations

import argparse
import html
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TEMPLATE = ROOT / "tools" / "og-template.html"
FONT_DIR = ROOT / "node_modules" / "@fontsource-variable" / "onest" / "files"
LOGO = ROOT / "src" / "assets" / "brand" / "logo-color.png"

BLUE = "#48AAFF"
NAVY = "#20304E"

# Same geometry as src/components/ui/BrandMark.astro (viewBox "55 52 597 336").
MARK_VIEWBOX = (55, 52, 597, 336)
MARK_PATHS = [
    "M143 75 173 127 119 220 173 313 143 365 60 220Z",
    "M563 75 647 220 563 365 533 313 587 220 533 127Z",
    "M260 58H447L540 220 447 382H260L167 220ZM289 111H416L479 220 416 329H289L227 220ZM265 68H440L428 89H277ZM277 351H428L440 372H265Z",
]

OG_COPY = {
    "headline": "Цифровые системы, которые <em>ускоряют</em> ваш бизнес",
    "meta": 'itboost.uz<span class="dot">·</span>Ташкент',
    "tag": "IT-студия",
}


def mark_group(size: float, mark_width_ratio: float) -> str:
    """BrandMark centred in a size×size square, `mark_width_ratio` of the side wide."""
    vx, vy, vw, vh = MARK_VIEWBOX
    scale = size * mark_width_ratio / vw
    tx = (size - vw * scale) / 2 - vx * scale
    ty = (size - vh * scale) / 2 - vy * scale
    parts = []
    for d in MARK_PATHS:
        rule = ' fill-rule="evenodd"' if "ZM" in d else ""
        parts.append(f'<path d="{d}"{rule}/>')
    paths = "".join(parts)
    return f'<g fill="{BLUE}" transform="translate({tx:.3f} {ty:.3f}) scale({scale:.5f})">{paths}</g>'


def icon_svg(size: int, *, rounded: bool, mark_ratio: float) -> str:
    radius = round(size * 0.22, 2) if rounded else 0
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
        f'<rect width="{size}" height="{size}" rx="{radius}" fill="{NAVY}"/>'
        f"{mark_group(size, mark_ratio)}"
        "</svg>"
    )


def write_favicon_svg() -> None:
    svg = icon_svg(64, rounded=True, mark_ratio=0.86)
    (PUBLIC / "favicon.svg").write_text(svg + "\n", encoding="utf-8")
    print("wrote public/favicon.svg")


def render_png(page, svg: str, size: int, out: Path) -> None:
    page.set_viewport_size({"width": size, "height": size})
    page.set_content(
        "<!doctype html><html><body style='margin:0;background:transparent'>" + svg + "</body></html>"
    )
    page.screenshot(path=str(out), omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
    print(f"wrote {out.relative_to(ROOT).as_posix()}")


def write_favicon_ico(page) -> None:
    """Multi-size .ico for browsers/crawlers that only ask for /favicon.ico."""
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed — skipped public/favicon.ico (pip install pillow)")
        return
    tmp = ROOT / "tools" / ".favicon-48.png"
    render_png(page, icon_svg(48, rounded=True, mark_ratio=0.86), 48, tmp)
    try:
        with Image.open(tmp) as im:
            im.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print("wrote public/favicon.ico")
    finally:
        tmp.unlink(missing_ok=True)


def render_og(page) -> None:
    if not FONT_DIR.exists():
        sys.exit("Onest font files not found — run `npm ci` first.")
    mark = "".join(f'<path d="{d}"/>' for d in MARK_PATHS)
    source = (
        TEMPLATE.read_text(encoding="utf-8")
        .replace("{{FONT_DIR}}", FONT_DIR.as_uri())
        .replace("{{LOGO}}", LOGO.as_uri())
        .replace("{{MARK_PATHS}}", mark)
        .replace("{{HEADLINE}}", OG_COPY["headline"])
        .replace("{{META}}", OG_COPY["meta"])
        .replace("{{TAG}}", html.escape(OG_COPY["tag"]))
    )
    # Render from a file next to the template so file:// fonts/images are allowed.
    tmp = ROOT / "tools" / ".og-render.html"
    tmp.write_text(source, encoding="utf-8")
    try:
        page.set_viewport_size({"width": 1200, "height": 630})
        page.goto(tmp.as_uri(), wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        loaded = page.evaluate("[...document.fonts].filter(f => f.status === 'loaded').length")
        if loaded == 0:
            sys.exit("Onest did not load — check FONT_DIR.")
        out = PUBLIC / "og-image.png"
        page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
        print(f"wrote {out.relative_to(ROOT).as_posix()}")
    finally:
        tmp.unlink(missing_ok=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["og", "icons"], default=None)
    args = ap.parse_args()

    PUBLIC.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=1)
        if args.only in (None, "icons"):
            write_favicon_svg()
            write_favicon_ico(page)
            render_png(page, icon_svg(180, rounded=False, mark_ratio=0.66), 180, PUBLIC / "apple-touch-icon.png")
            render_png(page, icon_svg(192, rounded=False, mark_ratio=0.62), 192, PUBLIC / "icon-192.png")
            render_png(page, icon_svg(512, rounded=False, mark_ratio=0.62), 512, PUBLIC / "icon-512.png")
        if args.only in (None, "og"):
            render_og(page)
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
