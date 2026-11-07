"""すくう 第7回以降の確かめ（固定刻みの bot プレイを回して、世界ごとの時間・新しいできごとの間隔・エラーを出す）

python tools/proto/sukuu_check.py sim --seconds 400 [--human] [--seed 1] [--out events_r7.json]
python tools/proto/sukuu_check.py upg   # 強化の有無で起きることが変わるか（C17）
python tools/proto/sukuu_check.py shots --at 5,30,60 [--human]  # 指定の秒のスクショ
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROTO = ROOT / "proto" / "sukuu-html5"
REC = PROTO / "rec"
FPS = 30


def open_page(p, q):
    browser = p.chromium.launch(headless=True, args=["--disable-gpu"])
    page = browser.new_page(viewport={"width": 720, "height": 1280}, device_scale_factor=1)
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(PROTO.joinpath("index.html").as_uri() + "?" + q)
    page.wait_for_timeout(400)
    return browser, page, errors


def step(page, seconds, render_every=0):
    n = int(seconds * FPS)
    if render_every:
        page.evaluate(f"() => {{ for (let i = 0; i < {n}; i++) {{ window.__step(1/{FPS}); if (i % {render_every} === 0) window.__render(); }} }}")
    else:
        page.evaluate(f"() => {{ for (let i = 0; i < {n}; i++) window.__step(1/{FPS}); }}")


def report(evs):
    out = {}
    worlds = [e for e in evs if e["type"] == "world"]
    out["world_start"] = [(e["world"], e["t"]) for e in worlds]
    out["boss_catch"] = [(e["world"], e["t"]) for e in evs if e["type"] == "boss_catch"]
    out["ending"] = [e["t"] for e in evs if e["type"] == "ending"]
    by = {}
    for e in evs:
        if e["type"] == "scoop":
            for k in e["kinds"]:
                by.setdefault(e["world"], {}).setdefault(k, 0)
                by[e["world"]][k] += 1
    out["scoops_by_world_kind"] = by
    out["tears"] = [(e["world"], e["t"], e["why"], e["kinds"][:3], e["boss"]) for e in evs if e["type"] == "tear"]
    out["buys"] = [(e["world"], e["t"], e["item"], e["lv"]) for e in evs if e["type"] == "buy"]
    news = [e for e in evs if e["type"] == "new"]
    out["new_events"] = [(round(e["t"], 1), e["what"]) for e in news]
    ts = [0.0] + [e["t"] for e in news]
    end = out["ending"][0] if out["ending"] else (evs[-1]["t"] if evs else 0)
    ts.append(end)
    gaps = [(round(b - a, 1), round(a, 1)) for a, b in zip(ts, ts[1:])]
    out["max_gap"] = max(gaps) if gaps else None
    out["rescue"] = sum(e["n"] for e in evs if e["type"] == "rescue")
    out["lost"] = sum(1 for e in evs if e["type"] == "lost")
    out["overlay_max"] = max([e["n"] for e in evs if e["type"] == "overlay"] or [0])
    big = sorted((e for e in evs if e["type"] == "scoop"), key=lambda e: -e["n"])[:3]
    out["biggest"] = [(e["world"], e["t"], e["n"]) for e in big]
    # ---- 批評役の物差し（1 周目＝最初の ending まで）
    end1 = out["ending"][0] if out["ending"] else (evs[-1]["t"] if evs else 0)
    e1 = [e for e in evs if e["t"] <= end1]
    ws = [e["t"] for e in e1 if e["type"] == "world"] + [end1]
    out["stage_ups"] = sum(1 for e in e1 if e["type"] == "world") - 1 + (1 if out["ending"] else 0)
    out["stage_secs"] = [round(b - a, 1) for a, b in zip(ws, ws[1:])]
    out["last_stage_at"] = round(ws[-2], 1) if len(ws) >= 2 else None
    tries = [e for e in e1 if e["type"] in ("scoop", "tear")]
    def rate(sel):
        s = [e for e in tries if sel(e)]
        return (round(sum(1 for e in s if e["type"] == "tear") / len(s), 3) if s else None, len(s))
    out["tear_rate_first15s_of_stage"] = rate(lambda e: any(0 <= e["t"] - w < 15 for w in ws[:-1]))
    tbuys = [e["t"] for e in e1 if e["type"] == "buy" and e["item"] == "t"]
    out["tear_rate_10s_after_thick_buy"] = rate(lambda e: any(0 <= e["t"] - b < 10 for b in tbuys))
    out["tears_total_loop1"] = sum(1 for e in e1 if e["type"] == "tear")
    out["tears_in_360s"] = sum(1 for e in evs if e["type"] == "tear" and e["t"] <= 360)
    bt = [e["t"] for e in e1 if e["type"] == "buy"]
    gaps_b = [round(b - a, 1) for a, b in zip(bt, bt[1:])]
    out["buy_gap_max"] = max(gaps_b) if gaps_b else None
    out["buy_gap_min"] = min(gaps_b) if gaps_b else None
    inc = {}
    for e in e1:
        if e["type"] == "scoop":
            inc[int(e["t"] // 30)] = inc.get(int(e["t"] // 30), 0) + e["value"]
    seq = [round(inc.get(i, 0)) for i in range(int(end1 // 30) + 1)]
    out["income_per_30s"] = seq
    out["income_drops"] = sum(1 for a, b in zip(seq, seq[1:]) if b < a)
    out["big_effects"] = sum(1 for e in e1 if e["type"] in ("boss_catch", "whale_hit"))
    # 最大のまま 10 秒を超えたボタン（世界が変わると Lv は 0 に戻る）
    MAX = {"t": 6, "s": 6, "d": 5}
    stuck = []
    for e in e1:
        if e["type"] == "buy" and e["lv"] >= MAX[e["item"]]:
            nxt = min([t for t in ws if t > e["t"]] or [end1])
            if nxt - e["t"] > 10:
                stuck.append((e["item"], e["t"], round(nxt - e["t"], 1)))
    out["maxed_over_10s"] = stuck
    # ---- 2 周目（第8回）：restart から 60 秒に、1 周目に無かった「新しいできごと」がいくつあるか
    ri = [i for i, e in enumerate(evs) if e["type"] == "restart"]
    rs = [evs[i]["t"] for i in ri]
    if rs:
        w1 = {e["what"] for e in evs[:ri[0]] if e["type"] == "new"}
        n2 = [e["what"] for e in evs[ri[0]:] if e["type"] == "new" and e["t"] <= rs[0] + 60 and e["what"] not in w1]
        out["loop2_new_first60"] = n2
        s2 = [e for e in evs if e["type"] == "boss_catch" and e["t"] > rs[0]]
        out["loop2_first_boss_after"] = round(s2[0]["t"] - rs[0], 1) if s2 else None
    out["earth_reveal"] = [e["t"] for e in evs if e["type"] == "earth_reveal"]
    return out


def cmd_sim(a):
    from playwright.sync_api import sync_playwright
    q = f"bot=1&fixed=1&seed={a.seed}" + ("&human=1" if a.human else "") + (f"&world={a.world}" if a.world else "") + (f"&perk={a.perk}" if a.perk else "")
    with sync_playwright() as p:
        browser, page, errors = open_page(p, q)
        # 描画も時々回して、描画のエラーも拾う
        step(page, a.seconds, render_every=15)
        evs = page.evaluate("() => window.__events")
        st = page.evaluate("() => window.__state()")
        browser.close()
    REC.mkdir(parents=True, exist_ok=True)
    (REC / a.out).write_text(json.dumps(evs, ensure_ascii=False), encoding="utf-8")
    r = report(evs)
    r["state"] = st
    r["errors"] = errors[:5]
    r["error_count"] = len(errors)
    print(json.dumps(r, ensure_ascii=False, indent=1))


def cmd_upg(a):
    """同じ seed で world=N から始め、厚さを Lv4 にした場合と Lv0 のままの場合に、主を狙わせて結果を比べる。"""
    from playwright.sync_api import sync_playwright
    res = {}
    with sync_playwright() as p:
        for world in range(4):
            for lv, sz in ((0, 0), (4, 0), (4, 2)):
                browser, page, errors = open_page(p, f"fixed=1&seed=3&world={world}")
                # 主が出るまで進める
                step(page, 3)
                r = page.evaluate("""([lv, sz]) => {
                  const D = window.__debug, G = D.G, poi = D.poi;
                  G.lv.t = lv; G.lv.d = 2; G.lv.s = sz; poi.rT = poi.r = 84 * (1 + 0.16 * sz);
                  const b = D.fish.find(f => f.K.boss);
                  if (!b) return {err: 'no boss'};
                  // 主の真上に沈めて、主がポイに入ったら上げる（最大 1.5 秒）
                  const inp = window.__input;
                  inp.move(b.x, b.y); for (let i = 0; i < 20; i++) window.__step(1/30);
                  inp.down(b.x, b.y);
                  let t = 0;
                  for (; t < 45; t++) {
                    inp.move(b.x, b.y); window.__step(1/30);
                    if (Math.hypot(b.x - poi.x, b.y - poi.y) + b.r * 0.55 <= poi.r * 0.98 && t > 3) break;
                  }
                  inp.up(); for (let i = 0; i < 10; i++) window.__step(1/30);
                  const ev = window.__events.filter(e => e.type === 'tear' || e.type === 'boss_catch' || e.type === 'scoop').map(e => e.type + (e.why ? ':' + e.why : ''));
                  return {events: ev, cap: +(3 * Math.pow(1.6, lv)).toFixed(1), boss_w: b.K.w};
                }""", [lv, sz])
                r["errors"] = len(errors)
                res[f"world{world}_thick{lv}_size{sz}"] = r
                browser.close()
    print(json.dumps(res, ensure_ascii=False, indent=1))
    (REC / "upg_r7.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")


def cmd_shots(a):
    from playwright.sync_api import sync_playwright
    q = f"bot=1&fixed=1&seed={a.seed}" + ("&human=1" if a.human else "") + (f"&world={a.world}" if a.world else "") + (f"&perk={a.perk}" if a.perk else "")
    outdir = REC / a.dir
    outdir.mkdir(parents=True, exist_ok=True)
    ats = [float(x) for x in a.at.split(",")]
    with sync_playwright() as p:
        browser, page, errors = open_page(p, q)
        t = 0.0
        for at in ats:
            step(page, at - t)
            t = at
            page.evaluate("() => window.__render()")
            page.screenshot(path=str(outdir / f"t{at:06.1f}.png"))
        browser.close()
    print("errors", len(errors), errors[:5], "->", outdir)


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("sim"); s.add_argument("--seconds", type=float, default=400); s.add_argument("--human", action="store_true")
    s.add_argument("--seed", type=int, default=1); s.add_argument("--world", type=int, default=0); s.add_argument("--out", default="events_r7.json")
    s.add_argument("--perk", default="")  # 周回の始めに bot が選ぶお守り（thick/size/dry/bell/fuku）
    sp.add_parser("upg")
    s = sp.add_parser("shots"); s.add_argument("--at", required=True); s.add_argument("--human", action="store_true")
    s.add_argument("--seed", type=int, default=1); s.add_argument("--world", type=int, default=0); s.add_argument("--dir", default="shots_r7")
    s.add_argument("--perk", default="")
    a = ap.parse_args()
    {"sim": cmd_sim, "upg": cmd_upg, "shots": cmd_shots}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
