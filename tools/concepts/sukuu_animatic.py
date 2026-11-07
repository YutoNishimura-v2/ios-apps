"""『すくう』社内用の絵コンテ動画（縦 9:16）とキーフレーム画像を描く。

使い方: python -I tools/concepts/sukuu_animatic.py <出力フォルダ>
外部の生成 AI は使わず、図形だけで描く（費用ゼロ・開示不要）。
"""
import math
import os
import random
import sys

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 720, 1280
FPS = 30
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

FONT_B = "C:/Windows/Fonts/YuGothB.ttc"
FONT_R = "C:/Windows/Fonts/YuGothM.ttc"
_font_cache = {}


def font(size, bold=True):
    key = (size, bold)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(FONT_B if bold else FONT_R, size)
    return _font_cache[key]


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


def seg(t, a, b):
    """t を区間 [a, b] の中での 0..1 に直す。"""
    return clamp((t - a) / (b - a))


def text_c(d, xy, s, size, fill=(255, 255, 255), bold=True, stroke=6):
    f = font(size, bold)
    d.text(xy, s, font=f, fill=fill, anchor="mm", stroke_width=stroke, stroke_fill=(0, 0, 0))


# ---------- 素材（最初に一度だけ作る） ----------
rng = random.Random(7)
STARS = [(rng.random(), rng.random(), rng.random()) for _ in range(500)]


def starfield(img, alpha=1.0, drift=0.0):
    d = ImageDraw.Draw(img)
    for x, y, b in STARS:
        px = int(((x + drift * (0.3 + b)) % 1) * W)
        py = int(y * H)
        c = int(255 * b * alpha)
        if b > 0.93:
            d.ellipse((px - 2, py - 2, px + 2, py + 2), fill=(c, c, c))
        else:
            d.point((px, py), fill=(c, c, c))


def blob(cx, cy, r, n, rr):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = r * (0.6 + 0.5 * rr.random())
        pts.append((cx + math.cos(a) * k, cy + math.sin(a) * k))
    return pts


def make_planet(size=600, seed=1, ocean=(30, 90, 190), land=(70, 160, 80)):
    rr = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, size - 1, size - 1), fill=ocean + (255,))
    for _ in range(7):
        cx, cy = rr.uniform(0.15, 0.85) * size, rr.uniform(0.15, 0.85) * size
        d.polygon(blob(cx, cy, size * rr.uniform(0.08, 0.18), 14, rr), fill=land + (255,))
    clouds = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cd = ImageDraw.Draw(clouds)
    for _ in range(14):
        cx, cy = rr.uniform(0, 1) * size, rr.uniform(0, 1) * size
        cd.ellipse((cx - size * 0.12, cy - size * 0.03, cx + size * 0.12, cy + size * 0.03), fill=(255, 255, 255, 110))
    clouds = clouds.filter(ImageFilter.GaussianBlur(size * 0.01))
    img.alpha_composite(clouds)
    # 影
    shade = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for i in range(40):
        k = i / 40
        sd.ellipse((size * (0.25 + k * 0.5), size * (0.25 + k * 0.5), size * 1.4, size * 1.4), fill=(0, 0, 20, 5))
    img.alpha_composite(shade)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    img.putalpha(mask)
    glow = Image.new("RGBA", (int(size * 1.3), int(size * 1.3)), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    o = int(size * 0.15)
    gd.ellipse((o - 8, o - 8, o + size + 8, o + size + 8), fill=(120, 180, 255, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.04))
    glow.alpha_composite(img, (o, o))
    return glow


def make_galaxy(size=700, seed=3):
    rr = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size / 2
    for arm in range(3):
        for i in range(900):
            t = i / 900
            a = arm * 2 * math.pi / 3 + t * 5.0
            r = t * c * 0.95
            x = c + math.cos(a) * r + rr.gauss(0, 10 + 18 * t)
            y = c + math.sin(a) * r * 0.55 + rr.gauss(0, 6 + 10 * t)
            col = (255, int(lerp(220, 120, t)), int(lerp(200, 90, t)), 220)
            d.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill=col)
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    core = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(core).ellipse((c - 60, c - 35, c + 60, c + 35), fill=(255, 240, 210, 255))
    core = core.filter(ImageFilter.GaussianBlur(25))
    img.alpha_composite(core)
    return img


