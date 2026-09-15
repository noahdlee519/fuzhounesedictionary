#!/usr/bin/env python3
"""Make the shaded Eastern Min area on the About map follow Fujian's own coastline.

    python3 scripts/align-fujian-map.py          # rewrites src/app/about/fujian-map.ts
    python3 scripts/align-fujian-map.py --check  # reports, changes nothing

The map has three layers: the neighbouring provinces (`.neigh`), Fujian itself
(`#fjshape`, drawn twice — filled rose, then stroked in lacquer), and the
Fuzhou + Ningde prefectures shaded on top (`.md`).

`.neigh` and `#fjshape` come from one build and share 174 vertices exactly, so
they fit together. `.md` does not: it was simplified separately, and its
coordinates are written to one decimal place where Fujian's have three. Where
the two should run along the same coastline they instead cross, leaving
ribbons of unshaded land between the shading and the red outline — most
visibly along the north-east coast and just east of Fuzhou. Noah spotted both.

Rather than re-project anything, this works in the SVG's own coordinate space,
which is a plane like any other:

  1. Any part of Fujian left unshaded that **shares an edge with the shaded
     area** is a sliver produced by that mismatch — it is wedged between the
     shading and the coast — so it is added to the shading. The one exception
     is the largest such part, which is the rest of the province (Putian,
     Quanzhou and the rest) and is meant to be unshaded.
  2. The shading is then clipped to Fujian, removing the small overhangs it
     had into the sea.

Islands that sit *near* the shaded area without touching it are left alone.
They are not a misalignment: the prefecture data behind `.md` simply does not
include them, and guessing which prefecture an offshore island belongs to is
not this script's job.

Running it twice changes nothing the second time.
"""

import argparse
import os
import re
import sys

try:
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
except ImportError:
    sys.exit("needs shapely:  pip install shapely")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(REPO, "src/app/about/fujian-map.ts")

# Fujian's own coordinates carry three decimals; matching that makes the
# shared coastline identical rather than merely close.
PRECISION = 3
# Clipping leaves specks a fraction of a square unit across where rounded
# coordinates disagree in the last decimal. One display pixel is about 2.4
# square units, so anything under this is dust, not a sliver — ignoring it is
# what lets a second run find nothing to do.
DUST = 0.2


def rings(d):
    """The rings of an "M x,y L x,y … Z" path, as lists of (x, y)."""
    out = []
    for sub in d.split("M")[1:]:
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", sub)]
        ring = [(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]
        if len(ring) >= 3:
            out.append(ring)
    return out


def polygon(d):
    return unary_union([Polygon(r).buffer(0) for r in rings(d)])


def to_path(geom):
    parts = []
    for poly in [geom] if geom.geom_type == "Polygon" else geom.geoms:
        for ring in [poly.exterior, *poly.interiors]:
            pts = list(ring.coords)[:-1]  # the Z closes it
            if len(pts) < 3:
                continue
            parts.append(
                "M" + "L".join(f"{x:.{PRECISION}f},{y:.{PRECISION}f}" for x, y in pts) + "Z"
            )
    return "".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report without writing")
    args = ap.parse_args()

    src = open(MAP, encoding="utf-8").read()
    fj_m = re.search(r'id="fjshape"[^>]*\sd="([^"]*)"', src)
    md_m = re.search(r'class="md"[^>]*\sd="([^"]*)"', src)
    if not fj_m or not md_m:
        sys.exit("could not find the #fjshape and .md paths in " + MAP)

    fj, md = polygon(fj_m.group(1)), polygon(md_m.group(1))

    rest = fj.difference(md)
    pieces = sorted(rest.geoms if hasattr(rest, "geoms") else [rest], key=lambda g: -g.area)
    outside_fujian = md.difference(fj).area

    # pieces[0] is the rest of the province; the rest that touch the shading
    # are the slivers.
    slivers = [g for g in pieces[1:]
               if g.area > DUST and g.buffer(0.01).intersects(md.boundary)]
    kept = [g for g in pieces[1:] if g.area > DUST and g not in slivers]

    print(f"Fujian {fj.area:,.0f} sq units · shaded {md.area:,.0f}")
    print(f"  slivers along the shared border : {len(slivers)} pieces, {sum(g.area for g in slivers):,.1f} sq units")
    print(f"  shading overhanging into the sea: {outside_fujian:,.1f} sq units")
    print(f"  separate islands left unshaded  : {len(kept)} pieces, {sum(g.area for g in kept):,.1f} sq units")

    if not slivers and outside_fujian < DUST:
        print("Already aligned; nothing to do.")
        return

    fixed = unary_union([md, *slivers]).intersection(fj).buffer(0)
    d = to_path(fixed)

    # Check the work: no overhang, and no touching piece left over.
    check = polygon(d)
    left = fj.difference(check)
    left_pieces = sorted(left.geoms if hasattr(left, "geoms") else [left], key=lambda g: -g.area)[1:]
    still = [g for g in left_pieces if g.area > DUST and g.buffer(0.01).intersects(check.boundary)]
    print(f"After: overhang {check.difference(fj).area:.3f} · touching slivers left {len(still)} · "
          f"shaded {check.area:,.0f} ({check.area - md.area:+,.0f})")

    if args.check:
        print("--check: not written.")
        return

    out = src[: md_m.start(1)] + d + src[md_m.end(1) :]
    open(MAP, "w", encoding="utf-8").write(out)
    print(f"wrote {MAP} (.md path {len(md_m.group(1)):,} → {len(d):,} chars)")


if __name__ == "__main__":
    main()
