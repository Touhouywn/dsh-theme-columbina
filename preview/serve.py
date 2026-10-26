#!/usr/bin/env python3
"""Serve the repository root for the offline previews.

    python preview/serve.py [port]

Then open http://127.0.0.1:52881/preview/audition.html (opening-score audition)
or http://127.0.0.1:52881/preview/opening.html (the opening overlay rendered
against the real client bundle).
"""
from __future__ import annotations

import functools
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".m4a": "audio/mp4",
        ".webp": "image/webp",
        ".js": "text/javascript",
    }

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        sys.stderr.write("%s\n" % (format % args))


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 52881
    handler = functools.partial(Handler, directory=str(ROOT))
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving {ROOT} on http://127.0.0.1:{port}/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
