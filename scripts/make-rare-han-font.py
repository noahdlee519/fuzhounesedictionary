#!/usr/bin/env python3
"""Build the tiny font that covers the Fuzhounese characters Noto Serif TC does not.

    python3 scripts/make-rare-han-font.py            # writes src/fonts/RareHan.woff2
    python3 scripts/make-rare-han-font.py --report   # lists the characters, builds nothing

WHY THIS EXISTS

Noto Serif TC — the Chinese face the site loads from Google — is served as 324
subsets, and none of them covers anything above U+FFFF. The dictionary needs
characters up there: 𣍐 mâ̤ (cannot), 𡳞 lâng, and a dozen more. They are the
words Fuzhounese has and Mandarin does not, so a font built for standard
Chinese is exactly the font that will not have them.

The browser then substitutes per character, and on a Mac it picks a sans. The
result is a single word set in two faces — 𣍐合 with the two characters
disagreeing — which is what Noah noticed.

So: take Hanazono Mincho, which does cover them and is a Ming face like Noto,
and keep only the handful of glyphs this dictionary actually uses. The result
is a few kilobytes rather than a few megabytes.

THE SOURCE

Hanazono Mincho (花園明朝), https://fonts.jp/hanazono/ — free to use and
redistribute. Fetched through the `hanamin` npm package, which is that font
pre-split into per-block woff2 files. The package is only a delivery vehicle;
the glyphs are Hanazono's.

RE-RUNNING IT

The character list is read out of the CSVs in scripts/, so adding a word with
a new rare character and re-running is all it takes. Anything the source font
does not have is named in the output rather than passed over in silence.
"""

import argparse
import csv
import glob
import os
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "src/fonts/RareHan.woff2")
NPM_PKG = "hanamin"
FAMILY = "RareHan"


def wanted():
    """Every character in the dictionary's CSVs that sits above the BMP."""
    seen = {}
    for f in sorted(glob.glob(os.path.join(REPO, "scripts/*.csv"))):
        with open(f, encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                h = (row.get("hanzi") or "").strip()
                for ch in h:
                    if ord(ch) > 0xFFFF:
                        seen.setdefault(ord(ch), set()).add(h)
    return seen


def fetch_source(workdir):
    """Unpack the npm package holding Hanazono's per-block woff2 files."""
    print(f"fetching {NPM_PKG} from npm…")
    subprocess.run(["npm", "pack", NPM_PKG], cwd=workdir, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tgz = glob.glob(os.path.join(workdir, f"{NPM_PKG}-*.tgz"))[0]
    subprocess.run(["tar", "xzf", tgz], cwd=workdir, check=True)
    return os.path.join(workdir, "package")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true", help="list the characters, build nothing")
    args = ap.parse_args()

    from fontTools.ttLib import TTFont
    from fontTools.merge import Merger
    from fontTools import subset

    need = wanted()
    print(f"{len(need)} characters above the BMP, in {len(set().union(*need.values()))} words:")
    for cp in sorted(need):
        print(f"  {chr(cp)}  U+{cp:04X}  {'  '.join(sorted(need[cp]))}")
    if args.report:
        return

    with tempfile.TemporaryDirectory() as work:
        pkg = fetch_source(work)

        # Which of the source's per-block files holds each character.
        parts, covered = [], set()
        for f in sorted(glob.glob(os.path.join(pkg, "HanaMin*.woff2"))):
            try:
                font = TTFont(f, lazy=True)
                cmap = font.getBestCmap()
            except Exception:
                continue
            hit = sorted(cp for cp in need if cp in cmap and cp not in covered)
            font.close()
            if not hit:
                continue
            covered.update(hit)
            # Cut this block down to just the characters we want from it.
            piece = os.path.join(work, f"piece{len(parts)}.ttf")
            subset.main([f, f"--unicodes={','.join(f'U+{c:04X}' for c in hit)}",
                         "--glyph-names", f"--output-file={piece}"])
            parts.append(piece)

        missing = sorted(set(need) - covered)
        if missing:
            print("\nNot in the source font, so these keep falling back:")
            for cp in missing:
                print(f"  {chr(cp)}  U+{cp:04X}  {'  '.join(sorted(need[cp]))}")

        if not parts:
            sys.exit("nothing to build")

        print(f"\nmerging {len(parts)} pieces…")
        merged = os.path.join(work, "merged.ttf")
        Merger().merge(parts).save(merged)

        # One more pass over the merged font: drop the layout tables a
        # sixteen-glyph font has no use for, and write the woff2.
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        subset.main([merged,
                     f"--unicodes={','.join(f'U+{c:04X}' for c in sorted(covered))}",
                     "--layout-features=", "--no-hinting", "--desubroutinize",
                     "--name-IDs=1,2,3,4,6", "--flavor=woff2",
                     f"--output-file={OUT}"])

        # Name it for what it is, so a font panel does not say HanaMin.
        font = TTFont(OUT)
        for rec in font["name"].names:
            if rec.nameID in (1, 3, 4, 6):
                rec.string = FAMILY if rec.nameID in (1, 4) else f"{FAMILY}-Regular"
        font.save(OUT)

        got = TTFont(OUT)
        print(f"\nwrote {OUT}")
        print(f"  {len(got.getBestCmap())} glyphs, {os.path.getsize(OUT):,} bytes")
        print("  unicode-range for the @font-face rule:")
        print("    " + ", ".join(f"U+{c:X}" for c in sorted(covered)))


if __name__ == "__main__":
    main()
