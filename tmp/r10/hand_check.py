"""批評 r9 の 1 番の物差しで、初心者のまね（tmp/critic/hand.py）の結果を数える。

usage: python tmp/r10/hand_check.py tmp/critic/<dir>
"""
import json
import sys
from pathlib import Path


def main() -> None:
    d = Path(sys.argv[1])
    evs = json.loads((d / "events.json").read_text(encoding="utf-8"))
    tears = [e["t"] for e in evs if e["type"] == "tear"]
    scoops = [(e["t"], e.get("value", 0)) for e in evs if e["type"] == "scoop"]
    buys = [e["t"] for e in evs if e["type"] == "buy"]
    worlds = [(e["t"], e["world"]) for e in evs if e["type"] == "world"]
    first3 = [e for e in evs if e["type"] in ("scoop", "tear")][:3]
    print("first3", [e["type"] for e in first3])
    print("tears 0-60", sum(t <= 60 for t in tears), " 61-120", sum(60 < t <= 120 for t in tears))
    win = max((sum(s <= t < s + 10 for t in tears) for s in range(60, 120)), default=0)
    print("max tears in any 10s window (60-120)", win)
    e1 = sum(v for t, v in scoops if t <= 60)
    e2 = sum(v for t, v in scoops if 60 < t <= 120)
    print(f"earn 0-60 {e1:.0f}  61-120 {e2:.0f}  ok={e2 >= e1}")
    print("buys", [round(t, 1) for t in buys])
    print("worlds", worlds)
    print("tear times", [round(t, 1) for t in tears])


if __name__ == "__main__":
    main()
