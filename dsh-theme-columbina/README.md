# 哥伦比娅 · 月下摇篮

> 把「少女」的月夜与摇篮曲，做成 **DeepSeek Harness Web GUI** 可以直接安装的深色主题：月下立绘、玻璃侧栏、电影式开屏，以及一副三首曲子的摇篮曲播放器。

- 主题包：`dsh-theme-columbina`
- 侧栏入口：`dsh-plugin-columbina`（可选）
- 对话语气：`dsh-plugin-columbina-persona`（可选）

## 特性

- **月夜配色**：深夜蓝画布 `#070b18`、月光白正文 `#e9eeff`、银紫品牌色 `#cbb6ee`、冰蓝链接 `#9fd8f5`、只在错误与第三首曲子里出现的玫瑰色 `#e39ac0`。
- **月下立绘**：铺满整个窗口画布；左侧渐变压暗保证正文可读，右侧留给人物与月亮。
- **玻璃侧栏**：半透明夜玻璃 + 银紫发丝描边 + 背景模糊。
- **玻璃输入框**、银紫焦点环、月光滚动条、低饱和代码块。
- **电影式开屏**：15 秒壁纸影片作底 + 启动 HUD（进度、时钟、诊断行）+ 原创八音盒摇篮曲；点击或任意键跳过，每个页面会话只播一次。
- **摇篮曲播放器**：右下角常驻的小月亮按钮，展开可选三首《新月的摇篮曲》、开关背景音乐、调音量；选择会记在本地。
- **可选的侧栏入口**：运行状态、摇篮曲面板、语气开关、重播开屏。
- **可选的对话语气**：让回复带上「少女」的口吻；代码、路径、报错仍保持精确。
- **深色专用**：启用期间钉住 `body[data-ds-dark-theme]`；禁用后立即回到 DSH 原生外观。

## 要求

- **DSH 0.2.1-rc.3** 或更高版本（Web GUI）。
- 一键安装脚本需要 PowerShell 7（`pwsh`）；手动安装见根目录 README。
- 播放摇篮曲需要能访问网易云音乐；离线时播放器显示 `OFFLINE`，界面不受影响。

## 安装

```powershell
pwsh -File .\install.ps1
```

装完**完整退出 DSH 再打开一次**：客户端插件声明（`dsh.client`）按包名缓存到进程结束。

只装主题：

```powershell
pwsh -File .\dsh-theme-columbina\install.ps1
```

### 验证

```text
http://127.0.0.1:<GUI端口>/theme-columbina/status
http://127.0.0.1:<GUI端口>/theme-columbina/music/deck
```

`/status` 返回 `theme: "columbina-lullaby"`、样式表命中次数和页面回传的实况。`/music/deck` 返回三首曲目的 id 与曲名（不含音频）。

## 开屏节奏

| 时间 | 画面 |
| --- | --- |
| 0–0.6s | 黑场；`COLUMBINA / THE DAMSELLETTE · SEAT III`、时钟、四角描边出现 |
| 0.6–1.4s | 壁纸影片淡入作底；HUD 依次显示「月相校准 / 载入摇篮曲 / 月影折射 / 权限确认」 |
| 1.4–9.1s | 进度与文案推进：摇篮曲起 → 梦境同步 → 权限确认；月光环缓慢收拢 |
| 9.15s | 命中：影片提亮 + 银白闪光 + 「月下摇篮」+ 进度 100% |
| 10.9s | `WELCOME TO` |
| 12.4s | 「月光作幕，歌声为枕」、`ACCESS GRANTED · THE DAMSELLETTE` |
| 15.3s | 整层淡出，交出工作界面 |

点击 / `Esc` / `Enter` / 空格跳过，22 秒硬兜底。地址带 `#opening` 可强制重播。

开屏配乐是 `assets/opening-score.m4a`（八音盒摇篮曲，原创，MIT）；同时附带 `opening-score-starfall.m4a`（钢片琴变奏）。想换默认曲目，把 `localStorage['columbina-opening-score']` 设为 `starfall` 即可，缺文件时会自动回退。

## 摇篮曲播放器

