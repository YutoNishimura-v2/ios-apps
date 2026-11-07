"""『すくう』社内用の絵コンテ動画 第 2 版（縦 9:16、1 本ずつ別ファイル＋まとめ 1 本）。

調査の型を反映：1 フレーム目から字幕で「何のゲームか」を言う／15 秒以内／
最初の金魚（キンちゃん）の袋を画面の隅に置き続けて大きさの目盛りにする／ループ。
使い方: python tools/concepts/sukuu_animatic_v2.py <出力フォルダ>
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sukuu_animatic as base  # noqa: E402  素材と部品を使い回す
import imageio_ffmpeg  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

W, H, FPS = base.W, base.H, base.FPS
ease, seg, lerp, clamp = base.ease, base.seg, base.lerp, base.clamp
text_c, poi, goldfish, starfield = base.text_c, base.poi, base.goldfish, base.starfield
EARTH, GALAXY, CONT = base.EARTH, base.GALAXY, base.CONT
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
CX, CY, R = W / 2, 640, 260


def make_bands(size=600):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cols = [(220, 170, 120), (190, 120, 80), (235, 205, 160), (170, 100, 70), (225, 185, 140)]
    for i in range(12):
        y0 = i * size / 12
        d.rectangle((0, y0, size, y0 + size / 12 + 1), fill=cols[i % len(cols)] + (255,))
    img = img.filter(ImageFilter.GaussianBlur(6))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    img.putalpha(mask)
    return img


BANDS = make_bands()


def kin_bag(img, exp, glow=0.0, earth_mix=0.0):
    """画面左下の「キンちゃんの袋」。いつも同じ大きさで、隣に倍率を出す。"""
    d = ImageDraw.Draw(img)
    x, y = 70, 1110
    if glow > 0:
        g = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse((x - 30, y - 30, x + 150, y + 150), fill=(255, 230, 120, int(180 * glow)))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(18)))
    d.rounded_rectangle((x, y, x + 120, y + 130), 30, fill=(230, 240, 255, 255), outline=(255, 255, 255), width=3)
    d.rectangle((x + 40, y - 12, x + 80, y + 6), fill=(230, 60, 80))
    goldfish(img, x + 62, y + 72, 26, ang=0.2, texture=EARTH, tex_mix=earth_mix)
    d = ImageDraw.Draw(img)
    d.text((x + 140, y + 40), "キンちゃん", font=base.font(26), fill=(255, 255, 255), anchor="lm", stroke_width=4, stroke_fill=(0, 0, 0))
    d.text((x + 140, y + 85), f"×10^{exp}" if exp else "×1", font=base.font(34), fill=(255, 230, 90), anchor="lm", stroke_width=4, stroke_fill=(0, 0, 0))


def hook(img, lines, y=230, size=50):
    d = ImageDraw.Draw(img)
    for i, s in enumerate(lines):
        text_c(d, (W / 2, y + i * (size + 14)), s, size)


def tag(img, s):
    base.label(img, s)


def nest(outer, inner, k, ring=True, paper_alpha=40, r_final=None):
    """inner（前の世界）を outer のポイの中へ引いていく。k=0 で全画面、k=1 でポイの中。"""
    k = ease(k)
    rf = R if r_final is None else r_final
    r_disp = lerp(800, rf * 0.86, k)
    sc = lerp(1.0, (2 * rf * 0.86) / W * 1.15, k)
    w, h = int(W * sc), int(H * sc)
    small = inner.resize((w, h), Image.LANCZOS)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.alpha_composite(small, (int(CX - w / 2), int(CY - h / 2)))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((CX - r_disp, CY - r_disp, CX + r_disp, CY + r_disp), fill=255)
    out = outer.copy()
    out.paste(layer, (0, 0), Image.composite(layer.getchannel("A"), Image.new("L", (W, H), 0), mask))
    if ring and k > 0.02:
        poi(out, CX, CY, max(R, r_disp), paper_alpha=paper_alpha)
    return out


# ---------- 世界（ポイの外側の背景） ----------
def world_festival(t, fish_planets=0.0):
    img = Image.new("RGBA", (W, H), (25, 15, 30, 255))
    base.lanterns(img, t * 6)
    base.festival_tub(img, t * 6)
    if fish_planets > 0:
        for i in range(9):
            a = t * 6 * (0.6 + 0.1 * i) + i * 0.7
            x = 360 + math.cos(a) * (120 + 15 * i) * 0.9
            y = 760 + math.sin(a * 1.3) * (90 + 12 * i)
            goldfish(img, x, y, 26 + (i % 3) * 4, ang=a + math.pi / 2, texture=EARTH if i % 2 else BANDS, tex_mix=fish_planets)
    return img


def world_space(t, obj=None, obj_scale=0.6):
    img = Image.new("RGBA", (W, H), (5, 5, 18, 255))
    starfield(img, 1.0, drift=t * 0.03)
    if obj is not None:
        base.paste_center(img, obj, CX, CY, obj_scale)
    return img


# ---------- 切り抜き 7 本 ----------
def clip_continent(t):
    """① 金魚すくいのポイで大陸すくってみた（10 秒）。"""
    if t < 0.78:
        img = base.scene_continent(t / 0.78 * 0.95)
        exp = 9 if t > 0.55 else 6
    else:
        inner = base.scene_continent(0.95)
        img = nest(world_space(t), inner, seg(t, 0.78, 1.0))
        exp = 9
        d = ImageDraw.Draw(img)
        if t > 0.9:
            text_c(d, (W / 2, 1000), "ドン！ 看板：「大陸すくい」", 44, fill=(255, 230, 90))
    hook(img, ["金魚すくいのポイで", "大陸すくってみた"])
    kin_bag(img, exp)
    return img


def clip_tease(t):
    """② 宣伝用の匂わせ：この金魚、なんか変じゃない？（8 秒、答えは見せない）。"""
    if t > 0.88:
        img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        text_c(ImageDraw.Draw(img), (W / 2, H / 2), "？", 200)
        return img
    img = Image.new("RGBA", (W, H), (25, 15, 30, 255))
    base.lanterns(img, t * 4, 0.7)
    z = lerp(1.0, 3.0, ease(seg(t, 0.15, 0.85)))
    poi(img, CX, 700, 150 * z, paper_alpha=150, handle=False)
    fx, fy = CX - 10 * z, 700
    goldfish(img, fx, fy, 55 * z, ang=-0.2, texture=BANDS, tex_mix=0.35)
    # 小さな衛星が回っている
    a = t * 9
    mx, my = fx + math.cos(a) * 90 * z, fy + math.sin(a) * 35 * z
    ImageDraw.Draw(img).ellipse((mx - 5 * z, my - 5 * z, mx + 5 * z, my + 5 * z), fill=(220, 220, 230))
    hook(img, ["この金魚、", "なんか変じゃない？"])
    return img


def clip_galaxy_save(t):
    """③ 残り 1% で銀河を引き上げる（10 秒）。破れる → 0.4 秒でおわんキャッチ。"""
    img = world_space(t)
    tear = ease(seg(t, 0.05, 0.55))
    ripped = 0.55 < t < 0.68
    if not ripped:
        poi(img, CX, CY, R, tear=tear * 0.95, paper_alpha=170, flash=0.6 if (math.sin(t * 45) > 0.5 and t < 0.55) else 0)
    else:
        poi(img, CX, CY, R, tear=1.0, paper_alpha=30)
    gy = CY + (lerp(0, 180, seg(t, 0.55, 0.62)) if t > 0.55 else 0)
    if t >= 0.62:
        gy = CY + 180 - 180 * ease(seg(t, 0.62, 0.8))
    base.paste_center(img, GALAXY, CX, gy, 0.6)
    d = ImageDraw.Draw(img)
    if t >= 0.6:
        bw = 300
        by = CY + 170 - 180 * ease(seg(t, 0.62, 0.8))
        d.chord((CX - bw, by - 120, CX + bw, by + 120), 0, 180, fill=(140, 40, 50, 255))
        d.text((CX, by + 150), "おわん", font=base.font(30), fill=(255, 255, 255), anchor="mm")
    dur = max(1, int(lerp(100, 1, tear)))
    d.rounded_rectangle((80, 360, 640, 396), 10, outline=(255, 255, 255), width=3)
    d.rounded_rectangle((84, 364, 84 + int(552 * dur / 100), 392), 8, fill=(255, 70, 70) if dur < 20 else (120, 220, 120))
    if ripped:
        text_c(d, (W / 2, 450), "破れた！", 60, fill=(255, 90, 90))
    if t > 0.8:
        rr = random.Random(int(t * 100))
        for _ in range(80):
            x, y = rr.uniform(0, W), rr.uniform(300, 1100)
            d.rectangle((x, y, x + 8, y + 4), fill=rr.choice([(255, 90, 90), (255, 220, 90), (120, 200, 255), (255, 255, 255)]))
        text_c(d, (W / 2, 980), "おわんキャッチ！", 70, fill=(120, 255, 160))
    hook(img, ["残り1%で", "銀河を引き上げる"])
    base.kin_exp = 0
    kin_bag(img, 44)
    return img


def clip_numbers(t):
    """④ 数字が壊れる：12 匹 → 1e308 → ∞匹（7 秒）。"""
    img = base.scene_numbers(min(t, 0.84) / 0.84 * 0.8 if t < 0.84 else 0.8)
    d = ImageDraw.Draw(img)
    # 元の場面の数字を上書きする
    d.rectangle((0, 290, W, 440), fill=(8, 6, 20))
    if t < 0.1:
        s = "12"
    elif t < 0.84:
        k = ease(seg(t, 0.1, 0.84))
        s = base.fmt_big(10 ** (1 + k * 307))
    else:
        s = "∞"
    text_c(d, (W / 2, 365), s + " 匹", 100, fill=(255, 230, 90) if s != "∞" else (255, 90, 90))
    if t > 0.86:
        text_c(d, (W / 2, 520), "屋台のおじさん：……", 40)
    hook(img, ["すくった数が", "おかしくなった"], y=150, size=44)
    kin_bag(img, 308 if t > 0.5 else int(300 * t))
    return img


_STAGES = None


def stages():
    global _STAGES
    if _STAGES is None:
        a = world_festival(0.3)
        poi(a, 430, 700, 110)
        goldfish(a, 430, 700, 28, ang=-0.4)
        b = world_space(0.1, EARTH, 0.62)
        c = world_space(0.2, GALAXY, 0.6)
        _STAGES = [a, b, c]
    return _STAGES


def clip_loop(t):
    """⑤ 一気に引く：たらい → 地球 → 銀河 → 宇宙もたらいの中（15 秒・ループ）。"""
    a, b, c = stages()
    n = 3
    k = t * n
    i = min(n - 1, int(k))
    f = k - i
    if i == 0:
        img = nest(world_space(t, EARTH, 0.0), a, f)  # たらいの世界が地球を掬うポイの中へ
        img = nest(b, a, f) if f > 0 else a
    elif i == 1:
        img = nest(c, b, f)
    else:
        outer = world_festival(t)
        img = nest(outer, c, f, ring=False)
        if f > 0.5:
            poi(img, 430, 700, 110 * (1 + (1 - f)), paper_alpha=60)
    hook(img, ["金魚すくい、", "引いてみたら"])
    kin_bag(img, [0, 24, 60][i] + int(f * 20))
    return img


def clip_reveal_mid(t):
    """⑥ 種明かし・途中案：地球を掬った瞬間、キンちゃんの模様と同じだと気づく（10 秒）。"""
    img = world_space(t, EARTH, 0.62)
    poi(img, CX, CY, R, paper_alpha=60)
    base.paste_center(img, EARTH, CX, CY, 0.62)
    glow = ease(seg(t, 0.25, 0.45))
    if t < 0.5:
        kin_bag(img, 24, glow=glow)
        hook(img, ["地球をすくった。", "……あれ？"])
    else:
        z = ease(seg(t, 0.5, 0.75))
        bg = Image.new("RGBA", (W, H), (230, 240, 255, 255))
        goldfish(bg, CX, 700, lerp(60, 200, z), ang=0.2, texture=EARTH, tex_mix=ease(seg(t, 0.6, 0.85)))
        img = bg
        hook(img, ["キンちゃんの模様と", "同じ……？"], y=230)
    tag(img, "種明かし・途中案（4晩目・全体の6割）")
    return img


def clip_reveal_end(t):
    """⑦ 種明かし・最後案：宇宙を掬って引くと、最初のたらいだった（10 秒）。"""
    a, b, c = stages()
    if t < 0.4:
        img = world_space(t, GALAXY, lerp(0.6, 0.3, t))
        poi(img, CX, CY, R, paper_alpha=60)
        hook(img, ["最後に", "すくったのは……"])
    else:
        outer = world_festival(t, fish_planets=ease(seg(t, 0.65, 0.9)))
        img = nest(outer, c, seg(t, 0.4, 0.7), ring=False)
        if t > 0.7:
            hook(img, ["最初の", "たらいだった"])
    kin_bag(img, 80, earth_mix=ease(seg(t, 0.75, 0.95)))
    tag(img, "種明かし・最後案（6晩目・エンディング）")
    return img


CLIPS = [
    ("1_continent", "① 大陸すくい", clip_continent, 10.0),
    ("2_tease_ad", "② 宣伝用の匂わせ", clip_tease, 8.0),
    ("3_galaxy_save", "③ 残り1%の救出", clip_galaxy_save, 10.0),
    ("4_numbers", "④ 数字が壊れる", clip_numbers, 7.0),
    ("5_loop_zoom", "⑤ 一気に引く（ループ）", clip_loop, 15.0),
    ("6_reveal_mid", "", clip_reveal_mid, 10.0),
    ("7_reveal_end", "", clip_reveal_end, 10.0),
]


def writer(path):
    w = imageio_ffmpeg.write_frames(path, (W, H), fps=FPS, codec="libx264", pix_fmt_out="yuv420p", quality=8)
    w.send(None)
    return w


def main():
    allw = writer(os.path.join(OUT, "all_clips_9x16.mp4"))
    for key, name, fn, dur in CLIPS:
        one = writer(os.path.join(OUT, f"clip{key}.mp4"))
        n = int(dur * FPS)
        for i in range(n):
            t = i / max(1, n - 1)
            img = fn(t)
            if name:
                tag(img, name)
            b = img.convert("RGB").tobytes()
            one.send(b)
            allw.send(b)
            if i == int(n * 0.92):
                img.convert("RGB").save(os.path.join(OUT, f"key{key}.png"))
            if i == 0:
                img.convert("RGB").save(os.path.join(OUT, f"first_frame{key}.png"))
        one.close()
        print("done", key)
    allw.close()


if __name__ == "__main__":
    main()
