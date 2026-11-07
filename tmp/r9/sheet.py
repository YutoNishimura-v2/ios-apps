"""画像を縮小して横に並べる。usage: python tmp/r9/sheet.py out.png a.png b.png ..."""
import sys
from PIL import Image
ims = [Image.open(p).convert("RGB") for p in sys.argv[2:]]
w = 300
ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
h = max(im.height for im in ims)
sh = Image.new("RGB", (cols * w, rows * h), "white")
for i, im in enumerate(ims):
    sh.paste(im, ((i % cols) * w, (i // cols) * h))
sh.save(sys.argv[1])
