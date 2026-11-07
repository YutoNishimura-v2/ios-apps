"""『すくう』社内用 15 秒縦コンセプト動画 v3（画像素材は使わず、すべてコードで描く）。

たらいの金魚 → 池の鯉 → 海のクジラ → 大陸 → 地球 → 銀河 → 引くと最初のたらい（金魚がぜんぶ惑星）。

使い方:
  python -I tools/concepts/sukuu_story15_v3.py preview <tag>   # 間引いたフレームを PNG に
  python -I tools/concepts/sukuu_story15_v3.py render          # 450 フレーム → mp4 ＋キーフレーム
  python -I tools/concepts/sukuu_story15_v3.py compare <tag>   # 参照｜自作 の比較 PNG
"""
import math
import os
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 720, 1280, 30
NF = 15 * FPS
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "docs", "concepts", "sukuu-v3-video")
NOTO = "C:/Windows/Fonts/NotoSansJP-VF.ttf"
CX, CY = 360, 660
DIAG = math.hypot(W, H) / 2 + 6
TAU2 = math.pi * 2


# ---------------------------------------------------------------- 小道具
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def back(x):
    x = clamp(x)
    c = 2.4
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def lerp(a, b, t):
    return a + (b - a) * t


def angdiff(a, b):
    return (a - b + math.pi) % TAU2 - math.pi


_FC = {}


def font(size, wt=900):
    size = max(8, int(round(size)))
    key = (size, wt)
    if key not in _FC:
        f = ImageFont.truetype(NOTO, size)
        f.set_variation_by_axes([wt])
        _FC[key] = f
    return _FC[key]


def vnoise(h, w, cell, seed, octaves=4, pers=0.5):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for _ in range(octaves):
        gh, gw = h // cell + 3, w // cell + 3
        g = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8))
        up = g.resize((gw * cell, gh * cell), Image.BICUBIC).crop((cell, cell, cell + w, cell + h))
        acc += np.asarray(up, np.float32) / 255 * amp
        tot += amp
        amp *= pers
        cell = max(2, cell // 2)
    acc /= tot
    return (acc - acc.min()) / (acc.max() - acc.min() + 1e-6)


def vgrad(top, bot, h=H, w=W, gamma=1.0):
    t = (np.linspace(0, 1, h, dtype=np.float32) ** gamma)[:, None, None]
    col = np.array(top, np.float32) * (1 - t) + np.array(bot, np.float32) * t
    return np.broadcast_to(col, (h, w, 3)).copy()


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
_rr = np.sqrt(((XX - W / 2) / (W * 0.62)) ** 2 + ((YY - H / 2) / (H * 0.6)) ** 2)
VIG = np.clip(1 - 1.35 * np.clip(_rr - 0.42, 0, None) ** 1.6, 0.18, 1.0)[..., None].astype(np.float32)


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def add_sprite(arr, spr, cx, cy, k=1.0):
    """加算合成（spr は float の HxWx3）。"""
    sh, sw = spr.shape[:2]
    x0, y0 = int(cx - sw / 2), int(cy - sh / 2)
    ax0, ay0 = max(0, x0), max(0, y0)
    ax1, ay1 = min(W, x0 + sw), min(H, y0 + sh)
    if ax1 <= ax0 or ay1 <= ay0:
        return
    s = spr[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0] * k
    lum = np.clip(s.max(axis=2, keepdims=True) / 120, 0, 1)
    arr[ay0:ay1, ax0:ax1] = arr[ay0:ay1, ax0:ax1] * (1 - 0.6 * lum) + s  # 下を少し沈めてから足す（白飛び防止）


def gcirc(g, x, y, r, col):
    g.ellipse(((x - r) / 2, (y - r) / 2, (x + r) / 2, (y + r) / 2), fill=col)


def scale_col(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


# ---------------------------------------------------------------- 球（惑星）
def equirect(kind, tw=512, th=256):
    lat = np.repeat(np.linspace(90, -90, th, dtype=np.float32)[:, None], tw, 1) * math.pi / 180
    lon = np.repeat(np.linspace(-math.pi, math.pi, tw, dtype=np.float32)[None, :], th, 0)
    seed = sum(ord(ch) * (i + 1) for i, ch in enumerate(kind))  # hash() はプロセスごとに変わるので使わない
    n = vnoise(th, tw, 48, seed, 5)
    n2 = vnoise(th, tw, 24, seed + 7, 4)

    def mix(a, b, t):
        t = np.clip(t, 0, 1)[..., None]
        return np.array(a, np.float32) * (1 - t) + np.array(b, np.float32) * t

    if kind == "earth":
        land = n > 0.5
        col = mix((10, 40, 120), (30, 100, 180), n / 0.5)
        h = (n - 0.5) / 0.5
        lc = mix((55, 145, 60), (160, 130, 80), h * 0.9)
        col = np.where(land[..., None], lc, col)
        ice = np.abs(lat) > 1.15
        col = np.where(ice[..., None], np.array((235, 240, 250), np.float32), col)
        cl = np.clip((n2 - 0.6) * 3.0, 0, 0.85)[..., None]
        col = col * (1 - cl) + 250 * cl
    elif kind == "jupiter":
        b = np.sin(lat * 15 + (n - 0.5) * 3.5)
        col = mix((240, 220, 185), (180, 120, 75), (b + 1) / 2)
        col = mix(col, (130, 80, 55), np.clip(np.sin(lat * 7 + 1) - 0.7, 0, 1) * 1.5)
        d = ((lat + 0.38) / 0.11) ** 2 + ((lon - 0.6) / 0.3) ** 2
        col = mix(col, (205, 85, 55), np.clip(1.6 - d, 0, 1))
    elif kind == "mars":
        col = mix((210, 100, 50), (160, 70, 40), n)
        col = mix(col, (95, 45, 35), np.clip((n2 - 0.55) * 3, 0, 1))
        col = np.where((np.abs(lat) > 1.25)[..., None], np.array((240, 235, 230), np.float32), col)
    elif kind == "neptune":
        col = mix((35, 70, 190), (80, 140, 235), 0.5 + 0.5 * np.sin(lat * 9 + n * 3))
        d = ((lat + 0.3) / 0.1) ** 2 + ((lon + 0.8) / 0.22) ** 2
        col = mix(col, (20, 30, 110), np.clip(1.5 - d, 0, 1))
    elif kind == "venus":
        col = mix((240, 215, 155), (205, 160, 95), 0.5 + 0.5 * np.sin(lat * 5 + n * 7 + lon))
    elif kind == "saturn":
        col = mix((235, 210, 160), (195, 160, 105), 0.5 + 0.5 * np.sin(lat * 18 + n * 1.5))
    else:  # moon
        col = mix((110, 110, 115), (205, 205, 205), n)
        col = mix(col, (80, 80, 85), np.clip((n2 - 0.62) * 4, 0, 1))
    return col.astype(np.float32)


def sphere(tex, D, rot, light=(-0.55, -0.6, 0.58), rim=(120, 190, 255), rim_k=0.0, amb=0.16):
    D = max(4, int(D))
    ys, xs = np.mgrid[0:D, 0:D].astype(np.float32)
    nx = (xs + 0.5 - D / 2) / (D / 2)
    ny = (ys + 0.5 - D / 2) / (D / 2)
    r2 = nx * nx + ny * ny
    nz = np.sqrt(np.clip(1 - r2, 0, 1))
    lat = np.arcsin(np.clip(-ny, -1, 1))
    lon = np.arctan2(nx, nz + 1e-6) + rot
    th, tw = tex.shape[:2]
    u = ((lon / TAU2) % 1 * tw).astype(np.int32) % tw
    v = np.clip(((0.5 - lat / math.pi) * th).astype(np.int32), 0, th - 1)
    col = tex[v, u]
    L = np.array(light, np.float32)
    L /= np.linalg.norm(L)
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    col = col * (amb + (1 - amb) * lam[..., None] ** 0.85)
    spec = np.clip(lam, 0, 1) ** 30 * 90
    col = col + spec[..., None]
    rimv = (1 - nz) ** 2.2
    col = col + np.array(rim, np.float32) * (rimv * rim_k * (0.25 + 0.75 * lam))[..., None]
    a = np.clip((1 - np.sqrt(r2)) * D / 2, 0, 1) * 255
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), a]).astype(np.uint8), "RGBA")


TEX = {}


def tex(kind):
    if kind not in TEX:
        TEX[kind] = equirect(kind)
    return TEX[kind]


# ---------------------------------------------------------------- 素材（起動時に一度だけ作る）
def make_paper(S=420):
    n = vnoise(S, S, 5, 5, 3)
    rgb = np.dstack([252 - 18 * n, 250 - 16 * n, 246 - 22 * n])
    rr = np.sqrt(((np.mgrid[0:S, 0:S][1] + 0.5 - S / 2) / (S / 2)) ** 2 + ((np.mgrid[0:S, 0:S][0] + 0.5 - S / 2) / (S / 2)) ** 2)
    circ = np.clip((1 - rr) * S / 2, 0, 1)
    a = (0.78 + 0.22 * n) * circ * 255
    img = Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), "RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    rng = np.random.default_rng(9)
    for _ in range(260):
        x, y = rng.uniform(0, S, 2)
        if math.hypot(x - S / 2, y - S / 2) > S / 2 - 6:
            continue
        ang = rng.uniform(0, TAU2)
        ln = rng.uniform(6, 26)
        d.line((x, y, x + ln * math.cos(ang), y + ln * math.sin(ang)), fill=(255, 255, 255, 120), width=1)
    return img


def make_land(D, seed, thr=0.5, detail=5):
    n = vnoise(D, D, max(4, D // 5), seed, detail)
    ys, xs = np.mgrid[0:D, 0:D].astype(np.float32)
    rr = np.sqrt(((xs - D / 2) / (D / 2)) ** 2 + ((ys - D / 2) / (D / 2)) ** 2)
    v = n * 0.9 - rr * 0.85 + 0.45
    hgt = np.clip((v - thr) / max(1e-3, v.max() - thr), 0, 1)
    gy, gx = np.gradient(hgt)
    shade = np.clip(1.0 + (gx + gy) * D * 0.9, 0.55, 1.45)

    def mix(a, b, t):
        t = np.clip(t, 0, 1)[..., None]
        return np.array(a, np.float32) * (1 - t) + np.array(b, np.float32) * t

    col = mix((225, 205, 150), (80, 160, 65), hgt / 0.08)
    col = np.where((hgt > 0.08)[..., None], mix((80, 160, 65), (35, 105, 45), (hgt - 0.08) / 0.35), col)
    col = np.where((hgt > 0.43)[..., None], mix((120, 110, 70), (160, 140, 105), (hgt - 0.43) / 0.35), col)
    col = np.where((hgt > 0.8)[..., None], np.array((245, 245, 250), np.float32), col)
    col = col * shade[..., None]
    land = v > thr
    a = np.where(land, 255.0, 0.0)
    shallow = (v > thr - 0.07) & ~land
    sh_t = np.clip((v - (thr - 0.07)) / 0.07, 0, 1)
    col = np.where(shallow[..., None], mix((40, 170, 200), (150, 235, 230), sh_t), col)
    a = np.where(shallow, 170 * sh_t, a)
    surf = (v > thr - 0.012) & ~land
    col = np.where(surf[..., None], np.array((250, 252, 255), np.float32), col)
    a = np.where(surf, 230.0, a)
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), a]).astype(np.uint8), "RGBA")


