"""Render the promo's title card, lower-thirds and end card."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".assets-src" / "cards"
OUT.mkdir(parents=True, exist_ok=True)
ART = ROOT / ".assets-src" / "frames" / "f10.00.png"

W, H = 1920, 1080
LILAC = (203, 182, 238)
ICE = (159, 216, 245)
MOON = (240, 245, 255)
DIM = (168, 178, 210)
NIGHT = (7, 11, 24)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ["msyhbd.ttc", "msyh.ttc"] if bold else ["msyh.ttc", "simhei.ttf"]
    for name in names:
        path = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", name)
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def spaced(draw: ImageDraw.ImageDraw, xy, text: str, face, fill, spacing: float, anchor_left=True) -> None:
    """Draw letter-spaced text (Pillow has no tracking)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=face, fill=fill)
        x += draw.textlength(ch, font=face) + spacing


def base_art() -> Image.Image:
    art = Image.open(ART).convert("RGB").resize((W, H), Image.LANCZOS)
    veil = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(veil)
    # Left-to-right scrim so the text block sits on near-black.
    for x in range(W):
        if x < 900:
            alpha = 232
        else:
            alpha = int(232 * max(0.0, 1 - (x - 900) / 760) ** 1.5)
        d.line([(x, 0), (x, H)], fill=(5, 9, 20, alpha))
    d.rectangle((0, 0, W, H), fill=(5, 9, 20, 46))
    return Image.alpha_composite(art.convert("RGBA"), veil)


def title_card() -> None:
    im = base_art()
    d = ImageDraw.Draw(im)
    d.rectangle((102, 92, 104, 968), fill=(*LILAC, 210))
    spaced(d, (136, 96), "COLUMBINA  //  DSH THEME", font(15), (*LILAC, 230), 3.2)
    d.text((134, 596), "哥伦比娅 · 月下摇篮", font=font(74), fill=(*MOON, 255))
    d.text((138, 706), "DeepSeek Harness 主题 · v1.0.0", font=font(27), fill=(*LILAC, 235))
    d.text((140, 762), "月牙开屏  /  三首摇篮曲  /  少女语气", font=font(23), fill=(220, 228, 248, 225))
    d.text((138, 900), "github.com/Touhouywn/dsh-theme-columbina", font=font(17), fill=(140, 152, 186, 220))
    im.convert("RGB").save(OUT / "title.png")


def lower_third(name: str, big: str, sub: str, tag: str) -> None:
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Bottom scrim so the caption reads over the artwork.
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    for y in range(H - 420, H):
        alpha = int(190 * ((y - (H - 420)) / 420) ** 1.4)
        sd.line([(0, y), (W, y)], fill=(5, 9, 20, alpha))
    im = Image.alpha_composite(im, scrim)
    d = ImageDraw.Draw(im)
    d.rectangle((102, 792, 104, 968), fill=(*LILAC, 225))
    d.text((136, 800), big, font=font(46), fill=(*MOON, 255))
    d.text((140, 872), sub, font=font(21), fill=(214, 223, 245, 230))
    spaced(d, (142, 916), tag, font(14), (*LILAC, 210), 3.0)
    im.save(OUT / f"{name}.png")


def end_card() -> None:
    im = Image.new("RGBA", (W, H), (*NIGHT, 255))
    # A faint moon disc and stars, drawn from scratch.
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W - 620, -220, W + 220, 620), fill=(120, 150, 210, 60))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(120)))
    d = ImageDraw.Draw(im)
    d.ellipse((W - 470, 120, W - 250, 340), outline=(*LILAC, 90), width=2)
    d.ellipse((W - 430, 160, W - 290, 300), fill=(*MOON, 26))
    # The theme's own moon badge, enlarged, with a soft halo behind it.
    badge = Image.open(ROOT / "dsh-theme-columbina" / "assets" / "icon.png").convert("RGBA")
    badge = badge.resize((320, 320), Image.LANCZOS)
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse((W - 540, 80, W - 180, 440), fill=(150, 180, 240, 70))
    im = Image.alpha_composite(im, halo.filter(ImageFilter.GaussianBlur(60)))
    im.alpha_composite(badge, (W - 540, 80))
    d = ImageDraw.Draw(im)
    d.rectangle((102, 300, 104, 780), fill=(*LILAC, 210))
    spaced(d, (136, 300), "INSTALL", font(15), (*LILAC, 225), 5.0)
    d.text((134, 356), "三步装好", font=font(64), fill=(*MOON, 255))
    d.text((138, 470), "pwsh -File .\\install.ps1", font=font(30), fill=(*ICE, 245))
    d.text((138, 536), "完整退出 DSH 再打开一次", font=font(23), fill=(214, 223, 245, 225))
    d.text((138, 600), "github.com/Touhouywn/dsh-theme-columbina", font=font(19), fill=(*LILAC, 220))
    d.text((138, 700), "代码 MIT  ·  三首摇篮曲版权归 HOYO-MiX", font=font(16), fill=(140, 152, 186, 215))
    d.text((138, 732), "非官方同人主题  ·  与 HoYoverse / DeepSeek 无隶属关系", font=font(16), fill=(140, 152, 186, 215))
    im.convert("RGB").save(OUT / "end.png")


if __name__ == "__main__":
    title_card()
    end_card()
    lower_third("lower-main", "月夜配色 · 玻璃侧栏 · 月下立绘", "真实主题界面（离线预览）", "TOKENS / PALETTE / ARTWORK")
    lower_third("lower-hub", "月下摇篮面板 · 三首摇篮曲 · 语气开关", "状态 / 开屏重播 / 播放器 / 语气", "HUB / DECK / PERSONA")
    print("cards:", [p.name for p in OUT.glob("*.png")])
