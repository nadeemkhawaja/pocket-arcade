#!/usr/bin/env python3
"""Rebuild both games from source and refresh the playable copies in the site.

Usage:  python3 source/build_site.py

Each game's build.py bundles its src/ files into one standalone HTML page in its
dist/ folder. This script runs both builds, then copies the standalone pages to
dagger-raid/index.html and tennis/index.html with the site icon linked in.
"""
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
SITE = HERE.parent
ICON = '<link rel="icon" href="../favicon.svg" type="image/svg+xml">'
GAMES = [
    ("dagger-raid", "dagger-raid.html", "dagger-raid"),
    ("ace-rally-tennis", "ace-rally-tennis.html", "tennis"),
]

for folder, built, target in GAMES:
    subprocess.run([sys.executable, str(HERE / folder / "build.py")], check=True)
    page = (HERE / folder / "dist" / built).read_text()
    marker = '<meta charset="utf-8">'
    if marker not in page:
        sys.exit(f"{built}: charset tag not found, cannot place the icon link")
    page = page.replace(marker, marker + "\n" + ICON, 1)
    out = SITE / target / "index.html"
    out.write_text(page)
    print(f"updated {out.relative_to(SITE)} ({len(page) // 1024} KB)")