def make_continent(w=520, h=260, seed=5):
    rr = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = []
    n = 40
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.75 + 0.25 * math.sin(a * 3 + 1) + 0.12 * rr.random()
        pts.append((w / 2 + math.cos(a) * w * 0.45 * k, h / 2 + math.sin(a) * h * 0.4 * k))
    d.polygon(pts, fill=(70, 150, 70, 255), outline=(200, 190, 140, 255))
    for _ in range(9):
        cx, cy = rr.uniform(0.3, 0.7) * w, rr.uniform(0.3, 0.6) * h
        d.polygon(blob(cx, cy, 22, 8, rr), fill=(110, 110, 100, 255))
    for _ in range(60):
        x, y = rr.uniform(0.2, 0.8) * w, rr.uniform(0.3, 0.7) * h
        d.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill=(255, 230, 140, 255))
    return img


EARTH = make_planet(600, seed=11)
GALAXY = make_galaxy(700)
CONT = make_continent()


def paste_center(img, src, cx, cy, scale, alpha=1.0):
    if scale <= 0.002:
        return
    w, h = max(1, int(src.width * scale)), max(1, int(src.height * scale))
    if w > 6000 or h > 6000:
        return
    s = src.resize((w, h), Image.LANCZOS)
    if alpha < 1.0:
        a = s.getchannel("A").point(lambda v: int(v * alpha))
        s.putalpha(a)
    img.alpha_composite(s, (int(cx - w / 2), int(cy - h / 2)))


# ---------- 部品 ----------
def poi(img, cx, cy, r, tear=0.0, paper_alpha=150, handle=True, flash=0.0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if handle:
        d.rounded_rectangle((cx - r * 0.12, cy + r * 0.9, cx + r * 0.12, cy + r * 2.4), r * 0.08, fill=(220, 50, 70, 255))
    paper = (255, int(255 - 120 * flash), int(255 - 120 * flash), paper_alpha)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=paper)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(225, 45, 70, 255), width=max(3, int(r * 0.13)))
    if tear > 0:
        rr = random.Random(9)
        for k in range(7):
            a = rr.uniform(0, 2 * math.pi)
            x, y = cx, cy
            length = r * 0.95 * tear * rr.uniform(0.6, 1.0)
            steps = 6
            for _ in range(steps):
                a += rr.uniform(-0.6, 0.6)
                nx, ny = x + math.cos(a) * length / steps, y + math.sin(a) * length / steps
                d.line((x, y, nx, ny), fill=(60, 30, 30, 230), width=max(2, int(r * 0.015)))
                x, y = nx, ny
    img.alpha_composite(layer)


def goldfish_pts(x, y, s, ang):
    def rot(px, py):
        c, sn = math.cos(ang), math.sin(ang)
        return (x + px * c - py * sn, y + px * sn + py * c)

    body = [rot(math.cos(2 * math.pi * i / 28) * s, math.sin(2 * math.pi * i / 28) * s * 0.58) for i in range(28)]
    tail = [rot(-s * 0.85, 0), rot(-s * 1.7, -s * 0.75), rot(-s * 1.35, 0), rot(-s * 1.7, s * 0.75)]
    eye = rot(s * 0.55, -s * 0.15)
    return body, tail, eye


def goldfish(img, x, y, s, ang=0.0, color=(240, 80, 40), texture=None, tex_mix=0.0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    body, tail, eye = goldfish_pts(x, y, s, ang)
    d.polygon(tail, fill=(255, 130, 70, 235))
    d.polygon(body, fill=color + (255,))
    img.alpha_composite(layer)
    if texture is not None and tex_mix > 0:
        tex = texture.resize((int(s * 2.4), int(s * 2.4)), Image.LANCZOS)
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).polygon(body, fill=int(255 * tex_mix))
        full = Image.new("RGBA", img.size, (0, 0, 0, 0))
        full.alpha_composite(tex, (int(x - tex.width / 2), int(y - tex.height / 2)))
        full.putalpha(Image.composite(full.getchannel("A"), Image.new("L", img.size, 0), mask).point(lambda v: v))
        img.alpha_composite(full)
    d2 = ImageDraw.Draw(img)
    r = max(2, s * 0.09)
    d2.ellipse((eye[0] - r, eye[1] - r, eye[0] + r, eye[1] + r), fill=(15, 15, 15))


