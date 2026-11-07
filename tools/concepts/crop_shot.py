"""スクリーンショットから画像の部分だけを切り出す。

使い方: python tools/concepts/crop_shot.py <元png> <出力png> [x0 y0 x1 y1]
座標を省くと、Gemini の拡大表示（暗い背景の中央に画像）を自動で探す：
明るさの変化が大きい行・列の範囲を画像とみなす。
"""
import sys

from PIL import Image, ImageFilter, ImageStat

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
if len(sys.argv) >= 7:
    box = tuple(int(v) for v in sys.argv[3:7])
else:
    g = im.convert("L").filter(ImageFilter.FIND_EDGES)
    w, h = g.size
    top_skip = 110  # 上のボタン列を除く
    rows = [ImageStat.Stat(g.crop((0, y, w, y + 1))).mean[0] for y in range(h)]
    cols = [ImageStat.Stat(g.crop((x, top_skip, x + 1, h - 1))).mean[0] for x in range(w)]
    ys = [y for y in range(top_skip, h) if rows[y] > 6]
    xs = [x for x in range(w) if cols[x] > 6]
    box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
crop = im.crop(box)
crop.save(out)
print("box", box, "size", crop.size)
