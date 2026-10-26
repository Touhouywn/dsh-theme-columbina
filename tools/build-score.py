#!/usr/bin/env python3
"""Compose the theme's opening score from scratch.

Two arrangements are generated, both original and released with the repository
under the same MIT licence as the code:

* ``moon-cocoon`` (default) — a music-box lullaby in A minor, 72 BPM, 6/8.
* ``starfall``              — the same harmonic bed, thinner: celesta arpeggios,
                              no bass impact, a longer tail.

The score is written as 48 kHz stereo WAV and then encoded to AAC (``.m4a``) by
FFmpeg, so the browser streams one pre-mixed file and picture cannot drift.

Usage::

    python tools/build-score.py                 # both variants + m4a
    python tools/build-score.py --variant moon-cocoon
"""
from __future__ import annotations

import argparse
import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dsh-theme-columbina" / "assets"
BUILD = ROOT / ".assets-src" / "build"

RATE = 48_000
BPM = 72.0
BEAT = 60.0 / BPM
BARS = 6
OFFSET = 1.2  # silence before the first note: the overlay fades up from black
DURATION = OFFSET + BARS * 3 * BEAT  # 6/8: three quarter notes per bar
TAIL = 1.0

A4 = 440.0


def midi(note: str) -> float:
    """Scientific pitch name to frequency, e.g. ``C#5``."""
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    flats = {"Bb": "A#", "Eb": "D#", "Ab": "G#", "Db": "C#", "Gb": "F#", "Cb": "B", "Fb": "E"}
    if len(note) > 2 and note[:2] in flats:
        note = flats[note[:2]] + note[2:]
    pitch, octave = note[:-1], int(note[-1])
    return A4 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


def env_exp(length: int, tau: float, attack: float = 0.004) -> np.ndarray:
    t = np.arange(length) / RATE
    env = np.exp(-t / tau)
    attack_samples = max(1, int(attack * RATE))
    env[:attack_samples] *= np.linspace(0, 1, attack_samples)
    return env


def music_box(freq: float, seconds: float, gain: float = 1.0) -> np.ndarray:
    """Struck tine: inharmonic partials, fast attack, metallic decay."""
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    partials = ((1.0, 1.0, 0.9), (2.01, 0.38, 0.55), (3.03, 0.16, 0.34), (4.21, 0.07, 0.22), (5.9, 0.03, 0.14))
    signal = np.zeros(length)
    for ratio, amplitude, tau in partials:
        signal += amplitude * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (tau * 0.6))
    signal *= env_exp(length, 0.55, 0.002)
    # The mallet: a 3 ms band of noise above 4 kHz.
    tick = np.random.default_rng(7).normal(0, 1, length) * np.exp(-t / 0.012)
    tick = np.convolve(tick, np.ones(9) / 9, mode="same")
    tick = np.concatenate([[0.0], np.diff(tick)])
    return gain * (signal * 0.5 + tick * 0.05)


def celesta(freq: float, seconds: float, gain: float = 1.0) -> np.ndarray:
    """Soft glass bar: sine plus a fifth, gentle attack."""
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    signal = (
        np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.85)
        + 0.18 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t / 0.5)
        + 0.06 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t / 0.3)
    )
    attack = int(0.012 * RATE)
    signal[:attack] *= np.linspace(0, 1, attack)
    return gain * signal * 0.42


def pad(freq: float, seconds: float, gain: float = 1.0) -> np.ndarray:
    """Detuned sine stack with a slow swell: the held breath under the melody."""
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    voices = ((1.0, 0.0), (1.003, 0.4), (0.997, -0.4), (2.0, 0.0), (3.0, 0.0))
    signal = np.zeros(length)
    for index, (ratio, detune) in enumerate(voices):
        vibrato = 1 + 0.0015 * np.sin(2 * np.pi * (0.21 + 0.03 * index) * t)
        signal += (0.55 ** index) * np.sin(2 * np.pi * freq * ratio * vibrato * t + detune)
    swell = np.minimum(1.0, t / 1.6) * np.minimum(1.0, np.maximum(0.0, (seconds - t)) / 1.8)
    return gain * signal * swell * 0.16


def strings(freq: float, seconds: float, gain: float = 1.0) -> np.ndarray:
    """A bowed cluster: harmonic series rolled off, with a slow attack."""
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    signal = np.zeros(length)
    for harmonic in range(1, 7):
        signal += (1.0 / harmonic) * np.sin(2 * np.pi * freq * harmonic * t + harmonic * 0.4)
    attack = np.minimum(1.0, t / 0.9)
    release = np.minimum(1.0, np.maximum(0.0, (seconds - t)) / 1.2)
    return gain * signal * attack * release * 0.075


