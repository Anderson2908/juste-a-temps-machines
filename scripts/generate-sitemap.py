#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regénère sitemap.xml avec <lastmod> par page (git + mtime si modifications locales)."""

from __future__ import annotations

import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITEMAP_PATH = ROOT / "sitemap.xml"
DOMAIN = "https://abonnement.justeatemps.com"


def loc_to_source_file(loc: str) -> str:
    pathname = loc.removeprefix(DOMAIN).lstrip("/")
    return pathname or "index.html"


def parse_existing_sitemap(xml: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for block in re.findall(r"<url>[\s\S]*?</url>", xml):
        loc_match = re.search(r"<loc>([^<]+)</loc>", block)
        if not loc_match:
            continue
        entries.append(
            {
                "loc": loc_match.group(1),
                "changefreq": re.search(r"<changefreq>([^<]+)</changefreq>", block).group(1)
                if re.search(r"<changefreq>([^<]+)</changefreq>", block)
                else "monthly",
                "priority": re.search(r"<priority>([^<]+)</priority>", block).group(1)
                if re.search(r"<priority>([^<]+)</priority>", block)
                else "0.5",
            }
        )
    return entries


def to_date_only(value: str | datetime) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.date().isoformat()
    return value[:10]


def git_last_commit_date(relative_path: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", relative_path.replace("\\", "/")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        output = result.stdout.strip()
        return to_date_only(output) if output else None
    except OSError:
        return None


def file_mtime_date(relative_path: str) -> str | None:
    absolute_path = ROOT / relative_path
    if not absolute_path.is_file():
        return None
    mtime = datetime.fromtimestamp(absolute_path.stat().st_mtime, tz=timezone.utc)
    return to_date_only(mtime)


def has_uncommitted_changes(relative_path: str) -> bool:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain", "--", relative_path.replace("\\", "/")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        return bool(result.stdout.strip())
    except OSError:
        return True


def get_lastmod(relative_path: str) -> str:
    git_date = git_last_commit_date(relative_path)
    dirty = has_uncommitted_changes(relative_path)

    if git_date and not dirty:
        return git_date

    mtime_date = file_mtime_date(relative_path)
    if git_date and mtime_date:
        return max(git_date, mtime_date)
    if git_date or mtime_date:
        return git_date or mtime_date  # type: ignore[return-value]
    return to_date_only(datetime.now(timezone.utc))


def build_sitemap(entries: list[dict[str, str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for entry in entries:
        source = loc_to_source_file(entry["loc"])
        lastmod = get_lastmod(source)
        lines.extend(
            [
                "  <url>",
                f'    <loc>{entry["loc"]}</loc>',
                f"    <lastmod>{lastmod}</lastmod>",
                f'    <changefreq>{entry["changefreq"]}</changefreq>',
                f'    <priority>{entry["priority"]}</priority>',
                "  </url>",
            ]
        )

    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    if not SITEMAP_PATH.is_file():
        print("sitemap.xml introuvable.", file=sys.stderr)
        return 1

    entries = parse_existing_sitemap(SITEMAP_PATH.read_text(encoding="utf-8"))
    if not entries:
        print("Aucune entrée trouvée dans sitemap.xml.", file=sys.stderr)
        return 1

    SITEMAP_PATH.write_text(build_sitemap(entries), encoding="utf-8")

    for entry in entries:
        source = loc_to_source_file(entry["loc"])
        print(f'{entry["loc"]} -> {source} ({get_lastmod(source)})')

    print(f"\n{len(entries)} URLs écrites dans sitemap.xml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
