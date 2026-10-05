"""
Scroll-jank profiler. Scrolls the page with Chrome's synthetic scroll gesture (like a real
wheel/touch fling) while recording every animation frame, then reports frame-time stats per
section. `--ablate` runs extra passes with suspected-expensive features disabled via injected CSS.

  python tools/scrollperf.py --base http://localhost:4340 [--mobile] [--cpu 4] [--ablate]
"""
from __future__ import annotations
import argparse, statistics
from playwright.sync_api import sync_playwright

TRACE = False

RECORDER = """
window.__frames = [];
(function loop(t){ window.__frames.push([t, window.scrollY]); requestAnimationFrame(loop); })(performance.now());
"""

ABLATIONS: dict[str, str] = {
    'baseline': '',
    'no-backdrop': '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
    'no-blend+filter': '*,*::before,*::after{mix-blend-mode:normal!important;filter:none!important}',
    'no-will-change': '*,*::before,*::after{will-change:auto!important}',
    'no-anim': '*,*::before,*::after{animation:none!important}',
    'no-noise': '.has-noise::after,.has-grid::before{display:none!important}',
    'no-canvas': 'canvas{display:none!important}',
    'no-progress': '[data-scroll-progress]{display:none!important}',
    'no-shadows': '*,*::before,*::after{box-shadow:none!important;text-shadow:none!important}',
}

def run(page, label: str, css: str | None, base: str, path: str, cdp, speed: int, block: str | None = None) -> None:
    page.unroute('**/*')
    if block:
        page.route('**/*', lambda r: r.abort() if block in r.request.url else r.continue_())
    page.goto(base + path, wait_until='networkidle')
    if block:
        page.evaluate("document.documentElement.classList.remove('js')")
    if css:
        page.add_style_tag(content=css)
    # warm-up pass: load + decode all lazy images so we measure steady-state scrolling
    page.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,40));}scrollTo({top:0,behavior:'instant'});}")
    page.wait_for_timeout(800)
    sections = page.evaluate("[...document.querySelectorAll('main > section, footer')].map(s=>[s.id||s.tagName.toLowerCase(), s.offsetTop, s.offsetTop+s.offsetHeight])")
    page.evaluate(RECORDER)
    total = page.evaluate("document.documentElement.scrollHeight - innerHeight")
    events: list[dict] = []
    cdp.on('Tracing.dataCollected', lambda e: events.extend(e['value']))
    done: list[bool] = []
    cdp.on('Tracing.tracingComplete', lambda e: done.append(True))
    if TRACE: cdp.send('Tracing.start', {'categories': 'disabled-by-default-devtools.timeline.frame,cc,benchmark', 'transferMode': 'ReportEvents'})
    cdp.send('Input.synthesizeScrollGesture', {'x': 200, 'y': 400, 'yDistance': -int(total), 'speed': speed, 'gestureSourceType': 'mouse', 'repeatCount': 0})
    page.wait_for_timeout(500)
    if TRACE:
        cdp.send('Tracing.end')
        for _ in range(100):
            if done: break
            page.wait_for_timeout(100)
    dropped = sum(1 for e in events if e.get('name') in ('DroppedFrame',))
    presented = sum(1 for e in events if e.get('name') == 'PipelineReporter' and e.get('ph') == 'b' and 'PRESENTED' in str(e.get('args', {})))
    pdropped = sum(1 for e in events if e.get('name') == 'PipelineReporter' and e.get('ph') == 'b' and 'DROPPED' in str(e.get('args', {})))
    frames = page.evaluate("window.__frames")
    deltas = [(frames[i][0] - frames[i-1][0], frames[i][1]) for i in range(1, len(frames))]
    # only frames while actually scrolling
    deltas = [d for d in deltas if 0 < d[1] < total]
    if not deltas:
        print(f'{label:16} no frames recorded'); return
    ft = [d[0] for d in deltas]
    jank = sum(1 for x in ft if x > 25)
    long = sum(1 for x in ft if x > 50)
    p95 = sorted(ft)[int(len(ft) * 0.95)]
    if TRACE: print(f'{label:16} compositor: presented={presented} dropped={pdropped}', end=' | ')
    print(f'{label:18} frames={len(ft):4} avg={statistics.mean(ft):5.1f}ms p95={p95:5.1f}ms janky(>25ms)={jank:3} ({100*jank/len(ft):4.1f}%) long(>50ms)={long:3}')
    if label == 'baseline':
        per: dict[str, list[float]] = {}
        for dt, y in deltas:
            mid = y + page.viewport_size['height'] / 2
            sec = next((s[0] for s in sections if s[1] <= mid < s[2]), 'other')
            per.setdefault(sec, []).append(dt)
        for sec, v in per.items():
            j = sum(1 for x in v if x > 25)
            print(f'    {sec:10} frames={len(v):4} avg={statistics.mean(v):5.1f}ms max={max(v):6.1f}ms janky={100*j/len(v):4.1f}%')

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--path', default='/')
    ap.add_argument('--mobile', action='store_true')
    ap.add_argument('--cpu', type=float, default=1)
    ap.add_argument('--speed', type=int, default=3000)
    ap.add_argument('--ablate', action='store_true')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', args=['--enable-gpu-rasterization', '--ignore-gpu-blocklist'])
        kw = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True) if a.mobile else dict(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        ctx = b.new_context(**kw)
        ctx._mobile = a.mobile
        page = ctx.new_page()
        cdp = ctx.new_cdp_session(page)
        if a.cpu > 1:
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': a.cpu})
        print(f"== {'mobile 390x844@3x' if a.mobile else 'desktop 1440x900'} cpu x{a.cpu} {a.path}")
        if not a.only:
            run(page, 'baseline', None, a.base, a.path, cdp, a.speed)
        if a.only:
            for name in a.only.split(','):
                if name == 'no-scripts':
                    run(page, name, None, a.base, a.path, cdp, a.speed, block='/_astro/')
                elif name.startswith('block:'):
                    run(page, name, None, a.base, a.path, cdp, a.speed, block=name[6:])
                else:
                    run(page, name, ABLATIONS.get(name, ''.join(ABLATIONS.values())), a.base, a.path, cdp, a.speed)
        if a.ablate:
            for name, css in ABLATIONS.items():
                run(page, name, css, a.base, a.path, cdp, a.speed)
            run(page, 'ALL-OFF', ''.join(ABLATIONS.values()), a.base, a.path, cdp, a.speed)
        b.close()

if __name__ == '__main__':
    main()