def impact(seconds: float = 2.4, gain: float = 1.0) -> np.ndarray:
    """Low hit: a pitch-dropping sine plus a filtered noise body."""
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    f0 = 64 * np.exp(-t * 1.9) + 28
    phase = 2 * np.pi * np.cumsum(f0) / RATE
    body = np.tanh(1.8 * np.sin(phase)) * np.exp(-t / 0.75)
    rng = np.random.default_rng(3)
    noise = rng.normal(0, 1, length) * np.exp(-t / 0.18)
    noise = np.concatenate([[0.0], np.diff(noise)])
    return gain * (body * 0.55 + noise * 0.12)


def shimmer(seconds: float, gain: float = 1.0) -> np.ndarray:
    """A rising glass cluster that lands on the impact."""
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    signal = np.zeros(length)
    for index, note in enumerate(("A5", "C6", "E6", "A6")):
        freq = midi(note) * (1 + 0.004 * index)
        envelope = np.exp(-((t - seconds * 0.92) ** 2) / (2 * (seconds * 0.16) ** 2))
        signal += np.sin(2 * np.pi * freq * t) * envelope
    return gain * signal * 0.06


def reverb_ir(seconds: float = 3.4, seed: int = 19) -> tuple[np.ndarray, np.ndarray]:
    """A stereo hall impulse: decorrelated noise with a smooth decay."""
    rng = np.random.default_rng(seed)
    length = int(seconds * RATE)
    t = np.arange(length) / RATE
    channels = []
    for offset in (0.0, 0.011):
        noise = rng.normal(0, 1, length + int(offset * RATE))
        noise = np.diff(np.concatenate([[0.0], noise]))
        decay = np.exp(-t / (seconds * 0.34))
        ir = noise[:length] * decay
        # Darken the tail: a one-pole low pass, stronger later in the tail.
        smoothed = np.copy(ir)
        alpha = 0.22
        for index in range(1, length):
            smoothed[index] = smoothed[index - 1] * (1 - alpha) + ir[index] * alpha
        channels.append(smoothed)
    left, right = channels
    left /= np.max(np.abs(left)) or 1
    right /= np.max(np.abs(right)) or 1
    return left, right


def convolve(signal: np.ndarray, ir: np.ndarray) -> np.ndarray:
    size = 1 << int(math.ceil(math.log2(len(signal) + len(ir) - 1)))
    spectrum = np.fft.rfft(signal, size) * np.fft.rfft(ir, size)
    return np.fft.irfft(spectrum, size)[: len(signal) + len(ir) - 1]


def place(target: np.ndarray, signal: np.ndarray, at: float, gain: float = 1.0) -> None:
    start = int(at * RATE)
    if start >= len(target):
        return
    end = min(len(target), start + len(signal))
    target[start:end] += gain * signal[: end - start]


