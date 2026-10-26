# Columbina voice · original clips

This build speaks only original recordings cut from the user-provided full-voice
material. It does not call GPT-SoVITS, Windows SAPI, or any cloud TTS.

## Bank

- `assets/catalog.json` — 481 clips with text, duration, source range and tags.
- `assets/clips/*.ogg` — 32 kHz original audio, Opus 40 kbps, mono.
- `assets/templates.json` — C′ hand-authored intent sequences; D retrieval is
  the low-confidence fallback.

## Selection

1. Fixed intent (enable, ack, thinking, soft, error, greeting, farewell, thanks,
   apology) → C′ template, 1–3 whole clips.
2. Otherwise split the assistant paragraph into sentences; try a template, then
   character-bigram retrieval.
3. If the best retrieval score is below `threshold` (default 0.32), or the text
   looks like code/commands/URLs, stay silent. The text remains on screen.
4. Maximum 3 clips per paragraph.

No word-level splicing is used: only whole short clips, joined with a short
fade. That keeps the original performance intact.

## Routes

```text
GET  /columbina-voice/status
GET  /columbina-voice/catalog
GET  /columbina-voice/clip/<id>
POST /columbina-voice/select   {"text":"..."}  or  {"intent":"enable"}
```

`/columbina-voice/speak` is retired with 410: this build has no live TTS.

## Source and rights

The bank is cut from the user's full-voice compilation and the Bilibili
reference `BV1fQzSBMEbs` (CV: 杨梦露). Rights remain with the original rights
holders. This is a personal fan project; public distribution must be checked
against the rights holders' terms. The clip files are not MIT.
