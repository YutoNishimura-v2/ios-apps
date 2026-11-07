"""画像を格子に並べた一覧画像を作る（見比べ用）。

使い方: python tools/concepts/contact_sheet.py <出力png> <列数> <セル幅> <画像...>
各セルの下にファイル名を書く。縦長・横長は縦横比を保って収める。
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

out, cols, cell_w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
paths = sys.argv[4:]
cell_h = int(cell_w * 0.62)
label_h = 30
rows = (len(paths) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell_w, rows * (cell_h + label_h)), (20, 20, 24))
font = ImageFont.truetype("C:/Windows/Fonts/YuGothM.ttc", 20)
d = ImageDraw.Draw(sheet)
for i, p in enumerate(paths):
    im = Image.open(p).convert("RGB")
    im.thumbnail((cell_w - 8, cell_h - 8))
    x = (i % cols) * cell_w
    y = (i // cols) * (cell_h + label_h)
    sheet.paste(im, (x + (cell_w - im.width) // 2, y + (cell_h - im.height) // 2))
    d.text((x + 8, y + cell_h + 4), os.path.basename(p), font=font, fill=(230, 230, 230))
sheet.save(out)
print("wrote", out, sheet.size)