三首曲子**不在仓库里**。播放器把 `<audio>` 指向本机 Host 的 `/theme-columbina/music/stream?id=<songId>`，Host 再用固定白名单去网易云解析公开播放地址并把字节流转发过来：

- 仓库里只有曲目 id 和三首曲名，公开仓库不包含任何受版权保护的音频；
- 浏览器拿不到外链（CDN 拒绝外来 Referer），所以必须经过 Host 代理；
- 只有 `lib/index.js` 里 `TRACKS` 白名单中的 id 会被代理，不能当开放代理用；
- 离线或接口变动时返回 502，播放器显示 `OFFLINE`，不报错、不卡界面。

## 自定义

| 想改什么 | 改哪里 |
| --- | --- |
| 颜色 | `theme/theme.css` 第 1 节（palette） |
| 立绘位置 / 浓度 | `theme/theme.css` 第 2 节（`background-position` / 遮罩渐变） |
| 换一张底图 | 覆盖 `assets/background.webp`（16:9，建议 ≤ 2560×1440） |
| 只保留配色、不要立绘 | patch 条目加 `config: { art: false }` |
| 关掉音乐代理 | patch 条目加 `config: { music: false }` |
| 保留立绘但尊重系统浅色外观 | patch 条目加 `config: { forceDark: false }` |
| 临时关掉 | 给 patch 条目加 `disabled: true` |

## 结构

```text
dsh-theme-columbina/
├── package.json            # DSH bundle + client 声明
├── cordis.patch.yml        # bundle 安装时插入的 row
├── lib/index.js            # 宿主半边：资源路由、Range、网易云代理、自检
├── lib/client.js           # 浏览器半边：注入样式、钉住深色、开屏、摇篮曲播放器
├── theme/theme.css         # 全部视觉：token 覆盖 + 画布立绘 + 阅读遮罩
├── assets/                 # 背景、开屏影片/美术、原创配乐、图标与徽记
├── locale/                 # 插件管理器里的标题/说明
├── install.ps1 / uninstall.ps1
└── README.md / NOTICE.md / LICENSE / ASSET-LICENSE.md / PROVENANCE.json
```

## 工作原理（与桑多涅主题同构，但已重写）

1. **立绘必须画在画布上。** 桌面端的主窗口走 `dsh-app://app/` 自定义协议，框架外还套着 `display: contents` 的 provider；任何「找到框架元素再上色」的写法都会因为层级变化失效。所以 `html` 铺满立绘，`--dsw-alias-bg-base` 改成透明，凡是拿它铺底的地方都会透出来。
2. **`--dsw-specific-sidebar-fill` 必须是透明的。** Windows 自定义标题栏那条规则会用这个 token 把整个框架再刷一遍。
3. **样式表链接必须带版本号。** 自定义协议转发会丢掉 `cache-control` / `etag`，改了 CSS 页面还是旧的。
4. **绝不在 React 的树里增删节点。** 侧栏图标全部用纯 CSS 覆盖（伪元素），不碰 DOM。
5. **开屏样式必须内联。** 带 `data-plugin-css` 的 `<style>` 会被客户端内核当成插件样式回收。

## 兼容与排障

- 针对 DSH `0.2.1-rc.3` 验证；结构选择器只用了 `[class*="centerCol"|"sidebarCol"|"rightbarCol"|"composer"]` 这类稳定后缀。
- 升级后立绘 / 图标消失：多半是 DSH 改了后缀或 token 名，改 `theme/theme.css` 对应选择器即可。
- DSH 起不来：检查 profile 的 `package.json` 和 `cordis.patch.yml` 是否有 UTF-8 BOM；安装脚本会自动清理。
- 侧栏入口没出现：先 `Ctrl+R`，再完整退出 DSH 重开。

## 授权

代码 MIT。角色画面与开屏影片**不是** MIT，权利归原权利人；三首摇篮曲不在仓库内。详见 [ASSET-LICENSE.md](ASSET-LICENSE.md)、[NOTICE.md](NOTICE.md) 与仓库根目录的 `PROVENANCE.json`。

非官方同人主题，与 HoYoverse / COGNOSPHERE、DeepSeek 均无隶属或背书关系。