def score_moon_cocoon() -> tuple[np.ndarray, np.ndarray]:
    total = int((DURATION + TAIL) * RATE)
    dry_l = np.zeros(total)
    dry_r = np.zeros(total)

    # Harmonic bed: one chord per bar, 2.5 s each.
    chords = (
        ("A2", ("A3", "C4", "E4")),
        ("F2", ("F3", "A3", "C4")),
        ("C3", ("C4", "E4", "G4")),
        ("G2", ("G3", "B3", "D4")),
        ("A2", ("A3", "C4", "E4")),
        ("F2", ("F3", "A3", "C4")),
    )
    for index, (bass, chord) in enumerate(chords):
        at = OFFSET + index * 3 * BEAT
        place(dry_l, pad(midi(bass), 3.4, 0.9), at)
        place(dry_r, pad(midi(bass), 3.4, 0.9), at + 0.004)
        for voice, note in enumerate(chord):
            place(dry_l, pad(midi(note), 3.2, 0.5), at)
            place(dry_r, pad(midi(note), 3.2, 0.5), at + 0.006 * (voice + 1))

    # Melody: (bar, eighth offset, note, length in eighths, instrument)
    melody = (
        (0, 0, "A4", 3, "box"), (0, 3, "C5", 1, "box"), (0, 4, "E5", 2, "box"),
        (1, 0, "E5", 2, "box"), (1, 2, "D5", 1, "box"), (1, 3, "C5", 3, "box"),
        (2, 0, "C5", 2, "box"), (2, 2, "B4", 1, "box"), (2, 3, "A4", 3, "box"),
        (3, 0, "F4", 2, "box"), (3, 2, "A4", 1, "box"), (3, 3, "C5", 3, "box"),
        (4, 0, "E5", 2, "box"), (4, 2, "D5", 1, "box"), (4, 3, "C5", 3, "box"),
        (5, 0, "A4", 6, "box"),
    )
    eighth = BEAT / 2
    for bar, offset, note, length, kind in melody:
        at = OFFSET + bar * 6 * eighth + offset * eighth
        tone = music_box(midi(note), max(0.9, length * eighth + 0.9))
        place(dry_l, tone, at, 0.9)
        place(dry_r, tone, at + 0.012, 0.75)

    # Celesta counterpoint, only after the hall opens up.
    counter = (
        (1, 4.5, "A5"), (2, 1.5, "C6"), (2, 4.5, "A5"), (3, 1.5, "E5"),
        (3, 4.5, "G5"), (4, 1.5, "D5"), (4, 4.5, "E5"), (5, 1.5, "C5"),
    )
    for bar, beat, note in counter:
        at = OFFSET + bar * 6 * eighth + beat * eighth
        place(dry_l, celesta(midi(note), 2.4, 0.7), at)
        place(dry_r, celesta(midi(note), 2.4, 0.6), at + 0.02)

    # Build: a low string swell into the impact, then the wide chord.
    place(dry_l, strings(midi("A3"), 5.2, 0.9), 4.2)
    place(dry_r, strings(midi("E4"), 5.2, 0.7), 4.4)
    hit_at = 9.15
    place(dry_l, impact(2.6, 1.0), hit_at)
    place(dry_r, impact(2.6, 0.95), hit_at + 0.004)
    place(dry_l, shimmer(2.2, 1.0), hit_at - 1.6)
    place(dry_r, shimmer(2.2, 1.0), hit_at - 1.55)
    for voice, note in enumerate(("A3", "E4", "A4", "C5", "E5")):
        place(dry_l, strings(midi(note), 6.2, 0.8 - voice * 0.1), hit_at + 0.02)
        place(dry_r, strings(midi(note) * 1.001, 6.2, 0.8 - voice * 0.1), hit_at + 0.05)

    # Final high bell, left to ring.
    place(dry_l, celesta(midi("A6"), 3.6, 0.55), 13.6)
    place(dry_r, celesta(midi("E6"), 3.6, 0.45), 13.7)

    return dry_l, dry_r


def score_starfall() -> tuple[np.ndarray, np.ndarray]:
    """A thinner arrangement: arpeggios instead of a tune, no impact."""
    total = int((DURATION + TAIL) * RATE)
    dry_l = np.zeros(total)
    dry_r = np.zeros(total)
    eighth = BEAT / 2
    chords = (
        ("A2", ("A3", "C4", "E4", "B4")),
        ("F2", ("F3", "A3", "C4", "E4")),
        ("C3", ("C4", "E4", "G4", "D5")),
        ("G2", ("G3", "B3", "D4", "A4")),
        ("A2", ("A3", "C4", "E4", "B4")),
        ("F2", ("F3", "A3", "C4", "E4")),
    )
    for index, (bass, chord) in enumerate(chords):
        at = OFFSET + index * 6 * eighth
        place(dry_l, pad(midi(bass), 4.2, 1.0), at)
        place(dry_r, pad(midi(bass), 4.2, 1.0), at + 0.008)
        for step in range(6):
            note = chord[step % len(chord)]
            tone = celesta(midi(note), 1.8, 0.55)
            place(dry_l, tone, at + step * eighth, 0.8)
            place(dry_r, tone, at + step * eighth + 0.015, 0.65)
    # A single low bell marks the turn at 9.6 s, instead of an impact.
    place(dry_l, celesta(midi("A2"), 4.5, 1.0), 9.6)
    place(dry_r, celesta(midi("E3"), 4.5, 0.8), 9.62)
    place(dry_l, shimmer(2.4, 0.55), 8.4)
    place(dry_r, shimmer(2.4, 0.55), 8.45)
    place(dry_l, celesta(midi("A6"), 4.0, 0.4), 13.9)
    place(dry_r, celesta(midi("C7"), 4.0, 0.3), 14.0)
    return dry_l, dry_r


