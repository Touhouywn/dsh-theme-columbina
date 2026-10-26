# 哥伦比娅语音 · 原声切片版

把 DSH 最后一段助手正文，换成**原声切片**念出来。没有 GPT-SoVITS、没有 SAPI、没有云端 TTS。

## 工作方式

- 页面右下角一枚 ♪ 按钮（在小月亮上面），点一下开/关。
- 开启时先播 `enable` 模板（C′）。
- 之后监听最后一段助手正文；停 1.4 秒不再变化才处理。
- 正文按句切开：
  1. 先查 C′ 意图模板：`ack` / `soft` / `error` / `greeting` / `farewell` / `thanks` / `moon` / `sleep` / `friend` / `traveler`，每个 1–3 段；
  2. 没有模板时走 D：字符双字组相似度检索，取最接近的**一段**原声；
  3. 分数低于 `threshold`（默认 0.32），或文本像代码/命令/URL，保持静默，只留文字。
- 每段最多拼 3 句；不词级剪切，不造新词。
- 原声库：`assets/catalog.json` + 481 个 `assets/clips/*.ogg`（Opus 40 kbps，约 6 MB）。

## 配置

`cordis.patch.yml`：

```yaml
config:
  mode: clips
  threshold: 0.32
  maxClips: 3
```

`threshold` 越高越保守；`maxClips` 限制每段拼接的句数，范围 1–3。

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
