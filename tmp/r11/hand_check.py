"""批評 r10 の 1 番の物差しで、初心者のまね（tmp/critic/hand.py）の結果を数える。

usage: python tmp/r11/hand_check.py tmp/critic/<dir> [secs]
基準：すくい 0 の間 <=20 秒、買い物の間隔 <=30 秒、
後半 3 区間（30 秒ごと）の稼ぎが前の区間の 1.2 倍以上、
180 秒で池の主をすくう（boss_catch）か海に着く。
"""
import json
import sys
from pathlib import Path


def main() -> None:
    d = Path(sys.argv[1])
    secs = float(sys.argv[2]) if len(sys.argv) > 2 else 180.0
    evs = json.loads((d / "events.json").read_text(encoding="utf-8"))
    scoops = [(e["t"], e.get("value", 0)) for e in evs if e["type"] == "scoop"]
    buys = [e["t"] for e in evs if e["type"] == "buy"]
    tears = [e for e in evs if e["type"] == "tear"]
    gaps = [b - a for a, b in zip([0.0] + [t for t, _ in scoops], [t for t, _ in scoops] + [secs])]
    bgaps = [b - a for a, b in zip([0.0] + buys, buys + [secs])]
    wins = [sum(v for t, v in scoops if i * 30 < t <= (i + 1) * 30) for i in range(int(secs // 30))]
    growth = [round(wins[i] / max(wins[i - 1], 1e-9), 2) for i in range(1, len(wins))]
    boss = [e["t"] for e in evs if e["type"] == "boss_catch"]
    sea = [e["t"] for e in evs if e["type"] == "world" and e["world"] == 1]
    print("scoops", len(scoops), "tears", len(tears), "big tears(n>=10)", sum(e.get("n", 0) >= 10 for e in tears))
    print(f"max no-scoop gap {max(gaps):.1f}s  ok={max(gaps) <= 20}")
    print(f"buys {[round(t, 1) for t in buys]}  max gap {max(bgaps):.1f}s  ok={max(bgaps) <= 30}")
    print("earn per 30s", [round(w) for w in wins], "growth", growth,
          "ok=", all(g >= 1.2 for g in growth[-3:]))
    print("boss_catch", boss, "sea", sea, "ok=", bool(boss or sea))
    print("soggy", sum(e["type"] == "soggy" for e in evs), "assist", sum(e["type"] == "assist" for e in evs))


if __name__ == "__main__":
    main()
