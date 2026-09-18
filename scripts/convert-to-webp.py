# -*- coding: utf-8 -*-
"""Convertit les images JPG/PNG du site en WebP (qualité 80)."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
QUALITY = 80
RSE_QUALITY = 75

SOURCES = [
    ASSETS / "rse-recolte.jpg",
    ASSETS / "about-hero-equipe.png",
    ASSETS / "contact-equipe.jpg",
    ASSETS / "hero-office.jpg",
    ASSETS / "fontaines-hero.jpg",
    ASSETS / "about-equipe-01.png",
    ASSETS / "about-equipe-02.png",
    ASSETS / "about-equipe-03.png",
    ASSETS / "about-equipe-04.png",
    ASSETS / "about-equipe-05.png",
    ASSETS / "about-equipe-06.png",
    ASSETS / "about-equipe-07.png",
    ASSETS / "machines" / "necta-concerto.png",
]


def convert(src: Path) -> None:
    if not src.is_file():
        print(f"SKIP (absent): {src.relative_to(ROOT)}")
        return

    dst = src.with_suffix(".webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        print(f"SKIP (webp à jour): {dst.relative_to(ROOT)}")
        return

    img = Image.open(src)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")

    quality = RSE_QUALITY if src.name == "rse-recolte.jpg" else QUALITY
    img.save(dst, "WEBP", quality=quality, method=6)
    before = src.stat().st_size
    after = dst.stat().st_size
    ratio = (1 - after / before) * 100 if before else 0
    print(
        f"OK {src.relative_to(ROOT)} -> {dst.name} "
        f"({before // 1024} Ko -> {after // 1024} Ko, -{ratio:.0f}%)"
    )


def main() -> int:
    for src in SOURCES:
        convert(src)
    return 0


if __name__ == "__main__":
    sys.exit(main())
