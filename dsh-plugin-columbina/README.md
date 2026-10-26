# 月下摇篮 · 侧栏入口

`dsh-plugin-columbina` 是哥伦比娅主题的可选侧栏页：在左侧栏加一行「月下摇篮」，点开后可以

- 看主题是否真的挂载（`/theme-columbina/status` 的命中数、页面回传的实况）；
- **切换三首《新月的摇篮曲》**、开关背景音乐、调音量（驱动主题自带的播放器实例）；
- 切换「哥伦比娅语气」（需要 `dsh-plugin-columbina-persona`）；
- 重播开屏、复制诊断 JSON。

它只读主题的公开自检路由、调用主题暴露的播放器 API，不改 DSH 核心、配置文件或其他插件。

## 安装

```powershell
pwsh -File .\install.ps1
```

安装脚本会复制到 `%DSH_HOME%\plugins\columbina-hub`、在 profile 的 `node_modules` 里建 junction，并往 `cordis.patch.yml` 追加一条 `columbina-hub` row。

## 验证

```text
http://127.0.0.1:<GUI端口>/columbina-hub/status
```

返回 `{ plugin: "columbina-hub", pings, lastPing }`；`lastPing.panels` 是页面里实际注册的面板 id 列表。
