#!/usr/bin/env python3
"""Regenerate the Arcoline imagery on the site from full-window plugin captures.

Usage (from the repo root):
    python3 tools/build-shots.py [capture-dir]

capture-dir defaults to Screenshots/v1.1 — pass the new directory when a
release ships new captures. Requires Pillow (pip install Pillow).

Expected captures (PNG, the whole plugin window, no OS chrome, no cursor):
    Dive - LUFS.png                the Deep Blue reference session; EVERY detail
                                   crop that shows numbers comes from this one
                                   file, so the manual reads as a single pass
    Dive - Phase.png               PHASE posture
    Dive - Histogram LUFSM.png     HISTOGRAM posture, LUFS M axis, lamp settled
    Dive - Histogram RMS.png       HISTOGRAM posture, RMS axis, lamp settled
    Dive - Neutral Dark Mode.png   theme shot
    Dive - Light Mode.png          theme shot

Crop geometry is proportional to the captured window, so it survives small
differences in capture size. After running, update the width/height attributes
and any alt-text numbers in the HTML if the printed sizes or session readings
changed (grep for the previous Integrated value).

Not generated here: crop-settings.webp and menu.webp (transient panels — shoot
and crop by hand when they change) and ascend.webp (shoot the Ascend view of
the same session at ~418x548).
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "Screenshots/v1.1")
DST = ROOT / "support/manual-img"

DIAL = (0.218, 0.095, 0.690, 0.755)  # centre instrument, incl. the mode strip

# output -> (source capture, crop fractions (l, t, r, b) or None for full window, output width)
JOBS = {
    "crop-gauge.webp":         ("Dive - LUFS.png",              DIAL, 440),
    "crop-gonio.webp":         ("Dive - Phase.png",             DIAL, 440),
    "crop-histogram.webp":     ("Dive - Histogram LUFSM.png",   DIAL, 440),
    "crop-histogram-rms.webp": ("Dive - Histogram RMS.png",     DIAL, 440),
    "crop-meters.webp":        ("Dive - LUFS.png", (0.012, 0.085, 0.205, 0.800),  210),
    "crop-loudness.webp":      ("Dive - LUFS.png", (0.680, 0.110, 0.972, 0.385),  332),
    "crop-dynamics.webp":      ("Dive - LUFS.png", (0.680, 0.405, 0.972, 0.570),  332),
    "crop-tone.webp":          ("Dive - LUFS.png", (0.680, 0.585, 0.972, 0.775),  332),
    "crop-history.webp":       ("Dive - LUFS.png", (0.010, 0.805, 0.985, 0.985), 1022),
    "dive.webp":               ("Dive - LUFS.png",              None, 1050),
    "dive-dark.webp":          ("Dive - Neutral Dark Mode.png", None, 1050),
    "dive-light.webp":         ("Dive - Light Mode.png",        None, 1050),
}


def crop_fraction(im, fr):
    w, h = im.size
    return im.crop((int(fr[0] * w), int(fr[1] * h), int(fr[2] * w), int(fr[3] * h)))


def main():
    for out, (src, fr, width) in JOBS.items():
        im = Image.open(SRC / src).convert("RGB")
        if fr:
            im = crop_fraction(im, fr)
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(DST / out, "WEBP", quality=86 if fr else 84, method=6)
        print(f"{out:26s} {im.size}")

    # og-metering.png — the social-share card for the product page and manual.
    # A full-width band of the reference capture at the OG 1200x630 aspect,
    # starting below the control bar so the dial and report card fill the frame.
    im = Image.open(SRC / "Dive - LUFS.png").convert("RGB")
    w, h = im.size
    band_h = round(w / (1200 / 630))
    top = min(84, h - band_h)
    og = im.crop((0, top, w, top + band_h)).resize((1200, 630), Image.LANCZOS)
    og.save(ROOT / "og-metering.png", optimize=True)
    print(f"{'og-metering.png':26s} {og.size}")


if __name__ == "__main__":
    main()