def lanterns(img, t, alpha=1.0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(7):
        x = 60 + i * 105 + 10 * math.sin(t * 2 + i)
        y = 120 + 25 * (i % 2)
        d.ellipse((x - 38, y - 48, x + 38, y + 48), fill=(255, 150, 60, int(200 * alpha)))
    layer = layer.filter(ImageFilter.GaussianBlur(14))
    img.alpha_composite(layer)


def festival_tub(img, t, fish_n=9, cy=760):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((60, cy - 300, 660, cy + 300), 40, fill=(40, 120, 200))
    d.rounded_rectangle((90, cy - 270, 630, cy + 270), 30, fill=(60, 150, 220))
    for i in range(5):
        k = (t * 0.3 + i / 5) % 1
        d.ellipse((360 - 260 * k, cy - 250 * k, 360 + 260 * k, cy + 250 * k), outline=(120, 190, 240))
    for i in range(fish_n):
        a = t * (0.6 + 0.1 * i) + i * 0.7
        x = 360 + math.cos(a) * (120 + 15 * i) * 0.9
        y = cy + math.sin(a * 1.3) * (90 + 12 * i)
        goldfish(img, x, y, 26 + (i % 3) * 4, ang=a + math.pi / 2)


def shake(img, amount, t):
    if amount <= 0:
        return img
    dx = int(math.sin(t * 91) * amount)
    dy = int(math.cos(t * 77) * amount)
    out = Image.new("RGBA", img.size, (0, 0, 0, 255))
    out.alpha_composite(img, (dx, dy))
    return out


def label(img, s):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((20, 20, 20 + 22 * len(s) + 40, 74), 14, fill=(0, 0, 0, 170))
    d.text((40, 47), s, font=font(26), fill=(255, 255, 255), anchor="lm")


# ---------- 場面 ----------
def scene_title(t):
    img = Image.new("RGBA", (W, H), (10, 10, 25, 255))
    starfield(img, 0.6)
    d = ImageDraw.Draw(img)
    text_c(d, (W / 2, 520), "『すくう』", 92)
    text_c(d, (W / 2, 650), "切り抜かれる瞬間 5 つ", 44)
    text_c(d, (W / 2, 740), "社内用の絵コンテ（仮の絵・図形で作成）", 28, bold=False, stroke=4)
    return img


def scene_before_after(t):
    """① 最初と今：屋台の水槽 → 一気に引くと、銀河を掬うポイの中の点だった。"""
    if t < 0.38:
        img = Image.new("RGBA", (W, H), (25, 15, 30, 255))
        lanterns(img, t * 10)
        festival_tub(img, t * 10)
        poi(img, 430, 700, 110)
        goldfish(img, 430, 700, 28, ang=-0.4)
        d = ImageDraw.Draw(img)
        text_c(d, (W / 2, 1150), "最初の夜", 60)
        return img
    k = ease(seg(t, 0.38, 0.85))
    img = Image.new("RGBA", (W, H), (5, 5, 20, 255))
    starfield(img, 1.0, drift=k * 0.05)
    big = lerp(9.0, 1.0, k)
    paste_center(img, GALAXY, W / 2, 640, 0.75 * big)
    poi(img, W / 2, 640, 300 * big, paper_alpha=60, handle=True)
    d = ImageDraw.Draw(img)
    # 最初の水槽はこの点
    px, py = W / 2 + 40 * big, 640 - 30 * big
    d.ellipse((px - 4, py - 4, px + 4, py + 4), fill=(255, 210, 120))
    if k > 0.6:
        a = seg(t, 0.62, 0.75)
        d.line((px + 8, py - 8, px + 120, py - 120), fill=(255, 255, 255), width=3)
        text_c(d, (px + 150, py - 150), "最初の水槽", 30)
    if t > 0.8:
        text_c(d, (W / 2, 1150), "いま掬ってるもの", 60)
    return img


def scene_continent(t):
    """② 大陸を初めて掬う：海からポイが大陸ごと持ち上がる（スロー → 揺れ → 数字）。"""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    for y in range(0, 700, 4):
        c = int(lerp(10, 60, y / 700))
        d.rectangle((0, y, W, y + 4), fill=(c, c // 2, c + 30))
    lanterns(img, t * 5, 0.8)
    lift = ease(seg(t, 0.15, 0.7))
    sea_y = 760
    cy = lerp(sea_y + 200, 520, lift)
    poi(img, W / 2, cy, 330, paper_alpha=170)
    paste_center(img, CONT, W / 2, cy - 10, 1.0)
    # 海（ポイより手前に重ねて、持ち上がる感じを出す）
    sea = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sea)
    sd.rectangle((0, sea_y, W, H), fill=(15, 45, 110, 255))
    for i in range(8):
        y = sea_y + 20 + i * 60
        sd.line((0, y, W, y + 10 * math.sin(t * 6 + i)), fill=(40, 90, 170, 255), width=3)
    img.alpha_composite(sea)
    if lift > 0.2:
        rr = random.Random(int(t * 200))
        for _ in range(int(60 * lift)):
            x = W / 2 + rr.uniform(-320, 320)
            y0 = cy + rr.uniform(0, 120)
            d.line((x, y0, x, y0 + rr.uniform(40, 160)), fill=(160, 200, 255), width=2)
    img = shake(img, 10 * (1 - abs(lift - 0.6) * 2) if 0.3 < lift < 0.95 else 0, t)
    d = ImageDraw.Draw(img)
    if t > 0.72:
        s = 1 + 0.15 * math.sin(seg(t, 0.72, 0.8) * math.pi)
        text_c(d, (W / 2, 1050), "大陸、ゲット", int(84 * s), fill=(255, 230, 90))
        text_c(d, (W / 2, 1160), "+ 1.2e9 匹分", 50)
    return img


def scene_near_tear(t):
    """③ 破れる寸前：地球を乗せたポイにひびが走る → 1% で耐える。"""
    img = Image.new("RGBA", (W, H), (5, 5, 18, 255))
    starfield(img, 0.9, drift=t * 0.02)
    tear = ease(seg(t, 0.05, 0.62)) * 0.95
    beat = (math.sin(t * 40) > 0.6) and t < 0.65
    poi(img, W / 2, 640, 300, tear=tear, paper_alpha=170, flash=0.6 if beat else 0.0)
    paste_center(img, EARTH, W / 2, 640, 0.62)
    d = ImageDraw.Draw(img)
    dur = max(1, int(lerp(100, 1, ease(seg(t, 0.05, 0.62)))))
    d.rounded_rectangle((80, 180, 640, 220), 10, outline=(255, 255, 255), width=3)
    d.rounded_rectangle((84, 184, 84 + int(552 * dur / 100), 216), 8, fill=(255, 70, 70) if dur < 20 else (120, 220, 120))
    text_c(d, (W / 2, 260), f"紙の強さ {dur}%", 40)
    img = shake(img, 8 * tear if t < 0.65 else 0, t)
    d = ImageDraw.Draw(img)
    if t > 0.68:
        s = 1 + 0.2 * math.sin(seg(t, 0.68, 0.76) * math.pi)
        text_c(d, (W / 2, 1100), "セーフ！！", int(110 * s), fill=(120, 255, 160))
    return img


def fmt_big(v):
    if v < 1e6:
        return f"{int(v):,}"
    e = int(math.floor(math.log10(v)))
    return f"{v / 10 ** e:.2f}e{e}"


def scene_numbers(t):
    """④ 数字が壊れる：掬った数が 1 から 1e64 まで一気に跳ねる。"""
    img = Image.new("RGBA", (W, H), (8, 6, 20, 255))
    starfield(img, 1.0, drift=t * 0.2)
    k = ease(seg(t, 0.05, 0.8))
    val = 10 ** (k * 64)
    rr = random.Random(int(t * 300))
    d = ImageDraw.Draw(img)
    for _ in range(int(10 + 80 * k)):
        x, y = rr.uniform(0, W), rr.uniform(300, 1200)
        if rr.random() < 0.5:
            goldfish(img, x, y, rr.uniform(8, 18), ang=rr.uniform(0, 6.28))
        else:
            rpx = rr.uniform(6, 16)
            d.ellipse((x - rpx, y - rpx, x + rpx, y + rpx), fill=(80, 150, 255))
    poi(img, W / 2, 700, 200, paper_alpha=120)
    img = shake(img, 3 + 14 * k, t)
    d = ImageDraw.Draw(img)
    text_c(d, (W / 2, 240), "掬った数", 44)
    size = int(lerp(90, 120, k))
    text_c(d, (W / 2, 360), fmt_big(val), size, fill=(255, 230, 90))
    if t > 0.85:
        text_c(d, (W / 2, 1150), "桁が足りない", 60)
    return img


def scene_reveal(t):
    """⑤ 種明かし：ポイの中の金魚に寄る → 体の模様が地球の大陸になる。"""
    img = Image.new("RGBA", (W, H), (25, 15, 30, 255))
    lanterns(img, t * 4, 0.7)
    z = lerp(1.0, 3.2, ease(seg(t, 0.1, 0.55)))
    poi(img, W / 2, 680, 170 * z, paper_alpha=150, handle=False)
    mix = ease(seg(t, 0.45, 0.75))
    goldfish(img, W / 2 - 15 * z, 680, 60 * z, ang=-0.15, texture=EARTH, tex_mix=mix)
    d = ImageDraw.Draw(img)
    if 0.3 < t < 0.6:
        text_c(d, (W / 2, 1120), "……ん？", 70)
    if t >= 0.6:
        text_c(d, (W / 2, 1070), "最初から", 64)
        text_c(d, (W / 2, 1160), "惑星を掬ってた", 70, fill=(255, 220, 120))
    return img


def scene_end(t):
    img = Image.new("RGBA", (W, H), (10, 10, 25, 255))
    starfield(img, 0.6)
    d = ImageDraw.Draw(img)
    text_c(d, (W / 2, 560), "全部、ひとつのポイで。", 56)
    text_c(d, (W / 2, 700), "（社内用・外には出さない）", 30, bold=False, stroke=4)
    return img


SCENES = [
    ("", scene_title, 1.6),
    ("① 最初と今（引きのズーム）", scene_before_after, 6.0),
    ("② 大陸を初めて掬う", scene_continent, 5.5),
    ("③ 破れる寸前で耐える", scene_near_tear, 5.0),
    ("④ 数字が壊れる", scene_numbers, 4.5),
    ("⑤ 種明かし（金魚＝惑星）", scene_reveal, 6.0),
    ("", scene_end, 1.6),
]


def render():
    path = os.path.join(OUT, "sukuu_clips_9x16.mp4")
    writer = imageio_ffmpeg.write_frames(path, (W, H), fps=FPS, codec="libx264", pix_fmt_out="yuv420p", quality=8)
    writer.send(None)
    keyframes = {}
    for name, fn, dur in SCENES:
        n = int(dur * FPS)
        for i in range(n):
            t = i / max(1, n - 1)
            img = fn(t)
            if name:
                label(img, name)
            writer.send(img.convert("RGB").tobytes())
            if name and abs(t - 0.9) < 0.5 / n:
                keyframes[name] = img.convert("RGB")
    writer.close()
    for i, (name, im) in enumerate(keyframes.items(), 1):
        im.save(os.path.join(OUT, f"key_{i}.png"))
    print("wrote", path, len(keyframes), "keyframes")


if __name__ == "__main__":
    render()
