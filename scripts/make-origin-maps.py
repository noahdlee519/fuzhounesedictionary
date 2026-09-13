#!/usr/bin/env python3
"""Build the little origin maps that sit beside each recording.

One thumbnail per code in src/lib/origins.ts, written as inline SVG into
src/components/origin-maps.ts. Inline, not <img>, for the same reason the
About page's Fujian map is inline: an <img> cannot see the page's CSS
variables, and this site's dark mode is a manual toggle as well as a system
preference, so the colours have to come from --rule-strong and --lacquer.

Every mainland thumbnail shares one projection — the Fuzhou and Ningde
prefectures, the Eastern Min area, the same region the About page shades —
so the position of the red patch is what tells you where someone is from.
Two exceptions: "Elsewhere in Fujian" draws the whole province, and
"Overseas" reuses the world map from the About page.

Inputs, none of them in this repo:

  1. County boundaries, from https://github.com/zhChuXiao/ChinaGeoJson
     (a mirror of DataV.GeoAtlas), files citys/福州市.json and citys/宁德市.json.
     Point COUNTY_DIR at a checkout of its citys/ folder.
  2. Fujian's provincial outline, from the npm package china-geojson,
     src/geojson/fu_jian_geo.json. Point FUJIAN_GEO at it.
  3. public/diaspora-map.svg from this repo, for the overseas thumbnail.

    python3 scripts/make-origin-maps.py

Matsu is the one place with no polygon: it is in Taiwan's Lienchiang county,
not in a mainland dataset, and at this size two islands of a few square
kilometres would be a dot in any case. It is drawn as a dot.
"""

import json
import math
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COUNTY_DIR = os.environ.get("COUNTY_DIR", "/tmp/cg/citys")
FUJIAN_GEO = os.environ.get("FUJIAN_GEO", "/tmp/package/src/geojson/fu_jian_geo.json")
OUT = os.path.join(REPO, "src/components/origin-maps.ts")

BOX = 100.0          # viewBox units; the browser scales it to ~36px
PAD = 3.0
# The box is drawn at about 36px, so one viewBox unit is roughly a third of a
# pixel: simplifying hard costs nothing visible and keeps the inline markup small.
TOL = 1.1            # simplification tolerance for the background, in viewBox units
MIN_AREA = 2.5       # drop islands smaller than this many square units
HL_TOL = 0.25        # the highlighted area is small; keep more of its shape
HL_MIN_AREA = 0.2
# Below this, a county is a smudge at 36px — Gulou is half a pixel across — so
# it gets a dot as well, the same mark Matsu gets.
DOT_BELOW = 26.0

FUZHOU_CITY = ["350102", "350103", "350104", "350105", "350111"]
NINGDE = ["350902", "350921", "350922", "350923", "350924", "350925", "350926", "350981", "350982"]

# code in src/lib/origins.ts -> the adcodes it covers
AREAS = {
    "gulou": ["350102"],
    "taijiang": ["350103"],
    "cangshan": ["350104"],
    "mawei": ["350105"],
    "jinan": ["350111"],
    "fuzhou_unsure": FUZHOU_CITY,
    "changle": ["350112"],
    "fuqing": ["350181"],
    "minhou": ["350121"],
    "lianjiang": ["350122"],
    "luoyuan": ["350123"],
    "minqing": ["350124"],
    "yongtai": ["350125"],
    "pingtan": ["350128"],
    "gutian": ["350922"],
    "pingnan": ["350923"],
    "ningde": NINGDE,
}

# Nangan and Beigan, the two inhabited Matsu islands.
MATSU_POINTS = [(119.930, 26.152), (120.005, 26.222)]


# --- geometry ---------------------------------------------------------------

def rings(feature):
    """Every outer ring of a feature, as lists of (lon, lat)."""
    g = feature["geometry"]
    if g["type"] == "Polygon":
        return [g["coordinates"][0]]
    if g["type"] == "MultiPolygon":
        return [poly[0] for poly in g["coordinates"]]
    raise SystemExit("unexpected geometry " + g["type"])


def projector(all_rings):
    """Equirectangular, corrected for latitude, fitted to the box."""
    lats = [p[1] for r in all_rings for p in r]
    lons = [p[0] for r in all_rings for p in r]
    lat0 = (min(lats) + max(lats)) / 2
    k = math.cos(math.radians(lat0))
    xs = [lon * k for lon in lons]
    x0, x1, y0, y1 = min(xs), max(xs), min(lats), max(lats)
    span = max(x1 - x0, y1 - y0)
    scale = (BOX - 2 * PAD) / span
    # centre the shorter axis
    dx = (BOX - (x1 - x0) * scale) / 2
    dy = (BOX - (y1 - y0) * scale) / 2

    def project(lon, lat):
        return (dx + (lon * k - x0) * scale, BOX - (dy + (lat - y0) * scale))

    return project


