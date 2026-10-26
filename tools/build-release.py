#!/usr/bin/env python3
"""Build the release archive and its checksum.

    python tools/build-release.py

Output (both under ``dist/``):

* ``dsh-theme-columbina-<version>.zip`` — the installable repository subset:
  the three packages, the two installers, and the licence/credits documents.
* ``SHA256SUMS-v<version>.txt`` — SHA-256 of the archive.
"""
from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

INCLUDE = [
    "install.ps1",
    "uninstall.ps1",
    "README.md",
    "LICENSE",
    "ASSET-LICENSE.md",
    "NOTICE.md",
    "CREDITS.md",
    "SECURITY.md",
    "docs/bgm-options.md",
    "docs/release-checklist.md",
    "docs/screenshot-main.png",
    "docs/screenshot-hub.png",
    "docs/opening.png",
    "docs/opening-hud.png",
    "dsh-theme-columbina",
    "dsh-plugin-columbina",
    "dsh-plugin-columbina-persona",
]

SKIP = {"__pycache__", "node_modules", ".git", "dist"}


def version() -> str:
    package = json.loads((ROOT / "dsh-theme-columbina" / "package.json").read_text(encoding="utf-8"))
    return package["version"]


def main() -> None:
    DIST.mkdir(exist_ok=True)
    tag = version()
    archive = DIST / f"dsh-theme-columbina-{tag}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for entry in INCLUDE:
            path = ROOT / entry
            if path.is_file():
                bundle.write(path, entry)
                continue
            for file in sorted(path.rglob("*")):
                if not file.is_file():
                    continue
                if any(part in SKIP for part in file.parts):
                    continue
                bundle.write(file, file.relative_to(ROOT).as_posix())
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (DIST / f"SHA256SUMS-v{tag}.txt").write_text(
        f"{digest}  {archive.name}\n", encoding="utf-8"
    )
    print(f"{archive.name}  {archive.stat().st_size} bytes")
    print(f"sha256 {digest}")


if __name__ == "__main__":
    main()
