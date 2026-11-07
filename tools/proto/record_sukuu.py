"""すくう HTML5 試作の録画・計測ツール（無料ツールのみ：playwright + imageio_ffmpeg + Pillow）

使い方:
  python tools/proto/record_sukuu.py sim   [--seconds 100]   # 描画なしで bot を走らせ events.json を作る（速い）
  python tools/proto/record_sukuu.py fps   [--seconds 20]    # 実時間 rAF で FPS とコンソールエラーを計測
  python tools/proto/record_sukuu.py record [--seconds 60]   # 固定刻み 1/30 秒で全フレームを撮り play_60s.mp4 と shots/ を作る
  python tools/proto/record_sukuu.py trailer                 # events.json から 15 秒トレーラーを切り出す
  python tools/proto/record_sukuu.py sheet  --mp4 X --out Y  # 0.5 秒刻みのコンタクトシート
  python tools/proto/record_sukuu.py compare --ref A --img B --out C
"""
import argparse
import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PROTO = ROOT / "proto" / "sukuu-html5"
REC = PROTO / "rec"
SHOTS = REC / "shots"
FRAMES = REC / "frames"
FPS = 30
W, H = 720, 1280
FONT_PATHS = [r"C:\Windows\Fonts\YuGothB.ttc", r"C:\Windows\Fonts\meiryob.ttc", r"C:\Windows\Fonts\msgothic.ttc"]


def jp_font(size):
    for p in FONT_PATHS:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    raise RuntimeError("Japanese font not found")


def url(extra=""):
    return PROTO.joinpath("index.html").as_uri() + "?bot=1&seed=1" + extra


LAUNCH_ARGS = ["--disable-gpu"]
CHANNEL = [""]


def open_page(p, extra):
    kw = {"channel": CHANNEL[0]} if CHANNEL[0] else {}
    browser = p.chromium.launch(headless=True, args=LAUNCH_ARGS, **kw)
    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url(extra))
    page.wait_for_timeout(500)
    try:
        page.wait_for_function("() => !window.__artReady || window.__artReady()", timeout=10000)
    except Exception:  # noqa: BLE001 - 待ちきれなくても続けるが、記録に残す
        errors.append("art not ready after 10s")
    return browser, page, errors


def cmd_sim(a):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser, page, errors = open_page(p, "&fixed=1")
        n = int(a.seconds * FPS)
        page.evaluate(f"() => {{ for (let i = 0; i < {n}; i++) window.__step(1/{FPS}); }}")
        evs = page.evaluate("() => window.__events")
        st = page.evaluate("() => window.__state()")
        browser.close()
    REC.mkdir(parents=True, exist_ok=True)
    (REC / "events.json").write_text(json.dumps(evs, ensure_ascii=False, indent=0), encoding="utf-8")
    summarize(evs)
    print("state", st, "errors", len(errors), errors[:5])


def summarize(evs):
    def first(pred):
        for e in evs:
            if pred(e):
                return e["t"]
        return None
    print("first coin      ", first(lambda e: e["type"] == "coin"))
    print("first affordable", first(lambda e: e["type"] == "afford"))
    print("first buy       ", first(lambda e: e["type"] == "buy"))
    print("first tear      ", first(lambda e: e["type"] == "tear"))
    for t in (1, 2, 3):
        print(f"tier {t}          ", first(lambda e, t=t: e["type"] == "tier" and e["tier"] == t))
    print("scoops", sum(1 for e in evs if e["type"] == "scoop"), "tears", sum(1 for e in evs if e["type"] == "tear"),
          "buys", sum(1 for e in evs if e["type"] == "buy"))
    big = sorted((e for e in evs if e["type"] == "scoop"), key=lambda e: -e["n"])[:5]
    print("biggest scoops", [(e["t"], e["n"], e["value"]) for e in big])


