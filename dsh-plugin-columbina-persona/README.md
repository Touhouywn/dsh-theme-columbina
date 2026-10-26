# 哥伦比娅语气

`dsh-plugin-columbina-persona` 往系统提示里加一段可开关的「哥伦比娅」人格：短句、省略号、偶尔用哼唱代替回答；技术内容仍然精确。

## 安装

```powershell
pwsh -File .\install.ps1
```

装完即生效（下一次回复开始），无需重启。

## 控制

```text
GET  /columbina-persona/status
POST /columbina-persona/enabled   {"enabled": true|false}
POST /columbina-persona/toggle
```

`/enabled` 是幂等的：调用方声明目标状态，重复请求不会把开关翻来翻去。侧栏「月下摇篮」里也有同样的开关。

## 覆盖

在 patch 条目里给 `config.persona` 传自己的提示文本即可完全替换；`config.language: "en"` 使用英文版。`config.enabled: false` 则默认关闭。
