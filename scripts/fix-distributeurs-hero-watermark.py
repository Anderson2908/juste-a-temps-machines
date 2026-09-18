# -*- coding: utf-8 -*-
"""Retire le watermark Gemini (étoile) en bas à droite de distributeurs-hero.webp."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "assets" / "distributeurs-hero.webp"
BACKUP = TARGET.with_suffix(".webp.bak")


def remove_watermark(path: Path, source: Path | None = None) -> None:
    src_path = source or path
    bgr = cv2.cvtColor(np.array(Image.open(src_path).convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]

    mask = np.zeros((h, w), dtype=np.uint8)
    # Zone de l'étoile Gemini (coin bas-droit, panneau bois)
    cv2.ellipse(mask, (972, 728), (28, 30), 0, 0, 360, 255, -1)

    cleaned = cv2.inpaint(bgr, mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)

    rgb = cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(path, "WEBP", quality=85, method=6)
    print(f"OK {path} ({w}x{h})")


if __name__ == "__main__":
    remove_watermark(TARGET, BACKUP if BACKUP.is_file() else None)
