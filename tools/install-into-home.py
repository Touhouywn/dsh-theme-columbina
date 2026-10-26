"""One-shot: install the three packages into a DSH home and park Sandrone.

Run with an explicit DSH_HOME:

    python tools/install-into-home.py <dsh-home> <profile>

Why not just call install.ps1: the theme has to coexist with the Sandrone pack
that is already installed in this profile. Both themes paint the canvas, and two
persona plugins would stack their prompt sections, so the Sandrone rows are
switched to `disabled: true` (recoverable: delete that line to re-enable).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IDS = {f"- id: {name}" for name in ("theme-sandrone", "sandrone-hub", "sandrone-persona")}


def disable_sandrone(patch: Path) -> None:
    """Insert `disabled: true` after the name of every Sandrone insert row."""
    lines = patch.read_text(encoding="utf-8").splitlines()
    result = []
    armed = False
    for line in lines:
        result.append(line)
        stripped = line.strip()
        if stripped in IDS:
            armed = True
            continue
        if armed and stripped.startswith("name: dsh-"):
            indent = line[: len(line) - len(line.lstrip())]
            result.append(f"{indent}disabled: true")
            armed = False
        elif armed and not stripped.startswith("name:"):
            armed = False
    patch.write_text("\n".join(result) + "\n", encoding="utf-8")


def main() -> None:
    home = Path(sys.argv[1])
    profile = sys.argv[2] if len(sys.argv) > 2 else "desktop"
    patch = home / "profiles" / profile / "cordis.patch.yml"
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(patch, patch.with_suffix(patch.suffix + f".bak-columbina-{stamp}"))
    subprocess.run(
        ["pwsh", "-NoProfile", "-File", str(ROOT / "install.ps1"), "-Profile", profile, "-DshHome", str(home)],
        check=True,
        env={**os.environ, "DSH_HOME": str(home)},
    )
    disable_sandrone(patch)
    print("sandrone rows parked")
    print(patch.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
