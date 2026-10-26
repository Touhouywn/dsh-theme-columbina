# Security

## 报告问题

- 这个仓库是主题与插件，不处理你的对话内容，也不往任何服务器发送消息。
- 发现密钥泄露、路径穿越、代理滥用之类的问题：请开一个 **Security advisory**（仓库的 Security 标签页），不要直接开公开 issue 贴真实 Key。
- 如果你只是装主题时出错，普通 issue 就行。

## 这个项目不做什么

- 不收集遥测，不写 `localStorage` 以外的持久化状态（只有播放器选择：曲目、音量、开关）。
- 不读取 DSH 的会话、凭据或 profile 配置；安装脚本只往 profile 的 `cordis.patch.yml` 追加 row（写前备份）。
- 不注册任何模型可见的工具或提示，唯一影响模型的是 `dsh-plugin-columbina-persona` 那一段**可关闭**的系统提示。

## 关于音乐代理

`/theme-columbina/music/stream` 只接受 `lib/index.js` 里 `TRACKS` 白名单中的三个 song id，其它 id 一律 403；它不是通用代理，也不能用来访问任意 URL。

## 关于密钥

- 仓库里没有 API Key、token 或 cookie。
- 安装脚本不会写任何账号信息。
- 发布前用 `grep`/`git secrets` 类工具扫一遍 `sk-`、`ghp_`、`Bearer`、`api_key` 等模式（见 [docs/release-checklist.md](docs/release-checklist.md)）。
