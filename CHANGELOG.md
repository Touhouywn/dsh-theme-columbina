# Changelog

## 1.1.2 — 2026-10-26

- **重新裁剪原声切片**：改用 20ms 帧 RMS 边界，保留句内停顿、剔除边缘短噪声；前导/尾部静音从 29+35 条降到 1+3 条（均 <0.25s），缺失 0 条。
- 语音库 **480** 段；模板 ID 按文本保留，C′ 映射不变。
- **月下摇篮加入语音控制**：状态、切换、试听；通过 `columbina:voice` 事件与右下角 ♪ 同步，试听走宿主 `select` + 原声切片。
- 主题 **1.1.2**，voice **0.2.2**，hub **1.0.1**。

## 1.1.1 — 2026-10-26

- **修复语音客户端防抖**：`watch()` 的 900ms 轮询每次都会 `clearTimeout` 并重置 1400ms 定时器，导致正文永远等不到触发点。改为只保留一个等待中的定时器，到点清零后再 `speak()`。
- 关闭语音时同时清掉待触发的定时器；开启时仍然先播 `enable` 序列。
- voice 插件升 **0.2.1**，主题升 **1.1.1**；音频库、C′/D 选择逻辑和路由不变。

## 1.1.0 — 2026-10-26

- **原声语音库**：`dsh-plugin-columbina-voice` 0.2.0；481 段原声切片（Opus 40 kbps，约 6 MB），默认 `mode: clips`。
- **C′ 意图序列**：enable / ack / soft / error / greeting / farewell / thanks / moon / sleep / friend / traveler；每段 1–3 句，只拼完整原声。
- **D 低置信度兜底**：字符双字组相似度；低于 `threshold`（默认 0.32）、问题句、代码/命令/URL 一律静默，只留文字。
- **移除实时 TTS**：`/columbina-voice/speak` 返回 410；不再调用 GPT-SoVITS 或 Windows SAPI。
- 主题版本升 **1.1.0**；根安装器/卸载器、release builder 都纳入语音插件与 `assets/clips/`。
- 语音素材权利说明补入 `NOTICE.md`；公开分发前需按权利人条款确认。
