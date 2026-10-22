#!/usr/bin/env python3
"""Assemble Ace Rally Tennis into the artifact page and a standalone file."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"

head = (SRC / "head.html").read_text()
body = (SRC / "body.html").read_text()
parts = sorted((SRC / "js").glob("*.js"))
js = "\n".join(p.read_text() for p in parts)
game_js = "(function () {\n" + js + "\n})();\n"

if "\u2014" in head + body + js:
    sys.exit("em dash found in sources")
if "</script" in game_js.lower():
    sys.exit("closing script tag inside game code")

artifact = (
    head + "\n" + body + "\n"
    + '<script src="' + THREE_CDN + '"></script>\n'
    + "<script>\n" + game_js + "</script>\n"
)
(DIST / "index.html").write_text(artifact)

three = (ROOT / "vendor/package/build/three.min.js").read_text()
three = re.sub(r"</script", r"<\\/script", three, flags=re.I)
standalone = (
    "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
    + head + "\n</head>\n<body>\n" + body + "\n"
    + "<script>\n" + three + "\n</script>\n"
    + "<script>\n" + game_js + "</script>\n</body>\n</html>\n"
)
(DIST / "ace-rally-tennis.html").write_text(standalone)

# the game code alone, for syntax checks
(DIST / "game.js").write_text(game_js)

# local test copy wrapped in the same skeleton the artifact host adds
skeleton = (
    "<!doctype html><html><head><meta charset=utf8>"
    "<meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>"
    "</head><body>"
)
(DIST / "test.html").write_text(skeleton + artifact + "</body></html>")
print("artifact", len(artifact) // 1024, "KB  standalone", len(standalone) // 1024, "KB")
