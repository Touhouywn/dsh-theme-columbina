"""Assemble the Bilibili promo: title card, opening, UI, hub, end card."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
CARDS = ROOT / ".assets-src" / "cards"
WORK = ROOT / ".assets-src" / "promo"
FFMPEG = Path(
    r"C:\Users\yuanshuifehe\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python"
    r"\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
)

RAW = DIST / "raw.mp4"
SCORE = ROOT / "dsh-theme-columbina" / "assets" / "opening-score.m4a"
LULLABY = ROOT / "dsh-theme-columbina" / "assets" / "bgm" / "01-somnias-a-luna.mp3"
OUT = DIST / "columbina-promo.mp4"

VIDEO = ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30"]


def run(args: list[str]) -> None:
    subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def segment(name: str, args: list[str]) -> Path:
    path = WORK / name
    run([*args, *VIDEO, str(path)])
    return path


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)

    # 1. title card, 4.0 s
    segment("s1.mp4", ["-loop", "1", "-t", "4.0", "-i", str(CARDS / "title.png"), "-vf", "fps=30,format=yuv420p"])
    # 2. the opening, 16.0 s
    segment("s2.mp4", ["-ss", "2.0", "-t", "16.0", "-i", str(RAW)])
    # 3. main window + lower third, 6.7 s
    segment(
        "s3.mp4",
        [
            "-ss", "18.6", "-t", "6.7", "-i", str(RAW),
            "-i", str(CARDS / "lower-main.png"),
            "-filter_complex", "[0:v][1:v]overlay=0:0",
        ],
    )
    # 4. hub + lower third, 5.4 s
    segment(
        "s4.mp4",
        [
            "-ss", "25.9", "-t", "5.4", "-i", str(RAW),
            "-i", str(CARDS / "lower-hub.png"),
            "-filter_complex", "[0:v][1:v]overlay=0:0",
        ],
    )
    # 5. hub scrolled, 5.6 s
    segment("s5.mp4", ["-ss", "31.8", "-t", "5.6", "-i", str(RAW)])
    # 6. end card, 5.0 s
    segment("s6.mp4", ["-loop", "1", "-t", "5.0", "-i", str(CARDS / "end.png"), "-vf", "fps=30,format=yuv420p"])

    listing = WORK / "concat.txt"
    listing.write_text("".join(f"file '{WORK / f's{i}.mp4'}'\n" for i in range(1, 7)), encoding="utf-8")
    silent = WORK / "silent.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(silent)])

    total = 42.7
    run(
        [
            "-i", str(silent),
            "-i", str(SCORE),
            "-i", str(LULLABY),
            "-filter_complex",
            "[1:a]adelay=700|700,volume=0.95[a1];"
            "[2:a]atrim=8:34,asetpts=N/SR/TB,volume=0.42,afade=t=in:st=0:d=2.5,afade=t=out:st=17:d=6,"
            "adelay=17800|17800[a2];"
            "[a1][a2]amix=inputs=2:duration=longest:normalize=0,afade=t=out:st=40.4:d=2.3,apad=whole_dur=42.7[aout]",
            "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
            "-t", str(total), "-movflags", "+faststart", str(OUT),
        ]
    )
    print("wrote", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
