#!/usr/bin/env python3
"""Build every raster asset of the Columbina theme from the source material.

Inputs (not shipped, see ``.assets-src/``):

* ``background-source.png`` — the 622x350 illustration supplied by the user.
* ``hero-frame.png`` — a 1920x1080 still decoded from the source wallpaper
  video, used for the opening plate.

Outputs land in ``dsh-theme-columbina/assets/``:

* ``background.webp``  — 2560x1440 graded canvas for the application window.
* ``opening-art.webp`` — 2560x1440 plate for the cinematic opening.
* ``icon.png``         — 256x256 sidebar badge (an original moon sigil).
* ``ornament-*.png``   — six small original glyphs for the sidebar rows.

The grading is deliberately conservative: the supplied picture stays
recognisable, it is only pushed towards the theme's night palette and given a
grain/star pass so a 622px source can fill a 2560px window without reading as
an upscaled thumbnail.
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".assets-src"
OUT = ROOT / "dsh-theme-columbina" / "assets"

NIGHT = (7, 11, 24)
ICE = (159, 216, 245)
LILAC = (200, 183, 238)
MOON = (233, 240, 255)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Scale and crop so the image fills ``size`` without distortion."""
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def starfield(size: tuple[int, int], count: int, seed: int) -> Image.Image:
    """A transparent layer of soft stars, denser towards the top left."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(seed)
    w, h = size
    for _ in range(count):
        x = rng.random() ** 1.25 * w
        y = rng.random() ** 1.1 * h
        bias = 1.0 - (x / w) * 0.55
        if rng.random() > bias:
            continue
        radius = rng.choice([0.9, 1.1, 1.4, 1.9, 2.6]) * (w / 2560)
        alpha = rng.randint(40, 190)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*MOON, alpha))
    glow = layer.filter(ImageFilter.GaussianBlur(3.2))
    return Image.alpha_composite(glow, layer)


def grain(size: tuple[int, int], seed: int, strength: int = 7) -> Image.Image:
    """Monochrome noise used in soft-light to hide upscaling."""
    rng = random.Random(seed)
    w, h = size
    small = Image.new("L", (w // 2, h // 2))
    small.putdata([128 + rng.randint(-strength, strength) for _ in range((w // 2) * (h // 2))])
    return small.resize(size, Image.BILINEAR).convert("RGB")


def grade(image: Image.Image, warm: float = 0.0) -> Image.Image:
    """Push a picture towards deep night blue while keeping its light values."""
    rgb = image.convert("RGB")
    # Slight lift of the blue channel and pull-down of red: moonlight, not daylight.
    r, g, b = rgb.split()
    r = r.point(lambda v: int(v * (0.86 + warm)))
    g = g.point(lambda v: int(v * (0.93 + warm * 0.4)))
    b = b.point(lambda v: min(255, int(v * 1.04)))
    graded = Image.merge("RGB", (r, g, b))
    # Blend a night wash into the shadows only.
    night = Image.new("RGB", graded.size, NIGHT)
    mask = graded.convert("L").point(lambda v: max(0, 120 - v))
    return Image.composite(night, graded, mask.point(lambda v: int(v * 0.55)))


def vignette(size: tuple[int, int], strength: float = 0.55) -> Image.Image:
    """Radial darkening as an RGBA layer, strongest in the corners."""
    w, h = size
    mask = Image.new("L", (w // 4, h // 4), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((-w // 8, -h // 10, w // 4 + w // 8, h // 4 + h // 10), fill=255)
    mask = mask.resize(size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(w / 40))
    alpha = ImageChops.invert(mask).point(lambda v: int(v * strength))
    layer = Image.new("RGBA", size, (*NIGHT, 0))
    layer.putalpha(alpha)
    return layer


def build_background() -> None:
    source = Image.open(SRC / "background-source.png").convert("RGB")
    plate = cover(source, (2560, 1440))
    plate = plate.filter(ImageFilter.GaussianBlur(0.6)).filter(
        ImageFilter.UnsharpMask(radius=2.4, percent=72, threshold=2)
    )
    plate = grade(plate, warm=0.02)
    plate = Image.blend(plate, plate.filter(ImageFilter.GaussianBlur(1.4)), 0.22)
    art = plate.convert("RGBA")
    art = Image.alpha_composite(art, starfield((2560, 1440), 900, 11))
    art = Image.alpha_composite(art, vignette((2560, 1440), 0.62))
    rgb = art.convert("RGB")
    rgb = ImageChops.soft_light(rgb, grain((2560, 1440), 5))
    rgb.save(OUT / "background.webp", "WEBP", quality=88, method=6)
    rgb.resize((1280, 720), Image.LANCZOS).save(OUT / "background-1280.webp", "WEBP", quality=86, method=6)
    print("background.webp", (OUT / "background.webp").stat().st_size)


def build_opening_art() -> None:
    plate = Image.open(SRC / "hero-frame.png").convert("RGB")
    plate = cover(plate, (2560, 1440))
    plate = grade(plate, warm=0.0)
    plate = plate.filter(ImageFilter.UnsharpMask(radius=2.0, percent=60, threshold=3))
    art = plate.convert("RGBA")
    art = Image.alpha_composite(art, starfield((2560, 1440), 500, 23))
    art = Image.alpha_composite(art, vignette((2560, 1440), 0.45))
    art.convert("RGB").save(OUT / "opening-art.webp", "WEBP", quality=86, method=6)
    print("opening-art.webp", (OUT / "opening-art.webp").stat().st_size)


def build_poster() -> None:
    """A 1280x720 still for the README and the release page."""
    plate = Image.open(SRC / "hero-frame.png").convert("RGB")
    plate = cover(plate, (1280, 720))
    plate = grade(plate)
    plate.save(ROOT / "docs" / "opening-poster.png")
    print("opening-poster.png")


def moon_sigil(size: int = 512) -> Image.Image:
    """An original crescent badge: a night disc with the moon and one star."""
    scale = 4
    edge = size * scale
    center = edge / 2
    radius = edge * 0.46
    canvas = Image.new("RGBA", (edge, edge), (0, 0, 0, 0))

    disc = Image.new("RGBA", (edge, edge), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse(
        (center - radius, center - radius, center + radius, center + radius), fill=(9, 15, 32, 255)
    )
    canvas = Image.alpha_composite(canvas, disc)

    glow = Image.new("RGBA", (edge, edge), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        (center - radius * 0.92, center - radius * 0.95, center + radius * 0.85, center + radius * 0.7),
        fill=(96, 128, 200, 110),
    )
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(edge * 0.055)))

    draw = ImageDraw.Draw(canvas)
    draw.ellipse(
        (center - radius, center - radius, center + radius, center + radius),
        outline=(203, 182, 238, 120),
        width=max(1, int(edge * 0.008)),
    )

    # Crescent: a disc with a second, offset disc punched out of it.
    moon_radius = edge * 0.255
    body = Image.new("L", (edge, edge), 0)
    ImageDraw.Draw(body).ellipse(
        (center - moon_radius, center - moon_radius, center + moon_radius, center + moon_radius), fill=255
    )
    bite = Image.new("L", (edge, edge), 0)
    offset_x = moon_radius * 0.42
    offset_y = -moon_radius * 0.5
    ImageDraw.Draw(bite).ellipse(
        (
            center - moon_radius + offset_x,
            center - moon_radius + offset_y,
            center + moon_radius + offset_x,
            center + moon_radius + offset_y,
        ),
        fill=255,
    )
    canvas = Image.composite(Image.new("RGBA", (edge, edge), (238, 243, 255, 255)), canvas, ImageChops.subtract(body, bite))

    draw = ImageDraw.Draw(canvas)
    star_x = center + moon_radius * 0.72
    star_y = center - moon_radius * 0.78
    draw_star(draw, star_x, star_y, edge * 0.075, (159, 216, 245, 245), 4)
    draw_star(draw, star_x + edge * 0.055, star_y + edge * 0.10, edge * 0.032, (233, 238, 255, 200), 4)
    return canvas.resize((size, size), Image.LANCZOS)


def ornament(name: str, layer_fn, size: int = 128) -> None:
    scale = 4
    canvas = layer_fn(size * scale)
    canvas = canvas.resize((size, size), Image.LANCZOS)
    canvas.save(OUT / f"ornament-{name}.png")
    print(f"ornament-{name}.png")


def draw_star(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, colour, points: int = 4) -> None:
    pts = []
    for index in range(points * 2):
        radius = r if index % 2 == 0 else r * 0.24
        angle = math.pi * index / points - math.pi / 2
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(pts, fill=colour)


def draw_note(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, colour) -> None:
    """A quaver: head, stem, flag."""
    draw.ellipse((cx - r, cy - r * 0.72, cx + r, cy + r * 0.72), fill=colour)
    draw.rectangle((cx + r * 0.72, cy - r * 3.1, cx + r * 1.02, cy - r * 0.2), fill=colour)
    draw.arc((cx + r * 0.2, cy - r * 3.3, cx + r * 2.0, cy - r * 1.6), 200, 330, fill=colour, width=int(r * 0.34))


def build_icons() -> None:
    sigil = moon_sigil(256)
    sigil.save(OUT / "icon.png")
    print("icon.png")

    def moon(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        c, r = s / 2, s * 0.34
        disc = Image.new("L", (s, s), 0)
        ImageDraw.Draw(disc).ellipse((c - r, c - r, c + r, c + r), fill=255)
        hole = Image.new("L", (s, s), 0)
        ImageDraw.Draw(hole).ellipse((c - r * 0.55, c - r * 1.15, c + r * 1.35, c + r * 0.45), fill=255)
        layer.paste(Image.new("RGBA", (s, s), (*MOON, 240)), (0, 0), ImageChops.subtract(disc, hole))
        return layer

    def star(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        draw_star(draw, s / 2, s / 2, s * 0.36, (*MOON, 240), 4)
        draw_star(draw, s * 0.74, s * 0.28, s * 0.10, (*ICE, 200), 4)
        return layer

    def feather(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        draw.arc((s * 0.18, s * 0.10, s * 0.84, s * 0.92), 300, 120, fill=(*MOON, 235), width=int(s * 0.055))
        draw.line((s * 0.30, s * 0.82, s * 0.72, s * 0.24), fill=(*MOON, 235), width=int(s * 0.035))
        for t in (0.35, 0.5, 0.65):
            x = s * (0.30 + 0.42 * t)
            y = s * (0.82 - 0.58 * t)
            draw.line((x, y, x - s * 0.14, y - s * 0.06), fill=(*ICE, 170), width=int(s * 0.022))
            draw.line((x, y, x + s * 0.10, y - s * 0.16), fill=(*ICE, 170), width=int(s * 0.022))
        return layer

    def flower(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        c = s / 2
        for index in range(5):
            angle = -math.pi / 2 + index * 2 * math.pi / 5
            px, py = c + math.cos(angle) * s * 0.17, c + math.sin(angle) * s * 0.17
            draw.ellipse((px - s * 0.13, py - s * 0.13, px + s * 0.13, py + s * 0.13), fill=(*LILAC, 190))
        draw.ellipse((c - s * 0.09, c - s * 0.09, c + s * 0.09, c + s * 0.09), fill=(*MOON, 240))
        return layer

    def bell(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        draw.arc((s * 0.22, s * 0.16, s * 0.78, s * 0.84), 180, 360, fill=(*MOON, 235), width=int(s * 0.045))
        draw.line((s * 0.22, s * 0.50, s * 0.22, s * 0.72), fill=(*MOON, 235), width=int(s * 0.045))
        draw.line((s * 0.78, s * 0.50, s * 0.78, s * 0.72), fill=(*MOON, 235), width=int(s * 0.045))
        draw.line((s * 0.18, s * 0.72, s * 0.82, s * 0.72), fill=(*MOON, 235), width=int(s * 0.045))
        draw.ellipse((s * 0.46, s * 0.76, s * 0.54, s * 0.84), fill=(*ICE, 220))
        return layer

    def cradle(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        draw.arc((s * 0.14, s * 0.26, s * 0.86, s * 0.92), 180, 360, fill=(*MOON, 230), width=int(s * 0.042))
        for t in (0.25, 0.45, 0.65, 0.85):
            draw.line((s * t, s * 0.50, s * t, s * 0.80), fill=(*ICE, 150), width=int(s * 0.02))
        draw.line((s * 0.12, s * 0.82, s * 0.88, s * 0.82), fill=(*MOON, 200), width=int(s * 0.03))
        return layer

    def note(s):
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        draw_note(draw, s * 0.46, s * 0.64, s * 0.13, (*MOON, 235))
        return layer

    for name, fn in (("moon", moon), ("star", star), ("feather", feather),
                     ("flower", flower), ("bell", bell), ("cradle", cradle), ("note", note)):
        ornament(name, fn)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="all")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    (ROOT / "docs").mkdir(exist_ok=True)
    if args.only in ("all", "background"):
        build_background()
    if args.only in ("all", "art"):
        build_opening_art()
        build_poster()
    if args.only in ("all", "icons"):
        build_icons()


if __name__ == "__main__":
    main()
