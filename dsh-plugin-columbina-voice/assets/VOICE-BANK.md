# Columbina voice · original clips

This build speaks only original recordings cut from the user-provided full-voice
material. It does not call GPT-SoVITS, Windows SAPI, or any cloud TTS.

## Bank

- `assets/catalog.json` — **1071 clips** (catalog v2) with text, duration, source
  range, tags, `asrScore`, `sourceFingerprint` and the source key.
- `assets/clips/*.ogg` — **48 kHz** original audio, Opus 40 kbps, mono.
- `assets/templates.json` — C′ intent sequences, picked by tag from the bank
  itself (not by hand-assigned ids); D retrieval is the low-confidence fallback.

Only `usable` clips ship. Everything rejected during the rebuild (low ASR
agreement, name words, too short/long, duplicates) stays in the source tree at
`.assets-src/voice/v2/rejected/` and is not part of this plugin.

## Selection

1. Fixed intent (27 keys: enable, ack, soft, comfort, error, greeting,
   farewell, thanks, apology, affirm, deny, followup, refuse, unsure, waiting,
   done, goodnight, moon, sleep, friend, traveler, identity, off_topic,
   praise, criticize; code and fact stay empty) → C′ template, 1 clip per key,
   enable 2.
2. Otherwise split the assistant paragraph into sentences; try a template, then
   character-bigram retrieval over the ASR-verified `usable` set.
3. Technical sentences (code, commands, paths, URLs, stack traces) are dropped
   **before** intent matching, so an error log never gets a spoken line.
4. If the best retrieval score is below the threshold (`0.45` for ≤12 chars,
   `0.42` for longer), stay silent. The text remains on screen.
5. Maximum 2 clips per reply.

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

The bank is cut from three Bilibili references —

- `BV1C5s6zaE3P` 「【少女-哥伦比娅】角色训练语音素材」
- `BV1wt2jBwE4p` 「哥伦比娅6.2剧情纯净语音可拿来跑rvc」
- `BV1fQzSBMEbs` 「【原神】哥伦比娅全语音（CV：杨梦露）」

Rights remain with the original rights holders. This is a personal fan project;
public distribution must be checked against the rights holders' terms. The clip
files are not MIT.
