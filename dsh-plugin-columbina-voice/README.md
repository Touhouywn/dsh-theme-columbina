# 哥伦比娅语音 · 原声切片版

把 DSH 最后一段助手正文，换成**原声切片**念出来。没有 GPT-SoVITS、没有 SAPI、没有云端 TTS。

## 工作方式

- 右下角 ♪ 开关；**默认开启**，显式关闭才关。
- 监听最后一段助手正文（MutationObserver，1200ms 稳定触发，容器缺失时轮询兜底）。
- 每条会话的首条回复**主动念**，不用点；新回复打断旧音频。
- 正文按句处理：
  1. L4：代码/命令/路径/URL/堆栈先过滤，永不出声；
  2. L1：27 键意图模板（enable/ack/soft/comfort/error/greeting/farewell/thanks/apology/affirm/deny/followup/refuse/unsure/waiting/done/goodnight/moon/sleep/friend/traveler/identity/off_topic/praise/criticize；code/fact 留空走 L2），每键 1 段、enable 2 段；
  3. L2：字符双字组检索（只用 ASR 验证过的 usable 段，名字词排除）；≤12 字阈值 0.45、>12 字阈值 0.42；
  4. L3：低于阈值静默，只留文字。
- 每回复最多 2 段；不词级剪切，不造新词，不调 TTS。
- 原声库：`assets/catalog.json` + 1071 个 `assets/clips/*.ogg`（48 kHz Opus 40 kbps）。
- D 检索只使用 ASR 验证过的切片（`usable`）；C′ 模板按音频实际内容人工校正。

## 配置

`cordis.patch.yml`：

```yaml
config:
  mode: clips
  thresholdShort: 0.45
  thresholdLong: 0.42
  maxClips: 2
```

`thresholdShort/Long` 越高越保守；`maxClips` 限每回复句数。

## 路由

```text
GET  /columbina-voice/status
GET  /columbina-voice/catalog
GET  /columbina-voice/clip/<id>
POST /columbina-voice/select    {"text":"..."} 或 {"intent":"enable"}
```

`/columbina-voice/speak` 返回 410：这版不再实时合成。

## 安装

```powershell
pwsh -File .\install.ps1
```

然后完整重启 DSH。根目录的 `install.ps1` 会一起装主题、工坊、语气和这枚语音插件。

## 素材与权利

原声来自用户提供的全语音素材及 Bilibili 参考 `BV1fQzSBMEbs`（CV：杨梦露）。声音权利归原权利人；这是个人同人项目，公开分发前请按权利人条款确认。切片文件不是 MIT，见 `NOTICE.md` / `ASSET-LICENSE.md`。