def cmd_fps(a):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser, page, errors = open_page(p, a.extra)
        page.wait_for_timeout(1000)
        page.evaluate("() => window.__fpsReset()")
        page.wait_for_timeout(int(a.seconds * 1000))
        st = page.evaluate("() => window.__fpsStats()")
        state = page.evaluate("() => window.__state()")
        browser.close()
    out = {"fps": st, "state": state, "console_errors": len(errors), "errors": errors[:10]}
    REC.mkdir(parents=True, exist_ok=True)
    (REC / "fps.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=1))


def cmd_bench(a):
    """固定刻みで step+render+getImageData(1px)（描画を強制的に確定）を n フレーム回し、1 フレームの所要時間を測る。"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser, page, errors = open_page(p, "&fixed=1" + a.extra)
        res = page.evaluate("""(n) => {
            const c = document.getElementById('game').getContext('2d');
            for (let i = 0; i < 60; i++) { window.__step(1/60); window.__render(); c.getImageData(0,0,1,1); }
            const ts = [];
            for (let i = 0; i < n; i++) { const t0 = performance.now(); window.__step(1/60); window.__render(); c.getImageData(0,0,1,1); ts.push(performance.now() - t0); }
            ts.sort((a,b)=>a-b);
            const sum = ts.reduce((a,b)=>a+b,0);
            return {frames: n, mean_ms: sum/n, p50_ms: ts[n>>1], p95_ms: ts[Math.floor(n*0.95)], fps_equiv: 1000/(sum/n), state: window.__state()};
        }""", int(a.seconds * 60))
        browser.close()
    res["console_errors"] = len(errors)
    print(json.dumps(res, ensure_ascii=False, indent=1))
    REC.mkdir(parents=True, exist_ok=True)
    (REC / "bench.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")


def cmd_manual(a):
    """bot なしで、マウスとタッチの実イベントで遊べるかを確かめる（ページ座標はキャンバスの縮小に合わせて変換）。"""
    from playwright.sync_api import sync_playwright
    out = {}
    with sync_playwright() as p:
        for mode in ("mouse", "touch"):
            browser = p.chromium.launch(headless=True, args=LAUNCH_ARGS)
            ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                      has_touch=(mode == "touch"), is_mobile=(mode == "touch"))
            page = ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(PROTO.joinpath("index.html").as_uri() + "?seed=3")
            page.wait_for_timeout(600)
            box = page.evaluate("() => { const b = document.getElementById('game').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }")
            to_page = lambda x, y: (box[0] + x * box[2] / 720, box[1] + y * box[3] / 1280)
            dips = 0
            for k in range(12):
                pos = page.evaluate("() => window.__fishPos()")
                fx, fy = pos[k * 3 % len(pos)]
                px, py = to_page(fx, fy)
                if mode == "mouse":
                    page.mouse.move(px, py)
                    page.wait_for_timeout(60)
                    page.mouse.down()
                    page.wait_for_timeout(250)
                    if page.evaluate("() => window.__state().poi") == "dip":
                        dips += 1
                    page.mouse.up()
                else:
                    # タッチ：pointerType=touch の PointerEvent（ブラウザがタッチから作るものと同じ形）
                    page.evaluate("""([x, y]) => {
                        const c = document.getElementById('game');
                        const mk = (type) => new PointerEvent(type, {clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true});
                        c.dispatchEvent(mk('pointerdown')); setTimeout(() => c.dispatchEvent(mk('pointerup')), 250);
                    }""", [px, py])
                    page.wait_for_timeout(150)
                    if page.evaluate("() => window.__state().poi") == "dip":
                        dips += 1
                    page.wait_for_timeout(150)
                page.wait_for_timeout(700)
            st = page.evaluate("() => window.__state()")
            bx, by = to_page(14 + 112, 1088 + 90)
            if mode == "mouse":
                page.mouse.click(bx, by)
            else:
                page.touchscreen.tap(bx, by)
            page.wait_for_timeout(200)
            st2 = page.evaluate("() => window.__state()")
            out[mode] = {"dips_detected": dips, "tries": 12, "coins_after_scoops": st["coins"], "earned": st["earned"],
                         "scoops": st["scoops"], "dur_lv_before": st["lv"].get("dur", st["lv"].get("t")), "dur_lv_after_tap": st2["lv"].get("dur", st2["lv"].get("t")),
                         "console_errors": len(errors)}
            browser.close()
    print(json.dumps(out, ensure_ascii=False, indent=1))
    (REC / "manual.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


def cmd_record(a):
    """固定刻みで [start, start+seconds) のフレームを rec/frames/f#####.jpg に書く。
    シミュレーションは描画に左右されないので、start までは描画せずに進める（並列で区間ごとに撮れる）。"""
    from playwright.sync_api import sync_playwright
    FRAMES.mkdir(parents=True, exist_ok=True)
    i0, n = int(a.start * FPS), int(a.seconds * FPS)
    with sync_playwright() as p:
        browser, page, errors = open_page(p, "&fixed=1")
        if i0:
            page.evaluate(f"() => {{ for (let i = 0; i < {i0}; i++) window.__step(1/{FPS}); }}")
        for i in range(i0, i0 + n):
            data = page.evaluate(f"() => {{ window.__step(1/{FPS}); window.__render(); return document.getElementById('game').toDataURL('image/jpeg', 0.93); }}")
            (FRAMES / f"f{i:05d}.jpg").write_bytes(base64.b64decode(data.split(",", 1)[1]))
            if i == i0:
                now = page.evaluate("() => window.__overlayNow ? window.__overlayNow() : null")
                print("first frame", i, "overlay_now", now, flush=True)
                (REC / f"first_overlay_{a.start:.2f}.json").write_text(json.dumps({"frame": i, "overlay_now": now}), encoding="utf-8")
            if i % 150 == 0:
                print("frame", i, flush=True)
        evs = page.evaluate("() => window.__events")
        ov = page.evaluate("() => window.__overlayMax ? window.__overlayMax() : null")
        browser.close()
    (REC / f"overlay_{int(a.start)}.json").write_text(json.dumps({"start": a.start, "seconds": a.seconds, "overlay_max": ov,
        "overlay_events": [e for e in evs if e["type"] == "overlay" and e["t"] >= a.start]}, ensure_ascii=False), encoding="utf-8")
    print("overlay max", ov)
    if a.start == 0:
        (REC / "events.json").write_text(json.dumps(evs, ensure_ascii=False, indent=0), encoding="utf-8")
        summarize(evs)
    (REC / f"errors_{int(a.start)}.json").write_text(json.dumps(errors, ensure_ascii=False), encoding="utf-8")
    print("console errors", len(errors), errors[:5])


def cmd_encode(a):
    """frames の [start, start+seconds) を mp4 にし、t=1,3,10,30,60 秒のスクショを保存。"""
    import imageio_ffmpeg
    SHOTS.mkdir(parents=True, exist_ok=True)
    i0, n = int(a.start * FPS), int(a.seconds * FPS)
    writer = imageio_ffmpeg.write_frames(str(REC / a.out), (W, H), fps=FPS, codec="libx264", pix_fmt_out="yuv420p",
                                         output_params=["-crf", "18"], macro_block_size=8)
    writer.send(None)
    shot_at = {int(s * FPS) - 1: s for s in (1, 3, 10, 30, 60)}
    for i in range(i0, i0 + n):
        img = load_frame(i)
        writer.send(np.asarray(img).tobytes())
        if i in shot_at and a.shots:
            img.save(SHOTS / f"t{shot_at[i]:02d}s.png")
    writer.close()
    print("wrote", REC / a.out, n / FPS, "s")


def load_frame(i):
    return Image.open(FRAMES / f"f{i:05d}.jpg").convert("RGB")


def caption(img, s, alpha=1.0):
    d = ImageDraw.Draw(img)
    size = 64
    while True:
        f = jp_font(size)
        bb = d.textbbox((0, 0), s, font=f, stroke_width=10)
        w = bb[2] - bb[0]
        if w <= W - 60 or size <= 30:
            break
        size -= 2
    x, y = (W - w) // 2, 226
    d.text((x, y), s, font=f, fill=(255, 255, 255), stroke_width=10, stroke_fill=(15, 10, 20))
    return img


def cmd_trailer(a):
    """events.json を見て、見せ場（掬い・破れ・強化・段位アップ）を含む区間をつなぐ。"""
    import imageio_ffmpeg
    evs = json.loads((REC / "events.json").read_text(encoding="utf-8"))
    # 区間だけ撮ったとき（番号が飛ぶ）も動くよう、枚数ではなく最大の番号+1 を使う
    nframes = max(int(p.stem[1:]) for p in FRAMES.glob("f*.jpg")) + 1
    segs = json.loads(a.segs) if a.segs else auto_segments(evs, nframes)
    print("segments", segs)
    writer = imageio_ffmpeg.write_frames(str(REC / a.name), (W, H), fps=FPS, codec="libx264",
                                         pix_fmt_out="yuv420p", output_params=["-crf", "17"], macro_block_size=8)
    writer.send(None)
    k = 0
    cap = a.caption
    for (s, e) in segs:
        for i in range(int(s * FPS), min(nframes, int(e * FPS))):
            img = load_frame(i)
            if cap and k < int(2.2 * FPS):
                caption(img, cap)
            if k < 450:
                writer.send(np.asarray(img).tobytes())
                k += 1
    while k < 450:  # 区間の端数で 1〜2 コマ足りないときは最後のコマを延ばす
        writer.send(np.asarray(img).tobytes())
        k += 1
    writer.close()
    print("trailer frames", k, "=", k / FPS, "s")


def auto_segments(evs, nframes):
    total = nframes / FPS
    def first(pred, after=0):
        for e in evs:
            if e["t"] >= after and pred(e):
                return e["t"]
        return None
    # 時間順（進み具合が逆戻りしない）。各区間は「すくう直前」から始めて、最初の 0.5 秒で数字が出るようにする
    tear = first(lambda e: e["type"] == "tear")
    big = max((e for e in evs if e["type"] == "scoop" and 1.5 < e["t"] < tear - 1.0), key=lambda e: e["n"])
    t1 = first(lambda e: e["type"] == "tier" and e["tier"] == 1)
    t2 = first(lambda e: e["type"] == "tier" and e["tier"] == 2)
    t3 = first(lambda e: e["type"] == "tier" and e["tier"] == 3)
    rv = first(lambda e: e["type"] == "reveal")
    wh = first(lambda e: e["type"] == "whale_hit")
    if rv and wh:
        # 第6回：最初のコマに前のすくいの数字が残らないよう、直前 1.0 秒にすくいが無いものだけから選ぶ
        scoops = [e for e in evs if e["type"] == "scoop"]
        ok = [e for k, e in enumerate(scoops) if 1.5 < e["t"] < tear - 1.0 and (k == 0 or e["t"] - scoops[k - 1]["t"] >= 1.0)]
        big = max(ok, key=lambda e: e["n"])
        segs = [(big["t"] - 0.25, big["t"] + 1.5)]       # 掴み：まとめてすくう（数字は 1 つ）
        segs.append((tear - 0.6, tear + 1.0))             # 破れ
        segs.append((t1 - 0.7, t1 + 1.8))                 # 強化ボタン → 出目金
        segs.append((t2 - 0.3, t2 + 1.6))                 # 鯉
        tail = (rv - 0.4, rv + 3.9)
        used = sum(e - s for s, e in segs) + (tail[1] - tail[0])
        segs.append((wh - 0.5, wh - 0.5 + 15 - used))     # 鯨をすくう → 水が全部はね上がって白く光る
        segs.append(tail)
        return segs
    if rv:
        # 第5回：最後は「池が星に見える」引きで締める（ボタンを押す 0.4 秒前から）
        segs = [(big["t"] - 0.25, big["t"] + 1.5)]       # 掴み：まとめてすくう（数字は 1 つ）
        segs.append((tear - 0.6, tear + 1.0))             # 破れ
        segs.append((t1 - 0.7, t1 + 1.8))                 # 強化ボタン → 出目金
        segs.append((t2 - 0.3, t2 + 1.6))                 # 鯉
        tail = (rv - 0.4, rv + 3.9)
        used = sum(e - s for s, e in segs) + (tail[1] - tail[0])
        whale = max((e for e in evs if e["type"] == "scoop" and t3 + 1 < e["t"] < rv - 4), key=lambda e: e["n"])
        segs.append((whale["t"] - 0.3, whale["t"] - 0.3 + 15 - used))  # 鯨をまとめてすくう
        segs.append(tail)
        return segs
    segs = [(big["t"] - 0.25, big["t"] + 1.5)]       # 掴み：まとめてすくう
    segs.append((tear - 0.6, tear + 1.1))             # 破れ
    segs.append((t1 - 0.7, t1 + 2.1))                 # 強化ボタンを押す → 出目金・ポイが大きく
    if t3:
        segs.append((t2 - 0.3, t2 + 2.0))             # 鯉
    last = t3 or t2
    used = sum(e - s for s, e in segs)
    segs.append((last - 0.3, min(total, last - 0.3 + 15 - used)))  # 鯨で締め
    return segs


def cmd_sheet(a):
    import imageio_ffmpeg
    rd = imageio_ffmpeg.read_frames(a.mp4)
    meta = next(rd)
    w, h = meta["size"]
    fps = meta["fps"]
    step = int(round(fps * a.step))
    thumbs = []
    for i, fr in enumerate(rd):
        if i % step == 0:
            im = Image.frombytes("RGB", (w, h), fr).resize((w // 4, h // 4))
            d = ImageDraw.Draw(im)
            d.text((4, 4), f"{i / fps:.1f}s", fill=(255, 255, 0), font=jp_font(16))
            thumbs.append(im)
        if len(thumbs) >= a.count:
            break
    cols = a.cols
    rows = (len(thumbs) + cols - 1) // cols
    tw, th = thumbs[0].size
    sheet = Image.new("RGB", (cols * tw, rows * th), (0, 0, 0))
    for i, t in enumerate(thumbs):
        sheet.paste(t, ((i % cols) * tw, (i // cols) * th))
    sheet.save(a.out)
    print("wrote", a.out, sheet.size)


def cmd_compare(a):
    ref = Image.open(a.ref).convert("RGB")
    img = Image.open(a.img).convert("RGB")
    hh = a.height
    ref = ref.resize((int(ref.width * hh / ref.height), hh))
    img = img.resize((int(img.width * hh / img.height), hh))
    out = Image.new("RGB", (ref.width + img.width + 20, hh + 40), (20, 20, 20))
    out.paste(ref, (0, 40))
    out.paste(img, (ref.width + 20, 40))
    d = ImageDraw.Draw(out)
    f = jp_font(24)
    d.text((8, 6), "参考: " + Path(a.ref).name, fill=(255, 255, 255), font=f)
    d.text((ref.width + 28, 6), "すくう: " + Path(a.img).name, fill=(255, 220, 80), font=f)
    out.save(a.out)
    print("wrote", a.out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("--seconds", type=float, default=60)
    ap.add_argument("--out", default="play_60s.mp4")
    ap.add_argument("--segs", default="")
    ap.add_argument("--name", default="trailer_15s.mp4")
    ap.add_argument("--start", type=float, default=0)
    ap.add_argument("--shots", type=int, default=1)
    ap.add_argument("--caption", default="")
    ap.add_argument("--mp4", default="")
    ap.add_argument("--ref", default="")
    ap.add_argument("--img", default="")
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--step", type=float, default=0.5)
    ap.add_argument("--count", type=int, default=24)
    ap.add_argument("--cols", type=int, default=8)
    ap.add_argument("--args", default="--disable-gpu", help="Chromium launch args, comma separated")
    ap.add_argument("--extra", default="", help="extra query string for fps mode")
    ap.add_argument("--channel", default="", help='"chromium" = new headless mode')
    ap.add_argument("--frames", default="", help="frames folder name under rec/ (default: frames)")
    ap.add_argument("--events", default="events.json")
    a = ap.parse_args()
    LAUNCH_ARGS[:] = [x for x in a.args.split(",") if x]
    CHANNEL[0] = a.channel
    if a.frames:
        global FRAMES
        FRAMES = REC / a.frames
    {"sim": cmd_sim, "fps": cmd_fps, "bench": cmd_bench, "manual": cmd_manual, "record": cmd_record, "encode": cmd_encode, "trailer": cmd_trailer,
     "sheet": cmd_sheet, "compare": cmd_compare}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
