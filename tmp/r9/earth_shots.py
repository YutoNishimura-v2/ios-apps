"""地球⇄キンちゃんの場面を、時刻ごとにスクショする。usage: python tmp/r9/earth_shots.py <outdir> t1,t2,...
大陸の段を bot で進めて本物の遷移を起こし、earth の場面の各時刻で撮る。"""
import sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(r"C:\Users\yuton\workspace\ios-apps")
OUT = ROOT / "tmp" / "r9" / sys.argv[1]; OUT.mkdir(parents=True, exist_ok=True)
ats = [float(x) for x in sys.argv[2].split(",")]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--disable-gpu"])
    pg = b.new_page(viewport={"width": 720, "height": 1280})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((ROOT / "proto/sukuu-html5/index.html").as_uri() + "?bot=1&fixed=1&seed=1&world=2")
    pg.wait_for_timeout(300)
    # 大陸の段を、地球の場面が始まるまで進める（最大 200 秒）
    ok = pg.evaluate("""() => { const D = window.__debug; D.G.lv.t = 4; D.G.lv.d = 3; D.G.lv.s = 2; D.poi.rT = D.poi.r = 84*(1+0.16*2);
      for (let i = 0; i < 6000; i++) { window.__step(1/30); if (D.G.trans && D.G.trans.from === 2) return D.G.trans.t; } return -1; }""")
    print("trans start", ok)
    t = 0.0
    for at in ats:
        pg.evaluate(f"() => {{ for (let i = 0; i < {int(round((at - t) * 30))}; i++) window.__step(1/30); window.__render(); }}")
        t = at
        pg.screenshot(path=str(OUT / f"e{at:04.1f}.png"))
    print("errors", errs)
    b.close()
