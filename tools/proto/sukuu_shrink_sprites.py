"""Write small copies of the sukuu sprite PNGs into assets/s/.

The originals are 1024-1536 px and about 2 MB each. The game only draws
them at most SPRITE_MAX px, so loading the originals wastes time and makes
the art arrive late (the critic's r13 run drew Kin with the code fallback).
"""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parents[2] / "proto" / "sukuu-html5" / "assets"
OUT = ASSETS / "s"

# Must match SPRITE_MAX in game.js (default 384).
SPRITE_MAX: dict[str, int] = {
    "kingyo_body": 192, "demekin_body": 192, "demekin_red_body": 192,
    "sp_tai": 192, "sp_kame": 256, "sp_whale": 512, "kin_body": 512,
    "kin_tail": 384, "sp_koi": 384, "sp_bigkoi": 512,
}
SPRITES = [
    "isl_small", "isl_small2", "isl_small3", "isl_small4", "isl_small5",
    "isl_volcano", "isl_big", "isl_continent", "sp_galaxy", "sp_nebula",
    "sp_planet", "sp_sun", "sp_whale", "kin_body", "kingyo_body",
    "demekin_body", "demekin_red_body", "kin_tail", "sp_koi", "sp_bigkoi",
    "sp_tai", "sp_kame",
]


def shrink(name: str) -> tuple[int, int]:
    """Shrink one sprite to the size the game keeps in memory and return sizes in bytes."""
    src = ASSETS / f"{name}.png"
    dst = OUT / f"{name}.png"
    im = Image.open(src).convert("RGBA")
    side = SPRITE_MAX.get(name, 384)
    scale = min(1.0, side / max(im.size))
    if scale < 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(dst, optimize=True)
    return src.stat().st_size, dst.stat().st_size


def main() -> None:
    """Shrink every sprite and print the size change."""
    OUT.mkdir(exist_ok=True)
    total_before = total_after = 0
    for name in SPRITES:
        before, after = shrink(name)
        total_before += before
        total_after += after
        print(f"{name}: {before // 1024} KB -> {after // 1024} KB")
    print(f"total: {total_before // 1024} KB -> {total_after // 1024} KB")


if __name__ == "__main__":
    main()