def score_cradle() -> tuple[np.ndarray, np.ndarray]:
    """A slow 3/4 waltz: music-box arpeggios under a celesta line, no impact."""
    total = int((DURATION + TAIL) * RATE)
    dry_l = np.zeros(total)
    dry_r = np.zeros(total)
    eighth = BEAT / 2
    bars = (
        ("D3", ("D3", "A3", "F4"), ("A4", "D5", "F5")),
        ("Bb2", ("Bb2", "F3", "D4"), ("F5", "E5", "D5")),
        ("F2", ("F2", "C3", "A3"), ("C5", "A4", "F4")),
        ("C3", ("C3", "G3", "E4"), ("G4", "A4", "Bb4")),
        ("D3", ("D3", "A3", "F4"), ("A4", "D5", "F5")),
    )
    for index, (bass, chord, melody) in enumerate(bars):
        at = OFFSET + index * 3 * BEAT
        place(dry_l, pad(midi(bass), 4.2, 1.0), at)
        place(dry_r, pad(midi(bass), 4.2, 1.0), at + 0.006)
        # Waltz accompaniment: root, fifth, third, fifth over the bar.
        pattern = (chord[0], chord[1], chord[2], chord[1])
        for step, note in enumerate(pattern):
            tone = music_box(midi(note), 2.0, 0.42)
            place(dry_l, tone, at + step * BEAT, 0.85)
            place(dry_r, tone, at + step * BEAT + 0.014, 0.7)
        # A celesta line, one note per beat.
        for step, note in enumerate(melody):
            place(dry_l, celesta(midi(note), 2.4, 0.55), at + step * BEAT)
            place(dry_r, celesta(midi(note), 2.4, 0.45), at + step * BEAT + 0.02)
    # A single high bell and a soft string swell, no percussive hit.
    place(dry_l, strings(midi("D4"), 4.0, 0.5), OFFSET + 8 * BEAT)
    place(dry_r, strings(midi("A3"), 4.0, 0.4), OFFSET + 8 * BEAT + 0.05)
    place(dry_l, celesta(midi("D6"), 4.0, 0.5), OFFSET + 12 * BEAT)
    place(dry_r, celesta(midi("A5"), 4.0, 0.4), OFFSET + 12 * BEAT + 0.03)
    return dry_l, dry_r


def render(name: str) -> Path:
    if name == "moon-cocoon":
        dry_l, dry_r = score_moon_cocoon()
    elif name == "starfall":
        dry_l, dry_r = score_starfall()
    else:
        dry_l, dry_r = score_cradle()
    ir_l, ir_r = reverb_ir()
    wet_l = convolve(dry_l, ir_l)
    wet_r = convolve(dry_r, ir_r)
    length = max(len(dry_l), len(wet_l))
    left = np.zeros(length)
    right = np.zeros(length)
    left[: len(dry_l)] += dry_l
    right[: len(dry_r)] += dry_r
    left[: len(wet_l)] += wet_l * 0.5
    right[: len(wet_r)] += wet_r * 0.5

    # Trim to the score, fade the head and tail, normalise.
    total = int((DURATION + TAIL) * RATE)
    left, right = left[:total], right[:total]
    t = np.arange(total) / RATE
    fade_in = np.minimum(1.0, t / 0.9)
    fade_out = np.clip((DURATION + TAIL - t) / 2.4, 0, 1) ** 1.5
    left *= fade_in * fade_out
    right *= fade_in * fade_out
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
    left = np.tanh(left / peak * 1.25) * 0.82
    right = np.tanh(right / peak * 1.25) * 0.82

    BUILD.mkdir(parents=True, exist_ok=True)
    wav_path = BUILD / f"opening-score-{name}.wav"
    stereo = np.stack([left, right], axis=1)
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(str(wav_path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(pcm.tobytes())

    m4a_path = OUT / {
        "moon-cocoon": "opening-score.m4a",
        "starfall": "opening-score-starfall.m4a",
        "cradle": "opening-score-cradle.m4a",
    }[name]
    ffmpeg = _ffmpeg()
    subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
         "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", str(m4a_path)],
        check=True,
    )
    print(f"{name}: {m4a_path.name} {m4a_path.stat().st_size} bytes")
    return m4a_path


def _ffmpeg() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as error:  # pragma: no cover - environment problem
        raise SystemExit("FFmpeg not found: install imageio-ffmpeg or put ffmpeg on PATH") from error


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", choices=("moon-cocoon", "starfall", "cradle", "all"), default="all")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    names = ("moon-cocoon", "starfall", "cradle") if args.variant == "all" else (args.variant,)
    for name in names:
        render(name)


if __name__ == "__main__":
    main()
