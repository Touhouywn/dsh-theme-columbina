# 发布检查清单

每次把仓库推到公开之前，从上往下过一遍。

## 1. 密钥

```powershell
git grep -n -I -E "sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_|Bearer [A-Za-z0-9._-]{20,}|api[_-]?key\s*[:=]" -- .
```

- [ ] 命中项逐条确认是示例而不是真 Key。
- [ ] 仓库 Settings → Code security → **Secret scanning** 与 **Push protection** 已开。
- [ ] `.gitignore` 覆盖 `.env*`、`*.pem`、`*.key`、`secrets.*`、`credentials.*`，以及本地研究目录。

## 2. 素材权利

- [ ] `dsh-theme-columbina/assets/` 里没有新增的第三方音频。
- [ ] 三首摇篮曲只以 song id 形式出现（`lib/index.js` 的 `TRACKS`）。
- [ ] `preview/audio/lullaby-i-excerpt.mp3` 这类本地对照文件没有进版本库。
- [ ] 截图里没有别人的账号名、工作区路径、真实对话内容。
- [ ] `ASSET-LICENSE.md` / `NOTICE.md` / `CREDITS.md` 与实际文件一致。

## 3. 功能

- [ ] `node dsh-theme-columbina/tools/smoke.mjs` 通过。
- [ ] `node dsh-theme-columbina/tools/audit-tokens.mjs <DSH 客户端包>` 输出 `unknown 0`。
- [ ] `/theme-columbina/status`、`/theme-columbina/music/deck`、`/columbina-hub/status`、`/columbina-persona/status` 都通。
- [ ] 冷启动能播开屏；点右下角小月亮能出声；三首都能切；关掉后不再自动播。
- [ ] 侧栏「月下摇篮」面板能切换语气。

## 4. 仓库卫生

- [ ] 根目录 `README.md` 的截图路径都存在。
- [ ] `PROVENANCE.json` 重新生成过（`python tools/make-provenance.py`）。
- [ ] 提交信息里没有内部路径。
- [ ] `git status` 干净，`dist/`、`.research/`、`.dshhome/` 没被带上。

## 5. 发布

```powershell
python tools/build-release.py
# 生成 dist/dsh-theme-columbina-<version>.zip 与 SHA256SUMS-v<version>.txt
```

- [ ] `gh repo create <owner>/dsh-theme-columbina --public --source . --remote origin --push`
- [ ] 打 tag：`git tag v1.0.0 && git push origin v1.0.0`
- [ ] Release 附上 zip 与哈希，说明「素材不随仓库再授权」。
- [ ] 仓库描述、Topics（`dsh`, `theme`, `genshin`, `columbina`）补齐。