def perp(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(pts, tol):
    """Ramer-Douglas-Peucker, iterative so a long coastline cannot blow the stack."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        worst, at = 0.0, -1
        for k in range(i + 1, j):
            d = perp(pts[k], pts[i], pts[j])
            if d > worst:
                worst, at = d, k
        if worst > tol:
            keep[at] = True
            stack.append((i, at))
            stack.append((at, j))
    return [p for p, k in zip(pts, keep) if k]


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return abs(s) / 2


def path_of(features, project, tol=TOL, min_area=MIN_AREA):
    out, kept = [], []
    for f in features:
        for ring in rings(f):
            pts = simplify([project(lon, lat) for lon, lat in ring], tol)
            if len(pts) < 3 or area(pts) < min_area:
                continue
            out.append("M" + " ".join(f"{x:.0f},{y:.0f}" for x, y in pts) + "Z")
            kept.append(pts)
    return "".join(out), kept


def centroid(ringlist):
    """Area-weighted centre of the biggest ring — where to put a dot."""
    big = max(ringlist, key=area)
    return (sum(p[0] for p in big) / len(big), sum(p[1] for p in big) / len(big))


# --- the world, lifted from the About page's map ----------------------------

def world_svg():
    src = open(os.path.join(REPO, "public/diaspora-map.svg"), encoding="utf-8").read()
    vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', src)
    W, H = float(vb.group(1)), float(vb.group(2))
    land = re.search(r'<path class="land"[^>]*\sd="([^"]*)"', src, re.S).group(1)

    scale = (BOX - 2 * PAD) / W
    dy = (BOX - H * scale) / 2

    def fit(x, y):
        return (PAD + x * scale, dy + y * scale)

    out = []
    for ring in land.split("Z"):
        ring = ring.strip()
        if not ring.startswith("M"):
            continue
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", ring)]
        pts = [fit(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]
        pts = simplify(pts, 0.9)
        if len(pts) < 3 or area(pts) < 2.0:
            continue
        out.append("M" + " ".join(f"{x:.0f},{y:.0f}" for x, y in pts) + "Z")
    land_d = "".join(out)

    dots = []
    for m in re.finditer(r'<circle class="(d|home)" cx="([\d.]+)" cy="([\d.]+)"', src):
        x, y = fit(float(m.group(2)), float(m.group(3)))
        dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.4" style="fill:var(--lacquer)"/>')
    return land_d, "".join(dots)


# --- assembly ---------------------------------------------------------------

def svg(body):
    # aria-hidden: OriginMap.tsx wraps this in an element that carries the
    # place name, so the graphic itself must not be announced twice.
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BOX:.0f} {BOX:.0f}" '
        f'aria-hidden="true">{body}</svg>'
    )


def main():
    for p in (COUNTY_DIR, FUJIAN_GEO):
        if not os.path.exists(p):
            sys.exit(f"missing input: {p}\nSee the note at the top of this file.")

    counties = []
    for name in ("福州市.json", "宁德市.json"):
        counties += json.load(open(os.path.join(COUNTY_DIR, name), encoding="utf-8"))["features"]
    by_code = {f["properties"]["adcode"]: f for f in counties}
    for code, adcodes in AREAS.items():
        for a in adcodes:
            if int(a) not in by_code and a not in by_code:
                sys.exit(f"{code}: no county {a} in the source data")

    def get(a):
        return by_code.get(int(a)) or by_code[a]

    project = projector([r for f in counties for r in rings(f)])
    context, _ = path_of(counties, project)

    maps = {}
    ctx = f'<path d="{context}" style="fill:var(--rule-strong)"/>'
    for code, adcodes in AREAS.items():
        hl, kept = path_of([get(a) for a in adcodes], project, HL_TOL, HL_MIN_AREA)
        mark = ""
        if kept and sum(area(r) for r in kept) < DOT_BELOW:
            cx, cy = centroid(kept)
            mark = f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="3.2" style="fill:var(--lacquer)"/>'
        maps[code] = ctx + f'<path d="{hl}" style="fill:var(--lacquer)"/>' + mark

    # Matsu: islands too small to draw, marked where they are.
    dots = "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" style="fill:var(--lacquer)"/>'
        for x, y in (project(lon, lat) for lon, lat in MATSU_POINTS)
    )
    maps["matsu"] = ctx + dots

    # "Elsewhere in Fujian" means exactly that: the province on its own fit,
    # with the Fuzhou and Ningde prefectures — the area every other thumbnail
    # is about — left grey, and the rest of it red.
    fj = json.load(open(FUJIAN_GEO, encoding="utf-8"))["features"]
    fj_project = projector([r for f in fj for r in rings(f)])
    here = {"福州市", "宁德市"}
    rest = [f for f in fj if f["properties"].get("name") not in here]
    mindong = [f for f in fj if f["properties"].get("name") in here]
    if len(mindong) != 2:
        sys.exit("could not find 福州市 and 宁德市 in the province file")
    md_d, _ = path_of(mindong, fj_project)
    rest_d, _ = path_of(rest, fj_project)
    maps["fujian_other"] = (
        f'<path d="{md_d}" style="fill:var(--rule-strong)"/>'
        # softer than a county fill: this is the vaguest origin on the list,
        # and at full strength it shouted louder than the precise ones.
        f'<path d="{rest_d}" style="fill:var(--lacquer);fill-opacity:.55"/>'
    )

    land_d, dots = world_svg()
    maps["overseas"] = f'<path d="{land_d}" style="fill:var(--rule-strong)"/>{dots}'

    order = list(AREAS) + ["matsu", "fujian_other", "overseas"]
    body = "".join(f"  {code}: `{svg(maps[code])}`,\n" for code in order)
    ts = (
        "/* Generated by scripts/make-origin-maps.py — do not edit by hand.\n"
        "   One thumbnail per origin code, inline so the colours can come from\n"
        "   the page's own --rule-strong and --lacquer and follow the theme\n"
        "   toggle. The label is filled in by OriginMap.tsx. */\n\n"
        "export const ORIGIN_MAPS: Record<string, string> = {\n" + body + "};\n"
    )
    open(OUT, "w", encoding="utf-8").write(ts)
    print(f"wrote {OUT}  ({len(ts):,} bytes, {len(maps)} maps)")
    for code in order:
        print(f"   {code:16s} {len(maps[code]):6,d} bytes")


if __name__ == "__main__":
    main()
