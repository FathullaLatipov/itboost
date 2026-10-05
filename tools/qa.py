"""
Visual + layout QA for the ITBoost site (Playwright, Python).

Usage:
  python tools/qa.py --base http://localhost:4321 [--paths / /uz/] [--widths 320 375 768 1440]
                     [--selector "#services"] [--out .qa/run] [--motion] [--full]

For every path × width it:
  * loads the page (reduced motion by default, so reveals are instantly visible),
  * scrolls through it (triggers lazy images / observers),
  * reports console errors, page errors, failed requests,
  * reports horizontal overflow and the elements sticking out of the viewport,
  * saves a screenshot (full page, or just `--selector`).
Exit code 1 if any errors or overflow were found.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

DEFAULT_WIDTHS = [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920]

OVERFLOW_JS = """
() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      // ignore children of elements that clip their overflow
      let clipped = false;
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (/(hidden|clip|auto|scroll)/.test(cs.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= vw + 1 && pr.left >= -1) { clipped = true; break; }
        }
        p = p.parentElement;
      }
      if (clipped) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && (cs.visibility === 'hidden' || cs.opacity === '0')) continue;
      const id = el.id ? '#' + el.id : '';
      const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '';
      offenders.push(`${el.tagName.toLowerCase()}${id}${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      if (offenders.length >= 12) break;
    }
  }
  return { vw, sw, overflow: sw > vw + 1, offenders };
}
"""

SCROLL_JS = """
async () => {
  const step = Math.max(200, window.innerHeight * 0.7);
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise(r => setTimeout(r, 60));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await new Promise(r => setTimeout(r, 150));
}
"""


def slug(path: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")
    return s or "home"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--paths", nargs="+", default=["/", "/uz/"])
    ap.add_argument("--widths", nargs="+", type=int, default=DEFAULT_WIDTHS)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--selector", default=None, help="screenshot only this element")
    ap.add_argument("--out", default=".qa/run")
    ap.add_argument("--motion", action="store_true", help="do not emulate reduced motion")
    ap.add_argument("--full", action="store_true", help="full-page screenshots")
    ap.add_argument("--no-shots", action="store_true")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    problems = 0
    report: list[dict[str, object]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for path in args.paths:
            for width in args.widths:
                ctx = browser.new_context(
                    viewport={"width": width, "height": args.height},
                    device_scale_factor=1,
                    reduced_motion="no-preference" if args.motion else "reduce",
                    is_mobile=width < 768,
                    has_touch=width < 1024,
                )
                page = ctx.new_page()
                errors: list[str] = []
                page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
                page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                page.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url} {r.failure}"))
                page.on("response", lambda r: errors.append(f"http {r.status}: {r.url}") if r.status >= 400 else None)

                page.goto(args.base.rstrip("/") + path, wait_until="networkidle")
                page.evaluate(SCROLL_JS)
                page.wait_for_timeout(300 if not args.motion else 1200)
                ov = page.evaluate(OVERFLOW_JS)

                shot = None
                if not args.no_shots:
                    shot = out / f"{slug(path)}-{width}{'-' + slug(args.selector) if args.selector else ''}.png"
                    if args.selector:
                        loc = page.locator(args.selector).first
                        loc.scroll_into_view_if_needed()
                        page.wait_for_timeout(400 if args.motion else 100)
                        loc.screenshot(path=str(shot))
                    else:
                        page.screenshot(path=str(shot), full_page=args.full)

                entry = {"path": path, "width": width, "errors": errors, "overflow": ov, "shot": str(shot) if shot else None}
                report.append(entry)
                bad = bool(errors) or ov["overflow"] or bool(ov["offenders"])
                problems += int(bad)
                flag = "FAIL" if bad else "ok  "
                print(f"[{flag}] {path} @ {width}px  scrollW={ov['sw']} vw={ov['vw']}  errors={len(errors)}")
                for e in errors[:8]:
                    print("        ", e)
                for o in ov["offenders"][:8]:
                    print("         overflow:", o)
                ctx.close()
        browser.close()

    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{problems} problem run(s). Screenshots + report.json in {out}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
