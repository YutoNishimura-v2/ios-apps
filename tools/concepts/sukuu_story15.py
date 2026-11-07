"""『すくう』社内用：「だんだん大きいものを掬う → 種明かし」を 1 本 15 秒で通す縦動画。

たらい → 池の鯉 → 海の鯨 → 大陸 → 地球 → 銀河 → 引くと最初のたらい（金魚が惑星）。
使い方: python tools/concepts/sukuu_story15.py <出力フォルダ>
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sukuu_animatic as base  # noqa: E402
import sukuu_animatic_v2 as v2  # noqa: E402
import imageio_ffmpeg  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

W, H, FPS = base.W, base.H, base.FPS
ease, seg, lerp = base.ease, base.seg, base.lerp
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)


def big_fish(img, s, color, label_text):
    base.goldfish(img, v2.CX, v2.CY, s, ang=-0.2, color=color)


def stage_img(kind, t):
    """各段階の「ポイが獲物を持ち上げている」絵。"""
    if kind == "tub":
        img = v2.world_festival(t)
        base.poi(img, v2.CX, v2.CY, 150, paper_alpha=150)
        base.goldfish(img, v2.CX, v2.CY, 40, ang=-0.3)
        return img, "金魚 1 匹", 0
    if kind == "pond":
        img = Image.new("RGBA", (W, H), (20, 60, 40, 255))
        d = ImageDraw.Draw(img)
        d.ellipse((-200, 300, 920, 1100), fill=(30, 90, 80))
        base.poi(img, v2.CX, v2.CY, 230, paper_alpha=150)
        base.goldfish(img, v2.CX, v2.CY, 120, ang=-0.2, color=(230, 230, 230))
        base.goldfish(img, v2.CX + 30, v2.CY - 20, 40, ang=-0.2, color=(240, 90, 40))
        return img, "池の鯉", 2
    if kind == "sea":
        img = Image.new("RGBA", (W, H), (10, 40, 90, 255))
        d = ImageDraw.Draw(img)
        for i in range(10):
            y = 200 + i * 100
            d.line((0, y, W, y + 15 * math.sin(t * 5 + i)), fill=(30, 80, 150), width=3)
        base.poi(img, v2.CX, v2.CY, 260, paper_alpha=150)
        base.goldfish(img, v2.CX, v2.CY, 190, ang=-0.15, color=(70, 90, 130))
        return img, "海の鯨", 5
    if kind == "continent":
        img = base.scene_continent(0.95)
        return img, "大陸", 9
    if kind == "earth":
        img = v2.world_space(t)
        base.poi(img, v2.CX, v2.CY, v2.R, paper_alpha=60)
        base.paste_center(img, base.EARTH, v2.CX, v2.CY, 0.62)
        return img, "地球", 24
    if kind == "galaxy":
        img = v2.world_space(t)
        base.poi(img, v2.CX, v2.CY, v2.R, paper_alpha=60)
        base.paste_center(img, base.GALAXY, v2.CX, v2.CY, 0.6)
        return img, "銀河", 44
    raise ValueError(kind)


ORDER = ["tub", "pond", "sea", "continent", "earth", "galaxy"]
STEP = 1.8  # 1 段階の秒数
REVEAL = 15.0 - STEP * len(ORDER)  # 残りを種明かしに


def frame(sec):
    if sec < STEP * len(ORDER):
        i = int(sec // STEP)
        f = (sec - i * STEP) / STEP
        cur, name, exp = stage_img(ORDER[i], sec)
        img = cur
        if f > 0.6 and i + 1 < len(ORDER):
            nxt, _, _ = stage_img(ORDER[i + 1], sec)
            img = v2.nest(nxt, cur, seg(f, 0.6, 1.0), ring=False)
        d = ImageDraw.Draw(img)
        pop = 1 + 0.25 * math.sin(clamp01(f / 0.25) * math.pi)
        base.text_c(d, (W / 2, 1000), f"{name}、すくえた", int(60 * pop), fill=(255, 230, 90))
        v2.hook(img, ["金魚すくいを", "強くしていったら"])
        v2.kin_bag(img, exp)
        return img
    t = (sec - STEP * len(ORDER)) / REVEAL
    gal, _, _ = stage_img("galaxy", sec)
    outer = v2.world_festival(sec, fish_planets=max(0.001, ease(seg(t, 0.45, 0.8))))
    img = v2.nest(outer, gal, seg(t, 0.0, 0.4), ring=False, r_final=95)
    if t > 0.4:
        v2.hook(img, ["最初のたらいの", "金魚、ぜんぶ惑星"])
    else:
        v2.hook(img, ["さらに引くと……"])
    v2.kin_bag(img, 80, earth_mix=ease(seg(t, 0.6, 0.9)))
    return img


def clamp01(x):
    return max(0.0, min(1.0, x))


def main():
    path = os.path.join(OUT, "story15_9x16.mp4")
    w = imageio_ffmpeg.write_frames(path, (W, H), fps=FPS, codec="libx264", pix_fmt_out="yuv420p", quality=8)
    w.send(None)
    n = int(15 * FPS)
    for i in range(n):
        sec = i / FPS
        img = frame(sec)
        w.send(img.convert("RGB").tobytes())
        for mark in (0.9, 5.0, 9.6, 13.5, 14.9):
            if abs(sec - mark) < 0.5 / FPS:
                img.convert("RGB").save(os.path.join(OUT, f"story15_{mark:04.1f}s.png"))
    w.close()
    print("wrote", path)


if __name__ == "__main__":
    main()
