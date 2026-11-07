"""1 周目の「10 匹以上を一度に失う破れ」と、あふれ・宇宙の段の出来事を数える。

usage: python tmp/r11/loss.py proto/sukuu-html5/rec/r11_a_h1.json ...
"""
import json
import sys


def main() -> None:
    for p in sys.argv[1:]:
        evs = json.load(open(p, encoding="utf-8"))
        end1 = next((e["t"] for e in evs if e["type"] == "ending"), 1e9)
        loop1 = [e for e in evs if e["t"] <= end1]
        tears = [e for e in loop1 if e["type"] == "tear"]
        big = [(round(e["t"]), e["world"], e["n"], e.get("why"), e.get("w"), e.get("cap"), e.get("wet")) for e in tears if e.get("n", 0) >= 10]
        spills = [e.get("n") for e in loop1 if e["type"] == "spill" and e.get("school")]
        w4 = next((e["t"] for e in loop1 if e["type"] == "world" and e["world"] == 4), None)
        news = [(round(e["t"] - w4, 1), e["what"]) for e in loop1 if w4 and e["t"] >= w4 and e["type"] == "new"]
        print("==", p)
        print("  tears", len(tears), "big(n>=10)", len(big), big)
        print("  school spills", len(spills), spills)
        print("  cosmos new events", news)


if __name__ == "__main__":
    main()
