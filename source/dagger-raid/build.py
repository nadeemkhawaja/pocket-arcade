#!/usr/bin/env python3
"""Assemble Dagger Raid into the artifact page, a standalone file and a local test page."""
import pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

head = (SRC / "head.html").read_text()
body = (SRC / "body.html").read_text()
parts = sorted((SRC / "js").glob("*.js"))
js = "\n".join(p.read_text() for p in parts)
game_js = "(function () {\n" + js + "\n})();\n"

for name, text in (("head", head), ("body", body), ("js", js)):
    if "\u2014" in text:
        sys.exit("em dash found in " + name)
if "</script" in game_js.lower():
    sys.exit("closing script tag inside game code")

artifact = head + "\n" + body + "\n<script>\n" + game_js + "</script>\n"
(DIST / "index.html").write_text(artifact)

standalone = (
    "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
    + head + "\n</head>\n<body>\n" + body + "\n<script>\n" + game_js + "</script>\n</body>\n</html>\n"
)
(DIST / "dagger-raid.html").write_text(standalone)
(DIST / "game.js").write_text(game_js)

skeleton = (
    "<!doctype html><html><head><meta charset=utf8>"
    "<meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
    "<style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}</style>"
    "</head><body>"
)
(DIST / "test.html").write_text(skeleton + artifact + "</body></html>")
print("artifact", len(artifact) // 1024, "KB  standalone", len(standalone) // 1024, "KB")
