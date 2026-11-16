#!/usr/bin/env python3
"""Bundle Pickleball Tour Pro into one standalone page.

The game is kept as written in src/index.html (imported from the
nadeemkhawaja/Pickleball-Tour-Pro repository). This build inlines three.js r128
from vendor/ in place of the CDN script tag, so the page works with no outside
requests, and writes dist/pickleball-tour-pro.html.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
page = (ROOT / "src/index.html").read_text()
three = re.sub(r"</script", r"<\\/script", (ROOT / "vendor/three.min.js").read_text(), flags=re.I)
tag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
if tag not in page:
    sys.exit("three.js CDN tag not found")
page = page.replace(tag, "<script>\n/* three.js r128, MIT licence: see vendor/LICENSE-three.txt */\n" + three + "\n</script>", 1)
page = page.replace('<meta charset="UTF-8" />', '<meta charset="utf-8">', 1)
page = page.replace("Pickleball Tour Pro 3D — World Venues Edition", "Pickleball Tour Pro 3D: World Venues Edition")
out = ROOT / "dist/pickleball-tour-pro.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page)
print(f"built {out.name} ({len(page) // 1024} KB)")
