# Changelog

## 1.1.0 — 2026-10-26

- **原声语音库**：`dsh-plugin-columbina-voice` 0.2.0；481 段原声切片（Opus 40 kbps，约 6 MB），默认 `mode: clips`。
- **C′ 意图序列**：enable / ack / soft / error / greeting / farewell / thanks / moon / sleep / friend / traveler；每段 1–3 句，只拼完整原声。
- **D 低置信度兜底**：字符双字组相似度；低于 `threshold`（默认 0.32）、问题句、代码/命令/URL 一律静默，只留文字。
- **移除实时 TTS**：`/columbina-voice/speak` 返回 410；不再调用 GPT-SoVITS 或 Windows SAPI。
- 主题版本升 **1.1.0**；根安装器/卸载器、release builder 都纳入语音插件与 `assets/clips/`。
- 语音素材权利说明补入 `NOTICE.md`；公开分发前需按权利人条款确认。
