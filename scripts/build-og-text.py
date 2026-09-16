#!/usr/bin/env python3
"""Regenerate brand/og-text.json — the outlined type for the social card.

Only needed when the card's WORDING changes. This script owns the type and
nothing else; scripts/build-og.mjs composes the card and writes both og.svg and
og.png from the JSON, and needs no Python and no fonts.

Outlines rather than <text> because the brand faces (Anton, Space Grotesk) ship
as web fonts that fontconfig can't see, so a renderer would silently substitute
something else. Paths render identically everywhere.

Text positions are baked into the path data, so this file owns the left column's
layout. The portrait card, the logo placement and the background live in
build-og.mjs.

Requires fonttools + brotli (Space Grotesk ships woff2). If they aren't on the
system Python, use a throwaway venv:
    python3 -m venv /tmp/ogvenv && /tmp/ogvenv/bin/pip install fonttools brotli
    /tmp/ogvenv/bin/python scripts/build-og-text.py
"""
import json
import pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
ANTON = ROOT / "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff"
GROTESK = ROOT / "node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2"

# Site palette (src/styles/global.css). No gold — it was retired from the brand.
ACCENT, TEXT, MUTED, BG = "#1a8fd6", "#0e1116", "#2c303b", "#f7f7f3"

_cache = {}
def load(which, wght=400):
    key = (which, wght)
    if key not in _cache:
        if which == "anton":
            f = TTFont(ANTON)
        else:
            f = TTFont(GROTESK)
            if "fvar" in f:
                f = instancer.instantiateVariableFont(f, {"wght": wght})
        _cache[key] = f
    return _cache[key]

def text_path(text, which, size, x, y, wght=400, tracking=0.0):
    """SVG path data for `text`, baseline at (x, y). Advance widths only — no
    kerning, which at these sizes is not visible."""
    f = load(which, wght)
    upm = f["head"].unitsPerEm
    cmap, gs, hmtx = f.getBestCmap(), f.getGlyphSet(), f["hmtx"]
    scale = size / upm
    parts, cursor, missing = [], 0.0, []
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            missing.append(ch); cursor += 0.5 * upm; continue
        spen = SVGPathPen(gs)
        gs[gname].draw(TransformPen(spen, Transform(scale, 0, 0, -scale, x + cursor * scale, y)))
        if (d := spen.getCommands()):
            parts.append(d)
        cursor += hmtx[gname][0] + tracking * upm
    if missing:
        raise SystemExit(f"Font is missing glyphs for {missing!r} in {text!r}")
    return " ".join(parts), cursor * scale

M = 84            # left margin, mirrored on the right
COL = 636         # text column budget, so nothing runs under the portrait

# Mirrors the homepage hero: first name solid, surname outlined.
runs = {
    "lead": text_path("Mohammed", "anton", 100, M, 282)[0],
    "rest": text_path("Akash", "anton", 100, M, 384)[0],
    "hook": text_path("moh\u00b7akash \u2014 \u201cthe infinite sky\u201d", "grotesk", 27, M, 442, wght=500)[0],
    # Two lines: as one line this runs 736px and would collide with the photo.
    "tag1": text_path("Web developer \u00b7 researcher \u00b7 poet", "grotesk", 23, M, 486)[0],
    "tag2": text_path("Building in public with Claude.", "grotesk", 23, M, 518)[0],
    "url": text_path("mohakash.xyz", "grotesk", 26, M, 574, wght=600)[0],
}

out = ROOT / "brand/og-text.json"
out.write_text(json.dumps(runs, indent=2), encoding="utf-8")
print(f"Wrote {out.relative_to(ROOT)} ({sum(len(v) for v in runs.values())} bytes of path data)")
