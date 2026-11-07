"""Steam の公式予告編（HLS）から、最初の数秒を一定間隔で切り出して一覧にする（社内の見比べ用）。

使い方: python tools/concepts/trailer_frames.py <出力フォルダ> [秒数=15] [間隔=0.5]
"""
import json
import os
import subprocess
import sys
import urllib.request

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
SECS = float(sys.argv[2]) if len(sys.argv) > 2 else 15.0
STEP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
GAMES = {
    "nodebuster": 3107330,
    "blackhole": 3694480,
    "vampire": 1794680,
    "balatro": 2379780,
    "digging": 3244220,
    "bills": 4421010,
}
FF = imageio_ffmpeg.get_ffmpeg_exe()
FONT = ImageFont.truetype("C:/Windows/Fonts/YuGothB.ttc", 22)


def hls_url(appid):
    req = urllib.request.Request(
        f"https://store.steampowered.com/api/appdetails?appids={appid}&filters=movies",
        headers={"User-Agent": "Mozilla/5.0 (concept-reference)"},
    )
    d = json.loads(urllib.request.urlopen(req, timeout=30).read())[str(appid)]["data"]
    movies = d.get("movies", [])
    if not movies:
        return None, None
    m = movies[0]
    return m.get("hls_h264"), m.get("name")


def sheet(frames, path, cols=6, w=320):
    ims = [Image.open(f).convert("RGB") for f in frames]
    h = int(w * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    s = Image.new("RGB", (cols * w, rows * (h + 26)), (15, 15, 18))
    d = ImageDraw.Draw(s)
    for i, (im, f) in enumerate(zip(ims, frames)):
        x, y = (i % cols) * w, (i // cols) * (h + 26)
        s.paste(im.resize((w - 4, h - 4)), (x + 2, y + 2))
        d.text((x + 6, y + h), os.path.basename(f).replace(".png", ""), font=FONT, fill=(230, 230, 230))
    s.save(path)


for name, appid in GAMES.items():
    url, title = hls_url(appid)
    if not url:
        print("ng", name, "no movie")
        continue
    gdir = os.path.join(OUT, name)
    os.makedirs(gdir, exist_ok=True)
    pattern = os.path.join(gdir, "t%03d.png")
    cmd = [FF, "-y", "-loglevel", "error", "-i", url, "-t", str(SECS), "-vf", f"fps={1/STEP},scale=640:-2", pattern]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    files = sorted(f for f in os.listdir(gdir) if f.startswith("t") and f.endswith(".png"))
    named = []
    for i, f in enumerate(files):
        new = os.path.join(gdir, f"{i * STEP:05.1f}s.png")
        os.replace(os.path.join(gdir, f), new)
        named.append(new)
    if named:
        sheet(named, os.path.join(OUT, f"{name}_first{int(SECS)}s.png"))
    print("ok" if named else "ng", name, title, len(named), r.stderr[-200:] if r.returncode else "")