def make_cloud(S, seed):
    n = vnoise(S, S, max(4, S // 4), seed, 5)
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    rr = np.sqrt(((xs - S / 2) / (S / 2)) ** 2 + ((ys - S / 2) / (S / 2)) ** 2)
    v = n * (1 - np.clip(rr, 0, 1) ** 2)
    a = np.clip((v - 0.3) * 3.2, 0, 1) * 235
    c = 215 + 40 * n
    return Image.fromarray(np.dstack([c, c, c + 5, a]).clip(0, 255).astype(np.uint8), "RGBA")


def make_galaxy_pts(seed=3, n=22000):
    rng = np.random.default_rng(seed)
    m = int(n * 0.78)
    arm = rng.integers(0, 2, m)
    r = np.clip(rng.exponential(0.38, m), 0.02, 1.0)
    th = arm * math.pi + r * 7.5 + rng.normal(0, 0.17, m) * (1.1 - r * 0.5)
    rc = np.abs(rng.normal(0, 0.09, n - m))
    thc = rng.uniform(0, TAU2, n - m)
    r = np.concatenate([r, rc])
    th = np.concatenate([th, thc])
    col = np.zeros((n, 3), np.float32)
    tcol = np.clip(r * 1.6, 0, 1)[:, None]
    col[:] = np.array((255, 220, 160)) * (1 - tcol) + np.array((120, 160, 255)) * tcol
    pink = rng.random(n) < 0.07
    col[pink] = (255, 110, 190)
    bri = rng.uniform(0.25, 1.0, n) * (1.0 + 2.0 * (r < 0.12))
    return r.astype(np.float32), th.astype(np.float32), col * bri[:, None]


GAL_R, GAL_TH, GAL_COL = make_galaxy_pts()


def galaxy_sprite(D, rot, tilt=0.5, tw=-0.35, gain=1.0):
    D = int(D)
    th = GAL_TH + rot
    x = GAL_R * np.cos(th)
    y = GAL_R * np.sin(th) * tilt
    c, s = math.cos(tw), math.sin(tw)
    xr, yr = x * c - y * s, x * s + y * c
    ix = np.clip((xr * 0.48 * D + D / 2).astype(np.int32), 0, D - 1)
    iy = np.clip((yr * 0.48 * D + D / 2).astype(np.int32), 0, D - 1)
    acc = np.zeros((D, D, 3), np.float32)
    np.add.at(acc, (iy, ix), GAL_COL * (0.55 * 400.0 / D) ** 0.5)
    sharp = to_img(acc * 0.9)
    soft = np.asarray(sharp.filter(ImageFilter.GaussianBlur(max(1.5, D / 40))), np.float32)
    ys, xs = np.mgrid[0:D, 0:D].astype(np.float32)
    core = np.exp(-(((xs - D / 2) / (D * 0.09)) ** 2 + ((ys - D / 2) / (D * 0.06)) ** 2))
    out = np.asarray(sharp, np.float32) * 0.9 + soft * 1.8 + core[..., None] * np.array((255, 225, 180), np.float32) * 0.7
    out = 235 * (1 - np.exp(-out / 170))  # 白飛びしないように色を残して圧縮
    return out * gain


def make_minigal(D, seed):
    arr = galaxy_sprite(D, seed * 1.3, tilt=0.35 + 0.15 * (seed % 3), tw=seed * 0.9, gain=0.9)
    a = np.clip(arr.max(axis=2) * 1.2, 0, 255)
    return Image.fromarray(np.dstack([np.clip(arr, 0, 255), a]).astype(np.uint8), "RGBA")


PAPER = make_paper()
CONT = make_land(300, 42, thr=0.5, detail=6)
ISLANDS = [make_land(72, 100 + i, thr=0.52, detail=4) for i in range(6)]
CLOUDS = [make_cloud(220, 200 + i) for i in range(5)]
MINIGALS = [make_minigal(72, i + 1) for i in range(5)]


# ---------------------------------------------------------------- 背景（段階ごと、遅延生成）
def stars_into(arr, n, seed, ymax=H, big=0.03):
    rng = np.random.default_rng(seed)
    img = to_img(arr)
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, ymax)
        b = rng.uniform(0.3, 1.0) ** 2
        c = [(255, 255, 255), (200, 220, 255), (255, 230, 200), (255, 200, 230)][rng.integers(0, 4)]
        r = 0.6 + 1.6 * b
        d.ellipse((x - r, y - r, x + r, y + r), fill=c + (int(80 + 175 * b),))
        if rng.random() < big:
            ln = 6 + 14 * b
            d.line((x - ln, y, x + ln, y), fill=c + (150,), width=1)
            d.line((x, y - ln, x, y + ln), fill=c + (150,), width=1)
    return np.asarray(img, np.float32).copy()


def bg_tub(night=False):
    if night:
        arr = vgrad((16, 48, 105), (5, 16, 48))
    else:
        arr = vgrad((30, 92, 158), (10, 40, 100))
    n = vnoise(H, W, 110, 1, 5)
    arr *= (0.8 + 0.4 * n)[..., None]
    img = to_img(arr)
    d = ImageDraw.Draw(img, "RGBA")
    rng = np.random.default_rng(4)
    mcols = [(255, 80, 80), (80, 200, 255), (120, 255, 140), (255, 220, 80), (210, 120, 255), (255, 160, 60)]
    for _ in range(60 if night else 48):
        x, y = rng.uniform(40, W - 40), rng.uniform(150, H - 30)
        r = rng.uniform(8, 15)
        c = mcols[rng.integers(0, len(mcols))]
        d.ellipse((x - r + 4, y - r + 6, x + r + 4, y + r + 6), fill=(0, 10, 30, 90))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(200, 230, 255, 110))
        d.ellipse((x - r * 0.55, y - r * 0.35, x + r * 0.45, y + r * 0.45), fill=c + (200,))
        d.ellipse((x - r * 0.55, y - r * 0.6, x - r * 0.1, y - r * 0.2), fill=(255, 255, 255, 220))
    # たらいの縁（左右）
    for side in (0, 1):
        x0 = 0 if side == 0 else W - 34
        for i in range(34):
            k = i / 33 if side == 0 else 1 - i / 33
            c = scale_col((95, 170, 225) if not night else (50, 95, 150), 0.7 + 0.5 * math.sin(k * math.pi))
            d.line((x0 + i, 0, x0 + i, H), fill=c + (255,))
        xi = 34 if side == 0 else W - 34
        for j in range(26):
            a = int(120 * (1 - j / 26) ** 2)
            xx = xi + j if side == 0 else xi - j
            d.line((xx, 0, xx, H), fill=(0, 15, 40, a))
        d.line((x0 + (8 if side == 0 else 24), 0, x0 + (8 if side == 0 else 24), H), fill=(230, 245, 255, 150), width=2)
    return np.asarray(img, np.float32).copy()


def bg_pond():
    arr = vgrad((22, 92, 82), (6, 38, 40))
    n = vnoise(H, W, 90, 2, 5)
    n2 = vnoise(H, W, 30, 3, 3)
    arr *= (0.75 + 0.45 * n)[..., None]
    arr += (np.clip(n2 - 0.6, 0, 1) * 60)[..., None] * np.array((0.6, 1.0, 0.4), np.float32)
    img = to_img(arr)
    d = ImageDraw.Draw(img, "RGBA")
    rng = np.random.default_rng(5)
    for _ in range(45):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        rx, ry = rng.uniform(14, 40), rng.uniform(10, 28)
        d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=(10, 30, 28, 110))
        d.ellipse((x - rx * 0.8, y - ry * 0.9, x + rx * 0.6, y + ry * 0.3), fill=(70, 100, 80, 70))
    return np.asarray(img, np.float32).copy()


def bg_sea():
    arr = vgrad((14, 80, 150), (2, 22, 70), gamma=0.8)
    n = vnoise(H, W, 140, 6, 5)
    arr *= (0.75 + 0.45 * n)[..., None]
    return arr


def bg_continent():
    arr = vgrad((18, 78, 150), (6, 36, 96))
    n = vnoise(H, W, 120, 7, 5)
    arr *= (0.8 + 0.35 * n)[..., None]
    # 地平線（上部に宇宙と朝焼け）
    hc_y, hr = 250.0 + 2560.0, 2560.0
    dist = np.sqrt((XX - 360) ** 2 + (YY - hc_y) ** 2) - hr
    space = dist > 0
    sp = stars_into(np.zeros((H, W, 3), np.float32) + np.array((4, 6, 22), np.float32), 300, 8, ymax=300)
    arr = np.where(space[..., None], sp, arr)
    band = np.exp(-np.abs(dist) / 26)[..., None]
    arr += band * np.array((255, 170, 90), np.float32) * 1.1
    haze = np.exp(-np.clip(-dist, 0, None) / 120)[..., None] * (~space)[..., None]
    arr += haze * np.array((90, 150, 230), np.float32) * 0.6
    sun = np.exp(-(((XX - 560) / 140) ** 2 + ((YY - 250) / 60) ** 2))[..., None]
    arr += sun * np.array((255, 200, 140), np.float32) * 1.2
    return arr


def bg_space(kind):
    if kind == "earth":
        arr = vgrad((10, 14, 40), (2, 4, 14))
        n = vnoise(H, W, 160, 9, 5)
        n2 = vnoise(H, W, 100, 10, 5)
        arr += (np.clip(n - 0.45, 0, 1) * 110)[..., None] * np.array((0.25, 0.45, 1.0), np.float32)
        arr += (np.clip(n2 - 0.6, 0, 1) * 120)[..., None] * np.array((0.7, 0.3, 0.9), np.float32)
        arr = stars_into(arr, 900, 11)
        sun = np.exp(-np.sqrt(((XX - 690) / 1) ** 2 + ((YY - 140) / 1) ** 2) / 110)[..., None]
        arr += sun * np.array((255, 215, 150), np.float32) * 1.4
        # 下に大きな月面のふち（奥行き）
        dist = np.sqrt((XX - 120) ** 2 + (YY - 1900) ** 2) - 760
        moon = dist < 0
        mt = vnoise(H, W, 50, 12, 5)
        mcol = (np.array((70, 70, 80), np.float32) + (mt * 90)[..., None])
        mcol *= np.clip(1.0 - (YY[..., None] - 1100) / 400, 0.2, 1.0)
        arr = np.where(moon[..., None], mcol, arr)
        arr += np.exp(-np.abs(dist) / 10)[..., None] * np.array((150, 190, 255), np.float32) * 0.6
        return arr
    arr = vgrad((32, 10, 55), (6, 2, 20))
    n = vnoise(H, W, 180, 13, 5)
    n2 = vnoise(H, W, 120, 14, 5)
    n3 = vnoise(H, W, 60, 15, 4)
    arr += (np.clip(n - 0.4, 0, 1) * 220)[..., None] * np.array((0.85, 0.2, 0.75), np.float32)
    arr += (np.clip(n2 - 0.55, 0, 1) * 260)[..., None] * np.array((1.0, 0.45, 0.15), np.float32)
    arr *= (0.55 + 0.6 * np.clip(n3 * 1.4 - 0.2, 0, 1))[..., None]
    arr = stars_into(arr, 1400, 16, big=0.04)
    return arr


_BG = {}


def bg(kind):
    if kind not in _BG:
        _BG[kind] = {"tub": lambda: bg_tub(False), "pond": bg_pond, "sea": bg_sea, "continent": bg_continent,
                     "earth": lambda: bg_space("earth"), "galaxy": lambda: bg_space("galaxy"),
                     "reveal": lambda: bg_tub(True)}[kind]()
    return _BG[kind]


