#!/usr/bin/env python3
"""Draw the site's icons and its link-preview image, in the 9 Sep 2026 design.

    python3 scripts/make-brand-images.py

Writes public/icon.png, icon-48.png, apple-icon.png, favicon.ico and og.png.

The old set was drawn for the letterpress design — beige paper, a boxed
lattice, a red serif 福 on a tinted tile. The site is now white paper, near
black ink, one lacquer red, Inter Tight for Latin and Noto Serif for
characters, so the icons and the preview card follow it.

The icon is a lacquer 福 — the same red the wordmark gives 福州 and "fuzhou"
— on a transparent ground, so a dark browser tab strip gets the character
rather than a white tile. It is set in the heaviest serif weight, because at
sixteen pixels a Bold one goes to mush.

Fonts. Inter Tight comes from the @fontsource package (the same faces the
site loads through next/font); Noto Serif CJK TC is a system font here. Point
INTER_DIR at a directory of InterTight-{400,600,700,800}.ttf.
"""

import os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(REPO, "public")
INTER_DIR = os.environ.get("INTER_DIR", "/tmp/fonts")
CJK = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
CJK_BLACK = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc"
CJK_TC = 3  # face index of Noto Serif CJK TC in these collections

PAPER = (255, 255, 255)
INK = (29, 29, 31)
INK_SOFT = (110, 110, 115)
INK_MUTE = (142, 142, 147)
LACQUER = (197, 49, 29)
RULE = (232, 232, 234)


def inter(weight, size):
    return ImageFont.truetype(os.path.join(INTER_DIR, f"InterTight-{weight}.ttf"), size)


def han(size, black=False):
    return ImageFont.truetype(CJK_BLACK if black else CJK, size, index=CJK_TC)


def tracked(draw, xy, runs, fill, tracking=0.0):
    """Draw a row of (text, font) runs letter by letter, with extra space
       between the letters — the eyebrow's wide tracking. Returns the x it
       ended at, so a caller can keep going."""
    x, y = xy
    for text, font in runs:
        # A serif character sits lower than Latin caps at the same size; the
        # small nudge puts the two on one optical line.
        dy = 1 if font.getname()[0].startswith("Noto") else 0
        for ch in text:
            draw.text((x, y + dy), ch, font=font, fill=fill)
            x += font.getlength(ch) + tracking
    return x


def icon(size, opaque=False):
    """The app icon: a lacquer 福, centred by its ink rather than by its box.

    Transparent behind the glyph, so a browser drawing it on a dark tab strip
    gets the character and not a white tile; `opaque` paints the paper back in
    for iOS, which composites a transparent home-screen icon onto black."""
    # 4x supersampling, so the glyph's curves stay clean at 48 and 16 pixels.
    s = size * 4
    im = Image.new("RGBA", (s, s), PAPER + (255,) if opaque else (255, 255, 255, 0))
    d = ImageDraw.Draw(im)
    f = han(int(s * 0.86), black=True)
    # The character's own bounding box, so the optical centre is what is
    # centred — a CJK glyph does not fill its em square evenly.
    l, t, r, b = d.textbbox((0, 0), "福", font=f)
    d.text(((s - (r - l)) / 2 - l, (s - (b - t)) / 2 - t), "福", font=f, fill=LACQUER)
    return im.resize((size, size), Image.LANCZOS)


def og():
    """The link preview: the home page's hero, at 1200x630."""
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)

    # One 福 standing in the right margin at 5% ink — the watermark from the
    # home page, and the icon's character, in the space the text leaves.
    mark = Image.new("RGB", (W, H), PAPER)
    md = ImageDraw.Draw(mark)
    mf = han(330)
    l, t, r, b = md.textbbox((0, 0), "福", font=mf)
    md.text((W - 56 - (r - l) - l, (H - (b - t)) / 2 - t), "福", font=mf, fill=INK)
    im = Image.blend(im, mark, 0.05)
    d = ImageDraw.Draw(im)

    x = 80
    lat, ser = inter(600, 15), han(15)
    tracked(
        d,
        (x, 92),
        [("FUZHOUNESE · ", lat), ("福州話", ser), (" · EASTERN MIN", lat)],
        INK_SOFT,
        2.4,
    )

    y = 150
    d.text((x, y), "Fuzhounese is fading.", font=inter(800, 74), fill=INK)
    d.text((x, y + 88), "Help keep it spoken.", font=inter(800, 74), fill=INK)

    lede = "A free, collaborative dictionary of the Fuzhou dialect,"
    lede2 = "with recordings from the people who speak it."
    d.text((x, y + 208), lede, font=inter(400, 27), fill=INK_SOFT)
    d.text((x, y + 246), lede2, font=inter(400, 27), fill=INK_SOFT)

    # The wordmark, two-tone as in the header: the place in lacquer, the rest
    # in ink.
    d.line([(x, H - 108), (W - x, H - 108)], fill=RULE, width=2)
    hf, wf = han(27), inter(600, 24)
    cx = x
    for part, fill in (("福州", LACQUER), ("話", INK)):
        d.text((cx, H - 78), part, font=hf, fill=fill)
        cx += d.textlength(part, font=hf)
    cx += 12
    for part, fill in (("fuzhou", LACQUER), ("nese.org", INK)):
        d.text((cx, H - 74), part, font=wf, fill=fill)
        cx += d.textlength(part, font=wf)
    right = "CC BY-SA 4.0"
    rf = inter(400, 20)
    d.text((W - x - d.textlength(right, font=rf), H - 71), right, font=rf, fill=INK_MUTE)
    return im


def main():
    icon(192).save(os.path.join(PUBLIC, "icon.png"))
    icon(48).save(os.path.join(PUBLIC, "icon-48.png"))
    icon(180, opaque=True).save(os.path.join(PUBLIC, "apple-icon.png"))
    # One .ico holding the three sizes a browser may ask for.
    icon(64).save(os.path.join(PUBLIC, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    og().save(os.path.join(PUBLIC, "og.png"))
    print("wrote icon.png, icon-48.png, apple-icon.png, favicon.ico, og.png")


if __name__ == "__main__":
    main()
