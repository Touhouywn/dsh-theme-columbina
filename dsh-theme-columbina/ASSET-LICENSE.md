# 素材权利说明 / Asset license

**代码是 MIT，素材不是。**

- 本仓库新增的代码（`lib/`、`theme/theme.css`、安装脚本、构建脚本、语气提示文本）：**MIT**，见 [LICENSE](LICENSE)。
- `assets/background.webp`、`assets/opening-art.webp`、`assets/opening.mp4`、`docs/opening-poster.png` 里的角色形象与画面：**不属于 MIT**。它们来自用户提供的插画与 Wallpaper Engine 创意工坊素材，权利归原作者 / 权利人，本仓库不提供再授权。
- `assets/icon.png`、`assets/ornament-*.png` 是由本仓库脚本绘制的原创图形（月牙、星、羽毛、花、铃、摇篮、音符），随代码以 MIT 发布。
- 主界面播放的三首《新月的摇篮曲》**不包含在仓库里**。播放器在运行时通过本机 Host 代理访问网易云音乐的公开播放地址，音频版权归 HOYO-MiX / 权利人所有。仓库只保存曲目 id 与曲名，用于显示与索引。
- `assets/opening-score.m4a`、`assets/opening-score-starfall.m4a`：由 `tools/build-score.py` 用 numpy 从零合成的原创配乐，随代码以 MIT 发布。

如果你要二次分发、镜像或商用，请先自行确认上述第三方素材的授权。移除 `assets/` 中的角色画面与 `opening.mp4` 后，主题仍可运行（开屏会退到暗场 + HUD，界面回退到纯渐变底色）。