CN1 = vnoise(H // 2 + 140, W // 2 + 140, 46, 21, 3)
CN2 = vnoise(H // 2 + 140, W // 2 + 140, 36, 22, 3)


def caustic(tau):
    o1x, o1y = int(70 + 60 * math.sin(tau * 0.9)), int(70 + 60 * math.cos(tau * 0.7))
    o2x, o2y = int(70 + 60 * math.cos(tau * 0.8 + 1)), int(70 + 60 * math.sin(tau * 1.1 + 2))
    a = CN1[o1y:o1y + H // 2, o1x:o1x + W // 2] + CN2[o2y:o2y + H // 2, o2x:o2x + W // 2]
    c = (1 - np.abs(np.sin(a * math.pi * 6.0 + tau * 2.0))) ** 16
    up = Image.fromarray((c * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    return np.asarray(up, np.float32) / 255


# ---------------------------------------------------------------- 段階の定義
STAGES = [
    dict(key="tub", S=0.0, D=2.0, P=0.0, L0=1.25, L1=1.45, F=1.75, R=150, water=True, cap=46, base=3,
         banner="金魚 46匹!", tag="金魚",
         items=[("gold", 120, (34, 62), "swim", (50, 130))]),
    dict(key="pond", S=2.0, D=1.9, P=0.4, L0=1.0, L1=1.2, F=1.5, R=160, water=True, cap=40, base=420,
         banner="ヌシ鯉!!", tag="鯉",
         items=[("koi", 30, (70, 115), "swim", (40, 90)), ("fry", 70, (18, 28), "swim", (60, 140))]),
    dict(key="sea", S=3.9, D=1.9, P=0.4, L0=1.0, L1=1.2, F=1.5, R=165, water=True, cap=150, base=3.6e4,
         banner="クジラ!!", tag="クジラ",
         items=[("sardine", 340, (14, 21), "orbit", (130, 220)), ("dolphin", 9, (70, 92), "swim", (120, 170))]),
    dict(key="continent", S=5.8, D=1.9, P=0.4, L0=1.0, L1=1.2, F=1.5, R=170, water=True, cap=40, base=5.2e7,
         banner="大陸!!", tag="大陸",
         items=[("island", 36, (24, 66), "drift", (6, 18)), ("ship", 40, (10, 14), "drift", (18, 34))]),
    dict(key="earth", S=7.7, D=1.9, P=0.4, L0=1.0, L1=1.2, F=1.5, R=165, water=False, cap=60, base=7.7e10,
         banner="地球!!", tag="地球",
         items=[("rock", 80, (10, 32), "drift", (10, 34)), ("sat", 18, (18, 28), "drift", (15, 35)),
                ("moon", 1, (70, 70), "drift", (4, 6))]),
    dict(key="galaxy", S=9.6, D=1.9, P=0.4, L0=1.0, L1=1.2, F=1.5, R=170, water=False, cap=70, base=9.1e13,
         banner="銀河!!", tag="銀河",
         items=[("cluster", 70, (14, 36), "drift", (8, 25)), ("minigal", 30, (28, 58), "drift", (6, 16))]),
    dict(key="reveal", S=11.5, D=3.5, P=0.9, L0=99, L1=99, F=99, R=105, water=True, cap=0, base=1,
         banner="", tag="最初のたらい", items=[]),
]
for _i, _s in enumerate(STAGES):
    _s["idx"] = _i
    _s["f0"] = int(round(_s["S"] * FPS))
    _s["nl"] = int(round(_s["D"] * FPS))
    _s["space"] = _s["key"] in ("earth", "galaxy")

SLOW = 0.3


def warp(st, u):
    L1, F = st["L1"], st["F"]
    if u < L1:
        return u
    if u < F:
        return L1 + SLOW * (u - L1)
    return L1 + SLOW * (F - L1) + (u - F)


def locate(t):
    for st in reversed(STAGES):
        if t >= st["S"] - 1e-9:
            return st, t - st["S"]
    return STAGES[0], t


def lift_of(st, tau):
    return ease((tau - st["L0"]) / 0.35)


def poi_state(st, tau):
    if st["key"] == "reveal":
        return 360.0, 330.0 + 6 * math.sin(tau * 1.5), st["R"], 0.0
    P, L0 = st["P"], st["L0"]
    w = 1.0 if P == 0 else ease((tau - P) / 0.25)
    w *= 1 - ease((tau - (L0 - 0.35)) / 0.35)
    ph = st["idx"] * 1.7
    x = CX + w * 185 * math.sin(2.5 * tau + ph)
    y = CY + w * 230 * math.sin(1.8 * tau + ph * 0.6 + 0.4)
    lf = lift_of(st, tau)
    return x, y - 26 * lf, st["R"] * (1 + 0.1 * lf), lf


# ---------------------------------------------------------------- シミュレーション（各プロセスで同じ結果）
def simulate(st):
    rng = np.random.default_rng(1000 + st["idx"])
    kinds, size, mode, spd = [], [], [], []
    for kind, cnt, (s0, s1), md, (v0, v1) in st["items"]:
        kinds += [kind] * cnt
        size += list(rng.uniform(s0, s1, cnt))
        mode += [md] * cnt
        spd += list(rng.uniform(v0, v1, cnt))
    n = len(kinds)
    st["n"] = n
    if n == 0:
        st.update(pos=np.zeros((st["nl"], 0, 2)), ang=np.zeros((st["nl"], 0)), ctau=np.zeros(0), events=[])
        return
    size = np.array(size, np.float32)
    spd = np.array(spd, np.float32)
    swim = np.array([m == "swim" for m in mode])
    orbit = np.array([m == "orbit" for m in mode])
    drift = np.array([m == "drift" for m in mode])
    pos = np.stack([rng.uniform(40, W - 40, n), rng.uniform(170, H - 40, n)], 1).astype(np.float32)
    if orbit.any():
        m = orbit.sum()
        a = rng.uniform(0, TAU2, m)
        r = rng.uniform(40, 320, m)
        pos[orbit] = np.stack([CX + r * np.cos(a), 760 + r * np.sin(a) * 1.2], 1)
    hd = rng.uniform(0, TAU2, n).astype(np.float32)
    turn = rng.uniform(0.6, 2.2, n) * rng.choice([-1, 1], n)
    fw = rng.uniform(0.8, 2.5, n)
    php = rng.uniform(0, TAU2, n)
    orad = rng.uniform(50, 330, n)
    dvel = np.stack([np.cos(hd), np.sin(hd)], 1) * spd[:, None]
    spin = rng.uniform(-0.8, 0.8, n)
    ctau = np.full(n, np.inf)
    cpos = np.zeros((n, 2), np.float32)
    offs = rng.uniform(0, 1, n) ** 0.5 * 0.62
    offa = rng.uniform(0, TAU2, n)
    var = rng.integers(0, 8, n)
    nl = st["nl"]
    rec_pos = np.zeros((nl, n, 2), np.float32)
    rec_ang = np.zeros((nl, n), np.float32)
    events = []
    eid = st["idx"] * 100000
    caught = 0
    pre = 26 if st["P"] == 0 else 0
    cs = st["P"]
    prev_tau = -pre / FPS - 1 / FPS
    lift_done = flash_done = absorb_done = False
    for li in range(-pre, nl):
        u = li / FPS
        tau = warp(st, u) if li >= 0 else u
        dt = tau - prev_tau
        prev_tau = tau
        px, py, R, lf = poi_state(st, tau)
        # 泳ぎ
        hd = hd + turn * np.sin(tau * fw + php) * dt
        out = (pos[:, 0] < 50) | (pos[:, 0] > W - 50) | (pos[:, 1] < 180) | (pos[:, 1] > H - 40)
        tgt = np.arctan2(CY - pos[:, 1], CX - pos[:, 0])
        hd = np.where(out & swim, hd + ((tgt - hd + math.pi) % TAU2 - math.pi) * min(1, 3 * dt), hd)
        vel = np.stack([np.cos(hd), np.sin(hd)], 1) * spd[:, None]
        if orbit.any():
            oc = np.array([CX + 60 * math.sin(0.7 * tau), 780 + 50 * math.cos(0.5 * tau)], np.float32)
            rel = pos - oc
            r = np.linalg.norm(rel, axis=1) + 1e-3
            tan = np.stack([-rel[:, 1], rel[:, 0]], 1) / r[:, None]
            corr = ((orad - r) * 1.8)[:, None] * rel / r[:, None]
            ov = tan * spd[:, None] + corr
            vel = np.where(orbit[:, None], ov, vel)
        if drift.any():
            dv = dvel.copy()
            bx = (pos[:, 0] < 30) & (dv[:, 0] < 0) | (pos[:, 0] > W - 30) & (dv[:, 0] > 0)
            by = (pos[:, 1] < 170) & (dv[:, 1] < 0) | (pos[:, 1] > H - 30) & (dv[:, 1] > 0)
            dvel[bx, 0] *= -1
            dvel[by, 1] *= -1
            vel = np.where(drift[:, None], dvel, vel)
        active = li >= 0 and cs <= tau < st["L0"] and caught < st["cap"] or (li < 0 and caught < st["cap"] * 0.3)
        free = ~np.isfinite(ctau)
        dx, dy = px - pos[:, 0], py - pos[:, 1]
        dist = np.sqrt(dx * dx + dy * dy) + 1e-3
        if active:
            pull = free & (dist < 2.8 * R)
            pk = np.where(pull, (1 - dist / (2.8 * R)) * 420, 0)[:, None]
            vel = vel + np.stack([dx / dist, dy / dist], 1) * pk
        pos = pos + vel * dt
        ang = np.where(drift, hd * 0 + spin * tau + php, np.arctan2(vel[:, 1], vel[:, 0]))
        if not drift.all():
            hd = np.where(drift, hd, np.arctan2(vel[:, 1], vel[:, 0]))
        if active:
            dx, dy = px - pos[:, 0], py - pos[:, 1]
            dist = np.sqrt(dx * dx + dy * dy)
            hit = np.where(free & (dist < 0.8 * R))[0]
            for i in hit[: max(0, st["cap"] - caught)]:
                ctau[i] = tau
                cpos[i] = pos[i]
                caught += 1
                crit = rng.random() < 0.14
                val = st["base"] * rng.uniform(1, 9) * (1 + caught / 12) * (5 if crit else 1)
                events.append((tau, float(pos[i, 0]), float(pos[i, 1]), val, 1 if crit else 0, eid, st["f0"] + li))
                eid += 1
            if li % 2 == 0:
                a, r = rng.uniform(math.pi * 0.9, math.pi * 2.1), rng.uniform(1.0, 1.3) * R
                events.append((tau, px + r * math.cos(a), py + r * math.sin(a), st["base"] * rng.uniform(0.3, 2.5), 2, eid, st["f0"] + li))
                eid += 1
        if li >= 0 and not lift_done and tau >= st["L0"]:
            lift_done = True
            events.append((tau, px, py, 0, 3, eid, st["f0"] + li))
            eid += 1
        if li >= 0 and not flash_done and u >= st["F"]:
            flash_done = True
            st["bonus"] = st["base"] * 300 * rng.uniform(2, 9)
            events.append((tau, px, py, st["bonus"], 4, eid, st["f0"] + li))
            eid += 1
        if li >= 0 and st["P"] > 0 and not absorb_done and tau >= st["P"] + 0.3:
            absorb_done = True
            events.append((tau, px, py, st["base"] * 60 * rng.uniform(2, 6), 5, eid, st["f0"] + li))
            eid += 1
        if li >= 0:
            rec_pos[li] = pos
            rec_ang[li] = ang
    st.update(pos=rec_pos, ang=rec_ang, ctau=ctau, cpos=cpos, offs=offs, offa=offa, size=size, kinds=kinds,
              var=var, php=php, events=events, caught=caught)


for _s in STAGES:
    simulate(_s)

# 得点（累計）を各フレームで
_score = np.zeros(NF + 1)
for _s in STAGES:
    for ev in _s["events"]:
        if ev[4] in (0, 1, 2, 4, 5):
            _score[max(0, min(NF, ev[6]))] += ev[3]
SCORE = np.cumsum(_score)

# サイズ計（メートル、log 補間）
SIZE_KEYS = [(0.0, 0.06), (1.75, 0.16), (2.0, 0.16), (2.4, 0.9), (3.4, 2.3), (3.9, 2.3), (4.3, 17), (5.3, 33),
             (5.8, 33), (6.2, 1.2e6), (7.2, 5.1e6), (7.7, 5.1e6), (8.1, 1.27e7), (9.1, 3.8e8), (9.6, 3.8e8),
             (9.8, 1.5e13), (10.0, 9.5e20), (11.2, 1.0e21), (11.5, 1.0e21), (15.1, 1.06e21)]


def size_at(t):
    for (t0, v0), (t1, v1) in zip(SIZE_KEYS, SIZE_KEYS[1:]):
        if t0 <= t <= t1:
            k = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return 10 ** lerp(math.log10(v0), math.log10(v1), k)
    return SIZE_KEYS[-1][1]


UNIT_COL = {"cm": (255, 110, 170), "m": (255, 175, 50), "km": (110, 235, 110), "AU": (80, 215, 255), "ly": (205, 140, 255)}


def fmt_size(m):
    if m < 1:
        return f"{m * 100:.1f}", "cm"
    if m < 1000:
        return (f"{m:.1f}" if m < 100 else f"{m:.0f}"), "m"
    if m < 1.5e10:
        return f"{m / 1000:,.0f}", "km"
    au = m / 1.496e11
    if au < 63000:
        return (f"{au:,.1f}" if au < 100 else f"{au:,.0f}"), "AU"
    return f"{m / 9.461e15:,.0f}", "ly"


def fmt_jp(v):
    for u, nm in ((1e20, "垓"), (1e16, "京"), (1e12, "兆"), (1e8, "億"), (1e4, "万")):
        if v >= u:
            x = v / u
            return (f"{x:.1f}" if x < 100 else f"{x:,.0f}") + nm
    return f"{int(v):,}"


# ---------------------------------------------------------------- 生き物・物体の描画
_CIR = [(math.cos(a), math.sin(a)) for a in np.linspace(0, TAU2, 24, endpoint=False)]


def _xf(pts, x, y, ang, s):
    c, sn = math.cos(ang), math.sin(ang)
    return [(x + (px * c - py * sn) * s, y + (px * sn + py * c) * s) for px, py in pts]


GOLD_VARS = [
    ((238, 52, 28), None, ()),
    ((255, 118, 22), None, ()),
    ((240, 60, 40), None, ((0.12, -0.06, 0.12, (250, 245, 240)),)),
    ((34, 30, 40), (90, 85, 110), ()),
    ((248, 242, 236), None, ((0.18, 0.02, 0.13, (240, 70, 30)), (-0.1, -0.05, 0.1, (240, 70, 30)))),
    ((255, 80, 30), None, ()),
    ((230, 40, 50), None, ()),
    ((255, 150, 40), None, ()),
]


def draw_fish(d, x, y, L, ang, ph, col, fin=None, hi=None, spots=(), eye=0.045, slim=0.2, tail=1.0, alpha=255):
    w = math.sin(ph) * 0.22
    a = int(alpha)
    fin = fin or tuple(min(255, int(c * 0.55 + 120)) for c in col)
    hi = hi or tuple(min(255, int(c * 0.45 + 150)) for c in col)
    dark = tuple(int(c * 0.5) for c in col)
    body = [(0.5 * cx - 0.02, slim * sy * (1 - 0.45 * max(0.0, -cx))) for cx, sy in _CIR]
    body = [(px, py + w * 1.2 * min(0.0, px) ** 2) for px, py in body]
    tl = [(-0.40, w * 0.1), (-0.62, -0.22 * tail + w * 0.5), (-0.62 - 0.33 * tail, -0.38 * tail + w),
          (-0.7 - 0.05 * tail, w * 0.8), (-0.62 - 0.33 * tail, 0.38 * tail + w), (-0.62, 0.22 * tail + w * 0.5)]
    if L < 16:
        d.polygon(_xf(tl, x, y, ang, L), fill=fin + (int(a * 0.7),))
        d.polygon(_xf(body, x, y, ang, L), fill=col + (a,))
        return
    d.polygon(_xf(tl, x, y, ang, L), fill=fin + (int(a * 0.6),))
    for i in (1, 2, 4, 5):
        p0 = _xf([tl[0]], x, y, ang, L)[0]
        p1 = _xf([tl[i]], x, y, ang, L)[0]
        d.line((p0, p1), fill=hi + (int(a * 0.5),), width=1)
    fw = math.sin(ph * 1.3) * 0.05
    for s in (-1, 1):
        f = [(0.14, s * slim * 0.8), (-0.04, s * (slim * 1.9 + 0.05 + fw)), (-0.13, s * slim * 0.9)]
        d.polygon(_xf(f, x, y, ang, L), fill=fin + (int(a * 0.55),))
    d.polygon(_xf([(px * 1.05, py * 1.16) for px, py in body], x, y, ang, L), fill=dark + (a,))
    d.polygon(_xf(body, x, y, ang, L), fill=col + (a,))
    hl = [(0.06 + 0.3 * cx, 0.055 * sy - 0.02) for cx, sy in _CIR]
    d.polygon(_xf(hl, x, y, ang, L), fill=hi + (int(a * 0.8),))
    for sx, sy, sr, sc in spots:
        d.polygon(_xf([(sx + sr * cx, sy + sr * 0.8 * cy) for cx, cy in _CIR], x, y, ang, L), fill=sc + (a,))
    if eye:
        for s in (-1, 1):
            ex, ey = _xf([(0.37, s * slim * 0.55)], x, y, ang, L)[0]
            r = max(1.0, eye * L)
            d.ellipse((ex - r, ey - r, ex + r, ey + r), fill=(15, 15, 20, a))
            d.ellipse((ex - r * 0.4, ey - r * 0.6, ex + r * 0.1, ey - r * 0.1), fill=(255, 255, 255, a))


def draw_whale(d, x, y, L, ang, ph, alpha=255):
    w = math.sin(ph) * 0.06
    a = int(alpha)
    up, lo = [], []
    for i in range(26):
        t = i / 25
        px = 0.5 - 0.9 * t
        hw = 0.15 * math.sin(math.pi * min(1.0, 0.18 + t * 1.25)) ** 0.7 + 0.025
        bend = w * max(0.0, t - 0.4) ** 2 * 4
        up.append((px, -hw + bend))
        lo.append((px, hw + bend))
    body = up + lo[::-1]
    fl = [(-0.38, w), (-0.5, -0.22 + w * 2), (-0.56, -0.2 + w * 2), (-0.48, w * 1.5), (-0.56, 0.2 + w * 2), (-0.5, 0.22 + w * 2)]
    d.polygon(_xf(fl, x, y, ang, L), fill=(55, 78, 115, a))
    fwv = math.sin(ph * 0.7) * 0.05
    for s in (-1, 1):
        fin = [(0.22, s * 0.12), (-0.08, s * (0.44 + fwv)), (-0.14, s * (0.42 + fwv)), (0.1, s * 0.13)]
        d.polygon(_xf(fin, x, y, ang, L), fill=(80, 105, 145, a))
        d.line(_xf([(0.2, s * 0.13), (-0.1, s * (0.44 + fwv))], x, y, ang, L), fill=(225, 235, 245, a), width=max(1, int(L * 0.012)))
    d.polygon(_xf([(px * 1.05, py * 1.25) for px, py in body], x, y, ang, L), fill=(190, 225, 255, int(a * 0.7)))
    d.polygon(_xf([(px * 1.03, py * 1.1) for px, py in body], x, y, ang, L), fill=(12, 18, 35, a))
    d.polygon(_xf(body, x, y, ang, L), fill=(38, 52, 82, a))
    hl = [(0.1 + 0.32 * cx, 0.045 * sy) for cx, sy in _CIR]
    d.polygon(_xf(hl, x, y, ang, L), fill=(110, 140, 180, int(a * 0.8)))
    for bx, by in ((0.42, 0.03), (0.38, -0.05), (0.33, 0.06), (0.44, -0.02)):
        p = _xf([(bx, by)], x, y, ang, L)[0]
        r = L * 0.008
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=(230, 235, 240, a))
    p = _xf([(0.3, 0.0)], x, y, ang, L)[0]
    d.ellipse((p[0] - L * 0.012, p[1] - L * 0.006, p[0] + L * 0.012, p[1] + L * 0.006), fill=(10, 15, 25, a))


ROCKS = [[(math.cos(a) * r, math.sin(a) * r) for a, r in zip(np.linspace(0, TAU2, 9, endpoint=False),
                                                             np.random.default_rng(300 + i).uniform(0.65, 1.0, 9))]
         for i in range(8)]


def paste_rgba(img, spr, x, y, s=1.0, alpha=1.0):
    if s <= 0.01:
        return
    w, h = max(1, int(spr.width * s)), max(1, int(spr.height * s))
    sp = spr.resize((w, h), Image.BILINEAR) if (w, h) != spr.size else spr
    m = sp.getchannel("A")
    if alpha < 0.999:
        m = m.point(lambda v: int(v * alpha))
    img.paste(sp.convert("RGB"), (int(x - w / 2), int(y - h / 2)), m)


def draw_item(img, d, g, st, kind, x, y, s, ang, ph, var, alpha=255, tau=0.0, glow=True):
    if kind == "gold":
        col, fin, spots = GOLD_VARS[var % len(GOLD_VARS)]
        draw_fish(d, x, y, s, ang, ph, col, fin=fin, spots=spots, eye=0.07 if var == 3 else 0.045,
                  slim=0.24 if var == 3 else 0.21, tail=1.1, alpha=alpha)
        if glow and var in (1, 7):
            gcirc(g, x, y, s * 0.3, (60, 25, 5))
    elif kind == "koi":
        spots = [((0.2, -0.04, 0.12, (240, 100, 25)), (-0.08, 0.04, 0.1, (240, 100, 25)), (0.0, -0.05, 0.06, (25, 25, 30))),
                 ((0.15, 0.0, 0.14, (230, 60, 30)),),
                 ((0.18, 0.03, 0.09, (25, 25, 30)), (-0.05, -0.04, 0.08, (25, 25, 30)), (0.05, 0.05, 0.08, (240, 120, 30)))][var % 3]
        base = [(246, 242, 236), (250, 248, 244), (255, 200, 70)][var % 3]
        draw_fish(d, x, y, s, ang, ph, base, spots=spots, eye=0.03, slim=0.16, tail=0.8, alpha=alpha)
    elif kind == "fry":
        draw_fish(d, x, y, s, ang, ph, (60, 70, 60) if var % 2 else (200, 120, 60), eye=0.0, slim=0.17, tail=0.8, alpha=alpha)
    elif kind == "sardine":
        draw_fish(d, x, y, s, ang, ph, (190, 205, 222), fin=(150, 170, 190), eye=0.0, slim=0.14, tail=0.7, alpha=alpha)
        if glow and math.sin(ph * 0.7 + var) > 0.85:
            gcirc(g, x, y, 5, (200, 230, 255))
    elif kind == "dolphin":
        draw_fish(d, x, y, s, ang, ph * 0.5, (120, 138, 160), fin=(100, 118, 140), eye=0.02, slim=0.13, tail=0.6, alpha=alpha)
    elif kind == "island":
        paste_rgba(img, ISLANDS[var % len(ISLANDS)], x, y, s / 72 * 1.25, alpha / 255)
    elif kind == "ship":
        c, sn = math.cos(ang), math.sin(ang)
        d.line((x, y, x - c * s * 2.2 - sn * s * 0.5, y - sn * s * 2.2 + c * s * 0.5), fill=(240, 250, 255, int(alpha * 0.35)), width=1)
        d.line((x, y, x - c * s * 2.2 + sn * s * 0.5, y - sn * s * 2.2 - c * s * 0.5), fill=(240, 250, 255, int(alpha * 0.35)), width=1)
        d.polygon(_xf([(0.5, 0), (-0.4, -0.22), (-0.4, 0.22)], x, y, ang, s), fill=(255, 250, 240, alpha))
        if glow:
            gcirc(g, x, y, 4, (255, 210, 120))
    elif kind == "rock":
        shp = ROCKS[var % len(ROCKS)]
        d.polygon(_xf(shp, x, y, ang, s / 2), fill=(85, 80, 82, alpha))
        d.polygon(_xf([(px * 0.8 - 0.16, py * 0.8 - 0.16) for px, py in shp], x, y, ang * 0 , s / 2), fill=(165, 158, 150, alpha))
        d.ellipse((x - s * 0.08, y - s * 0.02, x + s * 0.06, y + s * 0.1), fill=(70, 65, 66, alpha))
        if glow:
            gcirc(g, x - s * 0.1, y - s * 0.1, s * 0.35, (40, 45, 60))
    elif kind == "sat":
        for sgn in (-1, 1):
            pan = [(sgn * 0.18, -0.12), (sgn * 0.75, -0.12), (sgn * 0.75, 0.12), (sgn * 0.18, 0.12)]
            d.polygon(_xf(pan, x, y, ang, s), fill=(40, 80, 180, alpha), outline=(150, 190, 255, alpha))
        d.polygon(_xf([(-0.16, -0.16), (0.16, -0.16), (0.16, 0.16), (-0.16, 0.16)], x, y, ang, s), fill=(230, 185, 80, alpha))
        if glow:
            gcirc(g, x, y, s * 0.5, (60, 80, 140))
    elif kind == "moon":
        spr = sphere(tex("moon"), s, tau * 0.3, rim_k=0.4)
        paste_rgba(img, spr, x, y, 1.0, alpha / 255)
        if glow:
            gcirc(g, x, y, s * 0.65, (60, 70, 90))
    elif kind == "cluster":
        cols = [(255, 220, 150), (150, 200, 255), (255, 140, 210), (200, 255, 230)]
        c = cols[var % 4]
        if glow:
            gcirc(g, x, y, s * 0.9, scale_col(c, 0.55))
        rng = np.random.default_rng(int(var) * 7 + 3)
        for _ in range(7):
            ox, oy = rng.normal(0, s * 0.22, 2)
            r = rng.uniform(1.0, 2.6)
            d.ellipse((x + ox - r, y + oy - r, x + ox + r, y + oy + r), fill=c + (alpha,))
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 255, 255, alpha))
    elif kind == "minigal":
        paste_rgba(img, MINIGALS[var % len(MINIGALS)], x, y, s / 72 * 1.3, alpha / 255)
        if glow:
            gcirc(g, x, y, s * 0.4, (90, 60, 120))


def item_shadow(md, kind, x, y, s, lift=0.0):
    if kind in ("gold", "koi", "fry", "dolphin", "sardine"):
        r = s * 0.22
        ox, oy = 10 + s * 0.12, 16 + s * 0.18
        md.ellipse(((x + ox - r * 1.4) / 2, (y + oy - r) / 2, (x + ox + r * 1.4) / 2, (y + oy + r) / 2), fill=150)


# ---------------------------------------------------------------- 主役（各段階の大物）
def draw_headline(img, d, g, adds, st, x, y, s, tau):
    key = st["key"]

    def gring(r, col, wdt=10):
        g.ellipse(((x - r) / 2, (y - r) / 2, (x + r) / 2, (y + r) / 2), outline=col, width=wdt)

    if key == "tub":
        gring(95 * s, (150, 100, 20))
        draw_fish(d, x, y, 175 * s, -1.2 + 0.25 * math.sin(tau * 2), tau * 9, (255, 175, 35), fin=(255, 225, 140),
                  hi=(255, 245, 190), eye=0.04, slim=0.23, tail=1.25)
    elif key == "pond":
        gring(150 * s, (150, 110, 20))
        draw_fish(d, x, y, 290 * s, -1.0 + 0.2 * math.sin(tau * 1.6), tau * 6, (255, 200, 60), fin=(255, 230, 150),
                  hi=(255, 248, 200), spots=((0.2, 0.02, 0.07, (240, 90, 30)),), eye=0.025, slim=0.165, tail=0.85)
    elif key == "sea":
        draw_whale(d, x, y, 320 * s, -1.25 + 0.15 * math.sin(tau), tau * 4)
    elif key == "continent":
        paste_rgba(img, CONT, x, y, s * 1.3)
    elif key == "earth":
        D = int(280 * s)
        spr = sphere(tex("earth"), D, tau * 0.8, rim=(90, 170, 255), rim_k=0.9, amb=0.22)
        gring(D * 0.53, (40, 110, 230), 8)
        paste_rgba(img, spr, x, y)
    elif key == "galaxy":
        D = int(400 * s)
        rr = 175 * s
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(6, 3, 22, 190))
        adds.append((galaxy_sprite(D, tau * 0.9, gain=1.35), x, y, 1.0))
        # 炎の金魚が二匹、ポイの周りを回る（参照 04 の炎の帯の代わり）
        for j in range(2):
            a = tau * 2.4 + j * math.pi
            fx, fy = x + math.cos(a) * 205 * s, y + math.sin(a) * 205 * s
            draw_fish(d, fx, fy, 120 * s, a + math.pi / 2, tau * 14 + j, (255, 120, 30), fin=(255, 200, 80),
                      hi=(255, 240, 160), eye=0.04, slim=0.2, tail=1.5, alpha=235)
            for m in range(6):
                b = a - 0.12 * (m + 1)
                gcirc(g, x + math.cos(b) * 205 * s, y + math.sin(b) * 205 * s, 34 - m * 4, scale_col((255, 110, 30), 0.9 - m * 0.13))


# ---------------------------------------------------------------- ポイ
def draw_poi(img, d, g, x, y, R, lift=0.0, paper=0.62, ring=True, paper_on=True, handle=True, rimcol=None):
    hx0, hy0 = math.cos(0.95), math.sin(0.95)
    if handle:
        hw = R * 0.075
        p0 = (x + hx0 * R * 0.96, y + hy0 * R * 0.96)
        p1 = (x + hx0 * R * 3.0, y + hy0 * R * 3.0)
        nx, ny = -hy0, hx0
        poly = [(p0[0] + nx * hw, p0[1] + ny * hw), (p1[0] + nx * hw * 1.3, p1[1] + ny * hw * 1.3),
                (p1[0] - nx * hw * 1.3, p1[1] - ny * hw * 1.3), (p0[0] - nx * hw, p0[1] - ny * hw)]
        d.polygon(poly, fill=(205, 30, 45, 255))
        d.line(((p0[0] + nx * hw * 0.4, p0[1] + ny * hw * 0.4), (p1[0] + nx * hw * 0.5, p1[1] + ny * hw * 0.5)),
               fill=(255, 140, 140, 220), width=max(1, int(hw * 0.5)))
    if paper_on and R > 2:
        sz = max(2, int(R * 2))
        sp = PAPER.resize((sz, sz), Image.BILINEAR)
        m = sp.getchannel("A").point(lambda v: int(v * paper))
        img.paste(sp.convert("RGB"), (int(x - sz / 2), int(y - sz / 2)), m)
    if ring:
        rw = max(3, int(R * 0.06))
        d.ellipse((x - R - rw / 2, y - R - rw / 2, x + R + rw / 2, y + R + rw / 2), outline=(120, 10, 25, 255), width=rw + 2)
        d.ellipse((x - R, y - R, x + R, y + R), outline=(222, 35, 50, 255), width=rw)
        d.arc((x - R + rw * 0.3, y - R + rw * 0.3, x + R - rw * 0.3, y + R - rw * 0.3), 190, 290, fill=(255, 170, 170, 255), width=max(1, rw // 3))
        g.ellipse(((x - R) / 2, (y - R) / 2, (x + R) / 2, (y + R) / 2), outline=rimcol or (120, 30, 40), width=max(2, rw // 2 + 1))


def draw_streams(d, g, st, x, y, R, lf, tau):
    if lf <= 0.01:
        return 0
    space = st["space"]
    col = (215, 238, 255) if not space else (200, 215, 255)
    cnt = 0
    for j in range(18):
        a = math.pi * (0.08 + 0.84 * j / 17)
        sx, sy = x + R * math.cos(a), y + R * math.sin(a)
        ln = (40 + 150 * lf) * (0.55 + 0.45 * math.sin(j * 1.7 + 0.3) ** 2)
        pts = []
        for k in range(8):
            q = k / 7
            pts.append((sx + math.sin(tau * 23 + j * 2 + k) * 2.5 * q + (sx - x) * 0.08 * q, sy + ln * q))
        wdt = (3 + (j % 3) * 2) if space else (6 + (j % 3) * 4)
        if not space:
            fx, fy = pts[-1]
            fr = (10 + 8 * (j % 3)) * lf
            d.ellipse((fx - fr * 1.5, fy - fr * 0.7, fx + fr * 1.5, fy + fr * 0.7), fill=(240, 248, 255, int(110 * lf)))
            gcirc(g, fx, fy, fr * 1.6, scale_col((200, 230, 255), 0.35 * lf))
        d.line(pts, fill=col + (int(170 * lf),), width=wdt)
        d.line(pts, fill=(255, 255, 255, int(200 * lf)), width=max(1, wdt // 3))
        g.line([(p[0] / 2, p[1] / 2) for p in pts], fill=scale_col(col, 0.45 * lf), width=max(1, wdt // 2))
        ex, ey = pts[-1]
        for m in range(3):
            fy = ey + ((tau * 260 + m * 23 + j * 11) % 60)
            r = 2.5 - m * 0.5
            d.ellipse((ex - r, fy - r, ex + r, fy + r), fill=(235, 248, 255, int(220 * lf)))
            cnt += 1
        if not space:
            rr = 10 + 8 * ((tau * 3 + j * 0.37) % 1)
            d.ellipse((ex - rr * 1.4, ey + 50 - rr * 0.5, ex + rr * 1.4, ey + 50 + rr * 0.5), outline=(230, 245, 255, int(120 * lf)), width=2)
        cnt += 1
    return cnt


# ---------------------------------------------------------------- 粒子
def particles(d, g, st, tau, R):
    cnt = 0
    space = st["space"]
    pal = [(215, 240, 255), (170, 225, 255), (255, 255, 255)] if not space else [(255, 220, 140), (150, 210, 255), (255, 150, 220), (255, 255, 255)]
    for ev in st["events"]:
        et, ex, ey, val, kind, eid, _ = ev
        age = tau - et
        if kind in (0, 1):
            life = 0.6
            if not (0 <= age < life):
                continue
            rng = np.random.default_rng(eid)
            nd = 12 if kind == 1 else 8
            angs = rng.uniform(0, TAU2, nd)
            sps = rng.uniform(120, 360, nd)
            q = age / life
            for i in range(nd):
                dd = sps[i] * age * (1 - 0.5 * q)
                px, py = ex + math.cos(angs[i]) * dd, ey + math.sin(angs[i]) * dd
                r = (2 + 3 * (i % 3) / 2) * (1 - q)
                c = pal[i % len(pal)]
                d.ellipse((px - r, py - r, px + r, py + r), fill=c + (int(230 * (1 - q)),))
                gcirc(g, px, py, r * 2.2, scale_col(c, 0.7 * (1 - q)))
                cnt += 1
            rr = 8 + 110 * ease_out(q)
            ring_c = (230, 245, 255) if not space else (255, 230, 170)
            d.ellipse((ex - rr, ey - rr * (0.75 if not space else 1), ex + rr, ey + rr * (0.75 if not space else 1)),
                      outline=ring_c + (int(150 * (1 - q)),), width=2)
            cnt += 1
        elif kind in (3, 4):
            life = 0.9 if kind == 3 else 0.8
            if not (0 <= age < life):
                continue
            rng = np.random.default_rng(eid)
            nd = 60 if kind == 3 else 90
            angs = rng.uniform(0, TAU2, nd)
            sps = rng.uniform(200, 760 if kind == 4 else 520, nd)
            q = age / life
            for i in range(nd):
                dd = sps[i] * age * (1 - 0.55 * q)
                ca, sa = math.cos(angs[i]), math.sin(angs[i])
                px, py = ex + ca * (R * 0.9 + dd), ey + sa * (R * 0.9 + dd)
                c = pal[i % len(pal)] if kind == 3 else [(255, 240, 160), (255, 255, 255), (255, 170, 90)][i % 3]
                tl = 10 + 26 * (1 - q)
                d.line((px, py, px - ca * tl, py - sa * tl), fill=c + (int(240 * (1 - q)),), width=3)
                gcirc(g, px, py, 7 * (1 - q) + 2, scale_col(c, 0.8 * (1 - q)))
                cnt += 1
            if kind == 4:
                rr = R + 700 * ease_out(q)
                d.ellipse((ex - rr, ey - rr, ex + rr, ey + rr), outline=(255, 250, 220, int(200 * (1 - q))), width=int(3 + 10 * (1 - q)))
                g.ellipse(((ex - rr) / 2, (ey - rr) / 2, (ex + rr) / 2, (ey + rr) / 2), outline=scale_col((255, 220, 140), 1 - q), width=int(4 + 8 * (1 - q)))
    return cnt


# ---------------------------------------------------------------- 段階ごとの環境の動き
LANTERNS = np.random.default_rng(31).uniform(0, 1, (46, 4))
PADS = np.random.default_rng(32).uniform(0, 1, (26, 4))
PETALS = np.random.default_rng(33).uniform(0, 1, (110, 4))
GLINTS = np.random.default_rng(34).uniform(0, 1, (220, 3))
TWINK = np.random.default_rng(35).uniform(0, 1, (120, 3))
CLOUDP = np.random.default_rng(36).uniform(0, 1, (12, 3))


def ambient_under(img, d, g, st, tau):
    key = st["key"]
    cnt = 0
    if key in ("tub", "reveal"):
        cols = [(255, 70, 40), (255, 150, 50), (255, 210, 120), (255, 110, 70)]
        k = 0.8 if key == "reveal" else 1.0
        for i, (a, b, c, e) in enumerate(LANTERNS):
            x = 50 + a * (W - 100)
            y = 120 + b * (H - 200)
            col = cols[i % 4]
            rw = 22 + 40 * c
            for j in range(3):
                yy = y + j * 9
                xx = x + 8 * math.sin(tau * 3 + i + j * 1.3)
                ww = rw * (1 - j * 0.22)
                d.ellipse((xx - ww, yy - 4, xx + ww, yy + 4), fill=col + (int(60 * k),))
                g.ellipse(((xx - ww) / 2, (yy - 6) / 2, (xx + ww) / 2, (yy + 6) / 2), fill=scale_col(col, 0.35 * k))
            cnt += 1
        # 手前にぼけた提灯の光（上の縁と下の角）
        for i in range(14):
            bx = (i * 97 + 30) % W
            by = 20 + (i * 53) % 150 if i < 10 else H - 40 - (i * 41) % 120
            br = 40 + (i * 29) % 45
            col = cols[i % 4]
            pul = 0.8 + 0.2 * math.sin(tau * 2 + i)
            d.ellipse((bx - br, by - br, bx + br, by + br), fill=col + (int(45 * pul),))
            gcirc(g, bx, by, br * 1.1, scale_col(col, 0.5 * pul))
            cnt += 1
    if key == "sea":
        for i, (a, b, c) in enumerate(GLINTS):
            tw = math.sin(tau * (4 + 6 * c) + i * 2.1)
            if tw > 0.55:
                x, y = a * W, b * H
                r = 1.5 + 4 * (tw - 0.55)
                d.line((x - r * 3, y, x + r * 3, y), fill=(255, 255, 255, 200), width=1)
                d.line((x, y - r * 2, x, y + r * 2), fill=(255, 255, 255, 160), width=1)
                gcirc(g, x, y, r * 3, (180, 220, 255))
                cnt += 1
    if key in ("earth", "galaxy", "continent"):
        for i, (a, b, c) in enumerate(TWINK):
            if key == "continent" and b * H > 300:
                continue
            tw = 0.5 + 0.5 * math.sin(tau * (3 + 5 * c) + i)
            x, y = a * W, b * H
            col = [(255, 255, 255), (180, 210, 255), (255, 210, 180)][i % 3]
            gcirc(g, x, y, 3 + 6 * tw, scale_col(col, 0.4 + 0.6 * tw))
            cnt += 1
    return cnt


def ambient_over(img, d, g, st, tau):
    key = st["key"]
    cnt = 0
    if key == "pond":
        for i, (a, b, c, e) in enumerate(PADS):
            x = 40 + a * (W - 80) + 6 * math.sin(tau * 0.7 + i)
            y = 200 + b * (H - 240)
            r = 26 + 34 * c
            rot = e * 360
            d.pieslice((x - r + 3, y - r + 5, x + r + 3, y + r + 5), rot + 20, rot + 340, fill=(0, 20, 10, 90))
            d.pieslice((x - r, y - r, x + r, y + r), rot + 20, rot + 340, fill=(55, 140, 60, 255))
            d.pieslice((x - r * 0.85, y - r * 0.85, x + r * 0.85, y + r * 0.85), rot + 25, rot + 335, fill=(75, 165, 70, 255))
            for v in range(5):
                aa = math.radians(rot + 60 + v * 60)
                d.line((x, y, x + math.cos(aa) * r * 0.8, y + math.sin(aa) * r * 0.8), fill=(110, 190, 95, 200), width=1)
            if i % 5 == 0:
                d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 170, 200, 255))
                d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 235, 140, 255))
                gcirc(g, x, y, 16, (120, 60, 80))
            cnt += 1
        for i, (a, b, c, e) in enumerate(PETALS):
            x = (a * W + tau * 20 * (0.5 + c)) % W
            y = (b * H + tau * 12 * (0.5 + e)) % H
            ang = tau * (1 + 2 * c) + i
            d.polygon(_xf([(0.5, 0), (0, -0.28), (-0.5, 0), (0, 0.28)], x, y, ang, 9 + 6 * c), fill=(255, 190, 210, 230))
            cnt += 1
    if key == "continent":
        for i, (a, b, c) in enumerate(CLOUDP):
            x = (a * (W + 300) + tau * 30 * (0.5 + c)) % (W + 300) - 150
            y = 330 + b * (H - 330)
            paste_rgba(img, CLOUDS[i % len(CLOUDS)], x, y, 0.8 + 0.8 * c, 0.85)
            cnt += 1
    return cnt


# ---------------------------------------------------------------- 1 枚の世界を描く
_PREV = {}


def prev_final(k):
    if k not in _PREV:
        img, _ = render_world(STAGES[k], STAGES[k]["D"] - 0.5 / FPS)
        _PREV[k] = img
    return _PREV[k]


def orb_image(k, R):
    img = prev_final(k)
    kz = R / DIAG
    w, h = max(2, int(W * kz)), max(2, int(H * kz))
    sm = img.resize((w, h), Image.LANCZOS)
    m = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(m)
    r = R * 0.6
    md.ellipse((w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r), fill=255)
    return sm, m.filter(ImageFilter.GaussianBlur(1.5))


def render_world(st, u, pull=False):
    k = st["idx"]
    key = st["key"]
    tau = warp(st, u)
    li = min(st["nl"] - 1, max(0, int(round(u * FPS))))
    counts = {}
    arr = bg(key).copy()
    if st["water"] and key != "continent":
        c = caustic(tau)
        cc = {"tub": (120, 210, 255), "pond": (120, 220, 150), "sea": (90, 190, 255), "reveal": (90, 150, 255)}[key]
        arr += c[..., None] * np.array(cc, np.float32) * (0.38 if key != "reveal" else 0.25)
    px, py, R, lf = poi_state(st, tau)
    pos, angs = st["pos"][li], st["ang"][li]
    n = st["n"]
    # 影
    if st["water"] and key != "continent":
        mimg = Image.new("L", (W // 2, H // 2), 0)
        md = ImageDraw.Draw(mimg)
        for i in range(n):
            if tau < st["ctau"][i]:
                item_shadow(md, st["kinds"][i], pos[i, 0], pos[i, 1], st["size"][i])
        if not pull and key != "reveal":
            off = 14 + 60 * lf
            md.ellipse(((px + off - R) / 2, (py + off * 1.3 - R) / 2, (px + off + R) / 2, (py + off * 1.3 + R) / 2), fill=int(120 - 50 * lf))
        if key == "reveal":
            for p in PLANET_FISH:
                x, y = planet_pos(p, tau)
                sx = x + p[6] * 0.1 * p[3] + 16
                md.ellipse(((sx - p[3] * 0.38) / 2, (y + 34 - p[3] * 0.14) / 2, (sx + p[3] * 0.38) / 2, (y + 34 + p[3] * 0.14) / 2), fill=150)
        m = np.asarray(mimg.filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.BILINEAR), np.float32) / 255
        arr *= (1 - 0.5 * m)[..., None]
    img = to_img(arr)
    d = ImageDraw.Draw(img, "RGBA")
    glow = Image.new("RGB", (W // 2, H // 2), 0)
    g = ImageDraw.Draw(glow)
    adds = []
    counts["ambient"] = ambient_under(img, d, g, st, tau)
    head_lifted = tau >= st["L0"]
    if key != "reveal" and not head_lifted:
        hx = CX + 10 * math.sin(tau * 1.3)
        hy = CY + 8 * math.cos(tau * 1.1)
        draw_headline(img, d, g, adds, st, hx, hy, 1.0, tau)
    # 自由に泳ぐもの
    nfree = 0
    for i in range(n):
        if tau < st["ctau"][i]:
            x, y = pos[i]
            s = st["size"][i]
            if -80 < x < W + 80 and -80 < y < H + 80:
                draw_item(img, d, g, st, st["kinds"][i], x, y, s, angs[i], tau * 12 + st["php"][i] * 3, st["var"][i], tau=tau)
                nfree += 1
    counts["free"] = nfree
    if key == "reveal":
        counts["planets"] = draw_planet_fish(img, d, g, tau)
    counts["over"] = ambient_over(img, d, g, st, tau)
    # ポイ
    ncaught = 0
    if not pull:
        pa = {"tub": 0.36, "reveal": 0.3}.get(key, 0.5 if not st["space"] else 0.32)
        draw_poi(img, d, g, px, py, R, lf, ring=False, handle=False, paper=pa * (1 - 0.5 * lf))
        if key == "reveal":
            # 改善 5: 前の銀河の最終フレーム（白っぽい）から、暗い円＋渦の見える銀河へ 0.3 秒で切り替える
            mix = ease((tau - st["P"]) / 0.3)
            rr = R * 0.93
            d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=(5, 3, 20, int(230 * mix)))
            if mix < 1:
                sm, m = orb_image(k - 1, R)
                m = m.point(lambda v: int(v * (1 - mix)))
                img.paste(sm, (int(px - sm.width / 2), int(py - sm.height / 2)), m)
            if mix > 0:
                adds.append((galaxy_sprite(int(R * 2.05), tau * 0.6, gain=1.0 * mix), px, py, 1.0))
        elif k >= 1 and tau < st["P"] + 0.35:
            sm, m = orb_image(k - 1, R)
            a = 1 - ease((tau - st["P"]) / 0.35)
            if a > 0.02:
                sw, sh = max(2, int(sm.width * a)), max(2, int(sm.height * a))
                img.paste(sm.resize((sw, sh)), (int(px - sw / 2), int(py - sh / 2)), m.resize((sw, sh)))
                gcirc(g, px, py, R * 0.6 * a + 10, (120, 110, 90))
        caught = [i for i in range(n) if st["ctau"][i] <= tau]
        caught.sort(key=lambda i: st["ctau"][i])
        for i in caught[-22:]:
            age = tau - st["ctau"][i]
            q = ease(age / 0.22)
            tx = px + math.cos(st["offa"][i] + tau * 0.6) * st["offs"][i] * R
            ty = py + math.sin(st["offa"][i] + tau * 0.6) * st["offs"][i] * R
            x = lerp(st["cpos"][i][0], tx, q)
            y = lerp(st["cpos"][i][1], ty, q)
            s = st["size"][i] * lerp(1.0, 0.7, q) * (1 + 0.1 * lf)
            draw_item(img, d, g, st, st["kinds"][i], x, y, s, st["offa"][i] + tau * 1.5, tau * 16 + i, st["var"][i], tau=tau)
            ncaught += 1
        if key != "reveal" and head_lifted:
            draw_headline(img, d, g, adds, st, px, py, 1.0 + 0.1 * lf, tau)
        rimcol = {"earth": (60, 140, 255), "galaxy": (255, 120, 40)}.get(key)
        draw_poi(img, d, g, px, py, R, lf, paper_on=False, rimcol=rimcol)
        if key == "galaxy":
            for j in range(10):
                a0 = tau * 2.2 + j * TAU2 / 10
                rr = R * (1.05 + 0.08 * math.sin(tau * 5 + j))
                g.arc(((px - rr) / 2, (py - rr) / 2, (px + rr) / 2, (py + rr) / 2), math.degrees(a0), math.degrees(a0) + 25,
                      fill=(255, 130, 40), width=6)
        counts["streams"] = draw_streams(d, g, st, px, py, R, lf, tau)
    counts["caught_in_poi"] = ncaught
    counts["particles"] = particles(d, g, st, tau, R)
    # 光
    out = np.asarray(img, np.float32).copy()
    for spr, x, y, kk in adds:
        add_sprite(out, spr, x, y, kk)
    gl1 = np.asarray(glow.filter(ImageFilter.GaussianBlur(3)).resize((W, H), Image.BILINEAR), np.float32)
    gl2 = np.asarray(glow.filter(ImageFilter.GaussianBlur(12)).resize((W, H), Image.BILINEAR), np.float32)
    # 改善 5: ポイの紙の内側は光を弱め、中の魚・主役が白く飛ばないようにする
    if not pull:
        dist = np.sqrt((XX - px) ** 2 + (YY - py) ** 2)
        inner = np.clip((R * 0.97 - dist) / 8, 0, 1)[..., None]
    else:
        inner = 0.0
    out += (gl1 * 0.7 + gl2 * 1.1) * (1 - 0.7 * inner)
    small = to_img(out).resize((W // 4, H // 4), Image.BILINEAR)
    br = np.clip(np.asarray(small, np.float32) - 215, 0, None) * 2.0
    bl = to_img(br).filter(ImageFilter.GaussianBlur(7)).resize((W, H), Image.BILINEAR)
    out += np.asarray(bl, np.float32) * 0.5 * (1 - 0.85 * inner)
    return to_img(out), counts


# ---------------------------------------------------------------- 種明かし：惑星の金魚
# (名前, テクスチャ, ひれの色, 全長px, 基準x, 基準y, 向き(1=右,-1=左))
PLANET_FISH = [
    ("地球", "earth", (225, 240, 255), 176, 190, 565, 1),
    ("木星", "jupiter", (255, 200, 140), 190, 530, 560, -1),
    ("火星", "mars", (255, 120, 70), 152, 185, 775, 1),
    ("海王星", "neptune", (120, 170, 255), 166, 535, 775, -1),
    ("金星", "venus", (255, 232, 170), 160, 190, 980, 1),
    ("土星", "saturn", (245, 220, 165), 180, 530, 975, -1),
]
PLANET_GLOW = {"earth": (40, 110, 220), "jupiter": (140, 100, 50), "mars": (140, 50, 20), "neptune": (40, 70, 200),
               "venus": (150, 120, 60), "saturn": (140, 110, 60)}


def planet_pos(p, tau):
    i = PLANET_FISH.index(p)
    return p[4] + 14 * math.sin(tau * 1.1 + i), p[5] + 9 * math.cos(tau * 0.9 + i * 2)


def planet_fish_sprite(tk, L, fc, rot, wig):
    """右向きの金魚の形。体に惑星のテクスチャを貼る（改善 5）。"""
    S = int(L * 1.3)
    c = S / 2
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    a, b = 0.30 * L, 0.20 * L
    bx = c + 0.14 * L
    rear = bx - a * 0.85

    def P(px, py):
        return (c + px * L, c + py * L)

    # 尾びれ（2 層の薄いベール、先が二股に分かれて流れる）
    for layer, (sc, al) in enumerate(((1.0, 95), (0.72, 150))):
        pts = [(rear + 0.02 * L, c)]
        for j in range(25):
            q = j / 24
            ang = (q - 0.5) * 2.0
            lobe = 0.20 + 0.20 * sc * (0.75 + 0.35 * abs(math.sin(q * math.pi * 2)))
            sway = wig * 0.10 * math.sin(q * math.pi)
            pts.append((rear - lobe * L * math.cos(ang) * 1.05, c + lobe * L * math.sin(ang) * 0.95 + sway * L))
        d.polygon(pts, fill=fc + (al,))
        if layer == 1:
            for j in range(1, 25, 3):
                d.line((pts[0], pts[j]), fill=(255, 255, 255, 110), width=1)
    def fan(px, py, r, a0, a1, al, n=14):
        """付け根 (px,py) から扇形に広がる、縁が波打つひれ。角度は度（0=右、90=下）。"""
        x0, y0 = c + px * L, c + py * L
        pts = [(x0, y0)]
        for j in range(n + 1):
            q = j / n
            aa = math.radians(a0 + (a1 - a0) * q)
            rr = r * L * (0.85 + 0.15 * abs(math.sin(q * math.pi * 3))) * (0.55 + 0.45 * math.sin(q * math.pi))
            pts.append((x0 + rr * math.cos(aa), y0 + rr * math.sin(aa)))
        d.polygon(pts, fill=fc + (al,))
        for j in range(1, n + 1, 2):
            d.line((pts[0], pts[j]), fill=(255, 255, 255, 80), width=1)

    # 背びれ・尻びれ（扇形でなびく）
    fan(0.10, -0.15, 0.24, 205 + wig * 6, 285 + wig * 6, 140)
    fan(-0.04, 0.12, 0.17, 95 + wig * 8, 160 + wig * 8, 130, 10)
    # 土星の輪（奥側）
    ring_box = (bx - 0.52 * L, c - 0.11 * L, bx + 0.42 * L, c + 0.11 * L)
    if tk == "saturn":
        d.arc(ring_box, 180, 360, fill=(230, 205, 155, 235), width=max(3, int(L * 0.045)))
    # 体（テクスチャ付きの楕円体、後ろ半分は細く）
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    nx = (xs - bx) / a
    bh = b * (1 - 0.38 * np.clip(-nx, 0, 1)) * (1 + 0.06 * np.clip(nx, 0, 1))
    ny = (ys - c) / bh
    r2 = nx * nx + ny * ny
    nz = np.sqrt(np.clip(1 - r2, 0, 1))
    lat = np.arcsin(np.clip(-ny, -1, 1)) * 0.9
    lon = np.arctan2(nx, nz + 1e-6) * 0.85 + rot
    t = tex(tk)
    th, tw = t.shape[:2]
    u = ((lon / TAU2) % 1 * tw).astype(np.int32) % tw
    v = np.clip(((0.5 - lat / math.pi) * th).astype(np.int32), 0, th - 1)
    col = t[v, u]
    Lv = np.array((-0.45, -0.65, 0.62), np.float32)
    Lv /= np.linalg.norm(Lv)
    lam = np.clip(nx * Lv[0] + ny * Lv[1] + nz * Lv[2], 0, 1)
    col = col * (0.3 + 0.75 * lam[..., None] ** 0.8) + (np.clip(lam, 0, 1) ** 24 * 80)[..., None]
    rim = (1 - nz) ** 2.5
    col = col + np.array(PLANET_GLOW[tk], np.float32) * (rim * 0.9)[..., None]
    if tk == "venus":
        col = col * 0.8 + 255 * 0.2  # もや
    if tk == "jupiter":  # 大赤斑を体の腹側に描き足す
        spot = np.exp(-((nx - 0.05) / 0.22) ** 2 - ((ny - 0.36) / 0.12) ** 2)[..., None]
        col = col * (1 - 0.85 * spot) + np.array((200, 80, 50), np.float32) * (0.3 + 0.75 * lam[..., None]) * 0.85 * spot
    al = np.clip((1 - np.sqrt(r2)) * a * 0.9, 0, 1) * 255
    body = Image.fromarray(np.dstack([np.clip(col, 0, 255), al]).astype(np.uint8), "RGBA")
    img.alpha_composite(body)
    d = ImageDraw.Draw(img, "RGBA")
    # えらの線・胸びれ
    d.arc((bx + 0.15 * a - 0.5 * b, c - 0.75 * b, bx + 0.15 * a + 0.5 * b, c + 0.75 * b), 300, 60, fill=(20, 20, 40, 90), width=2)
    fan(0.17, 0.07, 0.14, 100 + wig * 10, 150 + wig * 10, 150, 8)
    if tk == "saturn":
        d.arc(ring_box, 0, 180, fill=(240, 218, 170, 245), width=max(3, int(L * 0.045)))
        d.arc((ring_box[0] + 0.05 * L, ring_box[1] + 0.025 * L, ring_box[2] - 0.05 * L, ring_box[3] - 0.025 * L), 0, 180,
              fill=(170, 140, 95, 200), width=max(1, int(L * 0.015)))
    # 目と口
    ex, ey, er = bx + 0.62 * a, c - 0.22 * b, 0.055 * L
    d.ellipse((ex - er, ey - er, ex + er, ey + er), fill=(250, 250, 255, 255), outline=(20, 20, 40, 200), width=1)
    d.ellipse((ex - er * 0.35, ey - er * 0.6, ex + er * 0.75, ey + er * 0.6), fill=(10, 10, 20, 255))
    d.ellipse((ex - er * 0.1, ey - er * 0.45, ex + er * 0.3, ey - er * 0.05), fill=(255, 255, 255, 255))
    mx, my = bx + a * 0.98, c + 0.12 * b
    d.arc((mx - 0.03 * L, my - 0.02 * L, mx + 0.01 * L, my + 0.03 * L), 90, 200, fill=(30, 20, 30, 200), width=2)
    return img


def draw_planet_fish(img, d, g, tau):
    for i, p in enumerate(PLANET_FISH):
        name, tk, fc, L, ax, ay, face = p
        x, y = planet_pos(p, tau)
        wig = math.sin(tau * 6 + i * 1.3)
        rot0 = {"jupiter": 3.25}.get(tk, i * 1.1)  # 木星は大赤斑が体の中央に来る向き
        spr = planet_fish_sprite(tk, L, fc, tau * 0.12 + rot0, wig)
        if face < 0:
            spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
        spr = spr.rotate(8 * math.sin(tau * 1.2 + i), resample=Image.BICUBIC)
        gcirc(g, x + face * 0.14 * L, y, L * 0.3, scale_col(PLANET_GLOW[tk], 0.45))
        img.paste(spr, (int(x - spr.width / 2), int(y - spr.height / 2)), spr)
    return len(PLANET_FISH)


# ---------------------------------------------------------------- HUD・文字
def text_o(d, xy, s, size, fill, stroke=6, sfill=(25, 12, 40), anchor="mm", alpha=255, wt=900):
    f = font(size, wt)
    d.text((xy[0] + 3, xy[1] + 5), s, font=f, fill=(0, 0, 0, int(alpha * 0.5)), anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0, int(alpha * 0.5)))
    d.text(xy, s, font=f, fill=fill[:3] + (alpha,), anchor=anchor, stroke_width=stroke, stroke_fill=sfill[:3] + (alpha,))


NUM_CAP = 15


def draw_numbers(img, st, tau):
    d = ImageDraw.Draw(img, "RGBA")
    cnt = 0
    px, py, R, _ = poi_state(st, tau)
    # 改善 5: 同時 15 個まで。ポイの縁の外の輪に出して外へ流す。大きい数字は見出し（バナーのボーナス）1 つだけ。
    live = []
    for ev in st["events"]:
        if ev[4] in (0, 1, 2):
            life = 0.8
            if 0 <= tau - ev[0] < life:
                live.append((ev, life))
    live = live[-NUM_CAP:]
    for ev, life in live:
        et, ex, ey, val, kind, eid, _ = ev
        age = tau - et
        q = age / life
        vx, vy = ex - px, ey - py
        dn = math.hypot(vx, vy)
        if dn < 1:
            a = (eid * 2.399) % TAU2
            vx, vy, dn = math.cos(a), math.sin(a), 1.0
        rad = R * 1.18 + 16 * (eid % 3) + 90 * ease_out(q)
        x = px + vx / dn * rad
        y = py + vy / dn * rad
        x = min(W - 80, max(80, x))
        y = min(H - 30, max(250, y))
        base = {0: 28, 1: 34, 2: 22}[kind]
        size = base * (1 + 0.7 * max(0.0, 1 - age / 0.1))
        alpha = int(255 * (1 if q < 0.6 else 1 - (q - 0.6) / 0.4))
        col = {0: (255, 228, 70), 1: (255, 120, 50), 2: (255, 255, 255), 5: (120, 255, 200)}[kind]
        txt = "+" + fmt_jp(val)
        text_o(d, (x, y), txt, size, col, stroke=4 if kind == 2 else 5, sfill=(50, 20, 10), alpha=alpha)
        cnt += 1
    return cnt


_BANNER = {}


def banner_img(k):
    if k in _BANNER:
        return _BANNER[k]
    st = STAGES[k]
    text = st["banner"]
    f = font(118)
    sub = "すくえた!"
    bonus = "+" + fmt_jp(st.get("bonus", 0))
    tmp = ImageDraw.Draw(Image.new("L", (1, 1)))
    bb = tmp.textbbox((0, 0), text, font=f, stroke_width=16)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    Wb, Hb = max(tw + 40, 600), th + 200
    im = Image.new("RGBA", (Wb, Hb), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = Wb / 2, 70 + th / 2
    d.text((cx + 6, cy + 9), text, font=f, anchor="mm", fill=(0, 0, 0, 140), stroke_width=16, stroke_fill=(0, 0, 0, 140))
    d.text((cx, cy), text, font=f, anchor="mm", fill=(60, 15, 20, 255), stroke_width=16, stroke_fill=(60, 15, 20, 255))
    d.text((cx, cy), text, font=f, anchor="mm", fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(255, 255, 255, 255))
    mask = Image.new("L", (Wb, Hb), 0)
    ImageDraw.Draw(mask).text((cx, cy), text, font=f, anchor="mm", fill=255)
    gy = np.linspace(0, 1, Hb, dtype=np.float32)[:, None]
    t = np.clip((gy - (cy - th / 2) / Hb) / (th / Hb), 0, 1)
    top, mid, bot = np.array((255, 252, 200)), np.array((255, 215, 60)), np.array((255, 110, 30))
    col = np.where(t[..., None] < 0.5, top * (1 - t[..., None] * 2) + mid * t[..., None] * 2, mid * (2 - t[..., None] * 2) + bot * (t[..., None] * 2 - 1))
    grad = Image.fromarray(np.broadcast_to(col, (Hb, Wb, 3)).astype(np.uint8))
    im.paste(grad, (0, 0), mask)
    d.line((cx - tw * 0.4, cy - th * 0.18, cx + tw * 0.4, cy - th * 0.18), fill=(255, 255, 255, 0))
    fs = font(46)
    d.text((cx - tw * 0.25, 30), sub, font=fs, anchor="mm", fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(60, 15, 20, 255))
    fb = font(54)
    d.text((cx, cy + th / 2 + 60), bonus, font=fb, anchor="mm", fill=(120, 255, 210, 255), stroke_width=7, stroke_fill=(10, 40, 40, 255))
    _BANNER[k] = im
    return im


def draw_banner(img, t):
    for st in STAGES[:6]:
        tf = st["S"] + st["F"]
        b = t - tf
        if 0 <= b < 1.15:
            im = banner_img(st["idx"])
            s = back(b / 0.3) * (1 + 0.25 * max(0.0, 1 - b / 0.06))
            alpha = 1.0 if b < 0.9 else 1 - (b - 0.9) / 0.25
            if b > 0.9:
                s *= 1 + 0.4 * (b - 0.9)
            cx, cy = 360, 450
            # 放射光
            ray = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            rd = ImageDraw.Draw(ray)
            for j in range(16):
                a0 = b * 0.8 + j * TAU2 / 16
                rl = 620 * min(1.0, b / 0.15)
                rd.polygon([(cx, cy), (cx + math.cos(a0 - 0.08) * rl, cy + math.sin(a0 - 0.08) * rl),
                            (cx + math.cos(a0 + 0.08) * rl, cy + math.sin(a0 + 0.08) * rl)],
                           fill=(255, 230, 120, int(60 * alpha)))
            img.paste(ray, (0, 0), ray)
            if s < 0.02:
                continue
            w, h = int(im.width * s), int(im.height * s)
            sp = im.resize((max(1, w), max(1, h)), Image.BILINEAR).rotate(-4 * (1 - min(1.0, b / 0.3)) + 3, expand=True, resample=Image.BILINEAR)
            a = sp.getchannel("A").point(lambda v: int(v * alpha))
            img.paste(sp, (int(cx - sp.width / 2), int(cy - sp.height / 2)), a)
            return 1
    return 0


def draw_hud(img, t, st, u):
    d = ImageDraw.Draw(img, "RGBA")
    m = size_at(t)
    num, unit = fmt_size(m)
    _, unit_prev = fmt_size(size_at(max(0, t - 0.25)))
    pop = 1.25 if unit != unit_prev else 1.0
    col = UNIT_COL[unit]
    cx, cy, r = 122, 132, 100
    d.ellipse((cx - r + 4, cy - r + 7, cx + r + 4, cy + r + 7), fill=(0, 0, 0, 110))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(18, 16, 48, 225), outline=(255, 255, 255, 235), width=4)
    lg = math.log10(max(1e-3, m))
    rain = [(255, 90, 90), (255, 170, 60), (255, 235, 80), (110, 230, 110), (80, 200, 255), (170, 120, 255)]
    for j in range(30):
        a = j * TAU2 / 30 + lg * 1.4
        c = rain[j % 6]
        r0, r1 = r - 14, r - 4
        d.line((cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a) * r1, cy + math.sin(a) * r1), fill=c + (255,), width=5)
    frac = (lg * 0.45) % 1
    d.arc((cx - r + 20, cy - r + 20, cx + r - 20, cy + r - 20), -90, -90 + 360 * frac, fill=col + (255,), width=6)
    text_o(d, (cx, cy - 46), "ポイ", 22, (255, 255, 255), stroke=4)
    nsz = 58 if len(num) <= 4 else 46 if len(num) <= 6 else 38
    text_o(d, (cx, cy + 6), num, nsz * pop, col, stroke=6, sfill=(10, 5, 30))
    text_o(d, (cx, cy + 52), unit, 34 * pop, (255, 255, 255), stroke=5, sfill=(10, 5, 30))
    # 何をすくっているか
    if not (st["key"] == "reveal" and u < 1.0):
        text_o(d, (cx, cy + r + 30), st["tag"] + ("" if st["key"] == "reveal" else "をすくう"), 26, (255, 255, 255), stroke=5)
    # 得点
    sc = SCORE[min(NF, int(round(t * FPS)))]
    text_o(d, (W - 24, 58), "すくった数", 24, (255, 255, 255), stroke=5, anchor="rm")
    text_o(d, (W - 24, 112), fmt_jp(sc), 56, (255, 225, 70), stroke=7, anchor="rm", sfill=(60, 20, 10))


def draw_caption(img, lines, y0, size=62, cols=None, alpha=255, pop=1.0):
    d = ImageDraw.Draw(img, "RGBA")
    for i, ln in enumerate(lines):
        c = (cols or [(255, 255, 255)] * len(lines))[i]
        text_o(d, (360, y0 + i * size * 1.22 * pop), ln, size * pop, c, stroke=9, sfill=(20, 10, 45), alpha=alpha)


# ---------------------------------------------------------------- 合成
def pull_compose(st, u, img):
    k = st["idx"]
    tau = warp(st, u)
    e = ease(u / st["P"])
    px, py, R, _ = poi_state(st, tau)
    z0 = DIAG / R
    z = z0 ** (1 - e)
    ps = (lerp(360, px, e), lerp(640, py, e))
    outer = img.transform((W, H), Image.AFFINE, (1 / z, 0, px - ps[0] / z, 0, 1 / z, py - ps[1] / z), Image.BILINEAR)
    d = ImageDraw.Draw(outer, "RGBA")
    gl = Image.new("RGB", (W // 2, H // 2), 0)
    g = ImageDraw.Draw(gl)
    Rz = R * z
    if Rz < 1400:
        draw_poi(outer, d, g, ps[0], ps[1], Rz, ring=False, handle=False, paper=0.5)
    prev = prev_final(k - 1)
    kz = Rz / DIAG
    pw, ph = max(2, int(W * kz)), max(2, int(H * kz))
    small = prev.resize((pw, ph), Image.BILINEAR) if kz < 0.999 else prev
    mr = min(Rz * lerp(1.0, 0.6, e), lerp(Rz, pw * 0.5, ease(e * 2.5)))  # 早めに丸くして「写真の四角」に見せない
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).ellipse((pw / 2 - mr, ph / 2 - mr, pw / 2 + mr, ph / 2 + mr), fill=255)
    outer.paste(small, (int(ps[0] - pw / 2), int(ps[1] - ph / 2)), mask.filter(ImageFilter.GaussianBlur(1.5)))
    if Rz < 1400:
        draw_poi(outer, d, g, ps[0], ps[1], Rz, paper_on=False)
    arr = np.asarray(outer, np.float32) + np.asarray(gl.filter(ImageFilter.GaussianBlur(6)).resize((W, H)), np.float32)
    # 引きの勢い：放射状の線
    out = to_img(arr)
    d = ImageDraw.Draw(out, "RGBA")
    if 0.05 < e < 0.95:
        rng = np.random.default_rng(int(u * 1000))
        for _ in range(40):
            a = rng.uniform(0, TAU2)
            r0 = rng.uniform(380, 700)
            d.line((ps[0] + math.cos(a) * r0, ps[1] + math.sin(a) * r0, ps[0] + math.cos(a) * (r0 + 160),
                    ps[1] + math.sin(a) * (r0 + 160)), fill=(255, 255, 255, 90), width=2)
    return out


def shake_amp(t):
    a = 0.0
    for st in STAGES[:6]:
        tf = st["S"] + st["F"]
        if t >= tf:
            a += 20 * math.exp(-(t - tf) / 0.16)
        tl = st["S"] + st["L0"]
        if t >= tl:
            a += 7 * math.exp(-(t - tl) / 0.12)
        if st["S"] + st["P"] <= t < st["S"] + st["L0"]:
            a += 2.0
    return a


def frame_img(f, want_counts=False):
    t = f / FPS
    st, u = locate(t)
    tau = warp(st, u)
    pull = st["idx"] >= 1 and u < st["P"]
    img, counts = render_world(st, u, pull=pull)
    if pull:
        img = pull_compose(st, u, img)
    counts["numbers"] = draw_numbers(img, st, tau)
    arr = np.asarray(img, np.float32) * VIG
    img = to_img(arr)
    # スローモーの寄りと揺れ
    zf = 1.0
    if st["L1"] <= u < st["F"]:
        zf = 1 + 0.09 * ease((u - st["L1"]) / (st["F"] - st["L1"]))
    elif st["F"] <= u < st["F"] + 0.2:
        zf = 1 + 0.09 * (1 - ease_out((u - st["F"]) / 0.2))
    A = shake_amp(t)
    if zf > 1.0001 or A > 0.3:
        px, py, _, _ = poi_state(st, tau)
        dx = A * (math.sin(t * 91) + 0.5 * math.sin(t * 173 + 1))
        dy = A * (math.cos(t * 83) + 0.5 * math.sin(t * 151 + 2))
        z = zf * (1 + (abs(dx) + abs(dy)) / 300)
        c = (lerp(360, px, 0.6), lerp(640, py, 0.6))
        img = img.transform((W, H), Image.AFFINE, (1 / z, 0, c[0] - (c[0] + dx) / z, 0, 1 / z, c[1] - (c[1] + dy) / z), Image.BILINEAR)
    # 白フラッシュ
    for s2 in STAGES[:6]:
        b = t - (s2["S"] + s2["F"])
        if -0.5 / FPS <= b < 0.3:
            a = 0.95 if b < 0.5 / FPS else 0.85 * math.exp(-b / 0.07)
            img = Image.blend(img, Image.new("RGB", (W, H), (255, 252, 240)), a)
    counts["banner"] = draw_banner(img, t)
    draw_hud(img, t, st, u)
    if t < 1.72:
        draw_caption(img, ["金魚すくいを", "極めていくと…"], 300, 64, [(255, 255, 255), (255, 225, 70)])
    if st["key"] == "reveal":
        d = ImageDraw.Draw(img, "RGBA")
        if u < 1.0:
            draw_caption(img, ["さらに引くと……"], 300, 58, alpha=int(255 * (1 - ease((u - 0.8) / 0.2))))
        for i, p in enumerate(PLANET_FISH):
            b = u - (1.05 + 0.16 * i)
            if b >= 0:
                x, y = planet_pos(p, tau)
                s = back(b / 0.25)
                yy = y + p[3] * 0.3 + 26
                x = x + p[6] * 0.1 * p[3]
                lab = p[0]
                f = font(32 * s)
                tw = d.textlength(lab, font=f)
                d.rounded_rectangle((x - tw / 2 - 16, yy - 22 * s, x + tw / 2 + 16, yy + 22 * s), radius=int(20 * s),
                                    fill=(10, 15, 40, 200), outline=PLANET_GLOW[p[1]] + (255,), width=3)
                d.text((x, yy), lab, font=f, anchor="mm", fill=(255, 255, 255, 255))
        if u >= 2.05:
            b = u - 2.05
            pop = back(b / 0.3)
            if pop > 0.05:
                band = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
                bd = ImageDraw.Draw(band)
                for yy in range(260):
                    bd.line((0, yy, W, yy), fill=(5, 5, 20, int(170 * math.sin(math.pi * yy / 260))))
                img.paste(band, (0, 1060), band)
                draw_caption(img, ["最初のたらいの金魚、", "ぜんぶ惑星だった。"], 1140, 56, [(255, 255, 255), (255, 225, 70)], pop=pop)
    if want_counts:
        return img, counts
    return img


def frame_bytes(f):
    return frame_img(f).tobytes()


# ---------------------------------------------------------------- 実行
KEYS = {"00_hook": 0, "01_tub": 30, "02_tub_flash": 54, "03_pond": 93, "04_sea": 150, "05_continent": 205,
        "06_earth": 264, "07_galaxy": 318, "08_reveal_mid": 390, "09_reveal_end": 449}


def preview(tag):
    od = os.path.join(OUT, "preview_" + tag)
    os.makedirs(od, exist_ok=True)
    t0 = time.time()
    for name, f in KEYS.items():
        img, c = frame_img(f, True)
        img.save(os.path.join(od, f"{name}_f{f:03d}.png"))
        print(name, f, c, flush=True)
    print("preview %.1fs" % (time.time() - t0))


def render(mp4name="story15_v3_9x16.mp4", kdir="keyframes"):
    import multiprocessing as mp
    import imageio_ffmpeg
    path = os.path.join(OUT, mp4name)
    t0 = time.time()
    wr = imageio_ffmpeg.write_frames(path, (W, H), fps=FPS, codec="libx264", pix_fmt_out="yuv420p", quality=8,
                                     macro_block_size=8)
    wr.send(None)
    with mp.Pool(min(20, os.cpu_count() or 4)) as pool:
        for i, b in enumerate(pool.imap(frame_bytes, range(NF), chunksize=3)):
            wr.send(b)
            if i % 50 == 0:
                print("frame", i, "%.1fs" % (time.time() - t0), flush=True)
    wr.close()
    nfr, secs = imageio_ffmpeg.count_frames_and_secs(path)
    print("wrote", path, "frames", nfr, "secs", secs, "render %.1fs" % (time.time() - t0))
    assert nfr == NF, nfr
    kd = os.path.join(OUT, kdir)
    os.makedirs(kd, exist_ok=True)
    for name, f in KEYS.items():
        img, c = frame_img(f, True)
        img.save(os.path.join(kd, f"{name}.png"))
        print(name, c)


def compare(tag):
    pairs = [("gemini-2026-11-07/01_festival.png", "01_tub", 30), ("gemini-2026-11-07/02_continent.png", "05_continent", 205),
             ("gemini-2026-11-07/03_earth.png", "06_earth", 264), ("gemini-2026-11-07/04_galaxy.png", "07_galaxy", 318),
             ("gemini-2026-11-07/05_reveal.png", "09_reveal_end", 449), ("refs-2026-11-07/vampire_2.jpg", "04_sea", 150)]
    for ref, name, f in pairs:
        a = Image.open(os.path.join(ROOT, "docs", "concepts", ref)).convert("RGB")
        b = frame_img(f)
        hh = 900
        a = a.resize((int(a.width * hh / a.height), hh))
        b = b.resize((int(b.width * hh / b.height), hh))
        im = Image.new("RGB", (a.width + b.width + 30, hh + 60), (16, 16, 22))
        im.paste(a, (0, 60))
        im.paste(b, (a.width + 30, 60))
        d = ImageDraw.Draw(im)
        d.text((10, 30), "参照: " + ref, font=font(28, 500), fill=(255, 255, 255), anchor="lm")
        d.text((a.width + 40, 30), f"v3 {tag}: {name} (f{f})", font=font(28, 500), fill=(255, 255, 255), anchor="lm")
        im.save(os.path.join(OUT, f"compare_{tag}_{name}.png"))
        print("compare", name)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "preview"
    if cmd == "preview":
        preview(sys.argv[2] if len(sys.argv) > 2 else "p")
    elif cmd == "render":
        render(*sys.argv[2:4])  # 例: render story15_v3_r5_9x16.mp4 keyframes_r5
    elif cmd == "compare":
        compare(sys.argv[2] if len(sys.argv) > 2 else "r1")
