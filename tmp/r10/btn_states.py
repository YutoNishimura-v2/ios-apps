"""店のボタンの見た目を、お金の量を変えて撮る（買える／半分たまった／買えない）。

usage: python tmp/r10/btn_states.py <out_dir> <at_seconds> <coins,coins,...>
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "proto" / "sukuu-html5" / "index.html"
FPS = 30


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    at = float(sys.argv[2])
    coins_list = [float(x) for x in sys.argv[3].split(",")]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-gpu"])
        page = browser.new_page(viewport={"width": 720, "height": 1280})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(PAGE.as_uri() + "?bot=1&fixed=1&seed=1&human=1")
        page.wait_for_timeout(400)
        n = int(at * FPS)
        page.evaluate(f"() => {{ for (let i = 0; i < {n}; i++) window.__step(1/{FPS}); }}")
        for coins in coins_list:
            page.evaluate(f"() => {{ window.__debug.G.coins = {coins}; window.__debug.G.disp = {coins}; window.__render(); }}")
            page.screenshot(path=str(out / f"c{int(coins)}.png"), clip={"x": 0, "y": 1040, "width": 720, "height": 240})
        browser.close()
    print("errors", len(errors), errors[:3])


if __name__ == "__main__":
    main()
