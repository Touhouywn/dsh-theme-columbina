# 开屏配乐候选

三段都按开屏时间轴写：0–1.2s 留白，1.2s 起音，9.15s 落点，15.3s 收，总长 17.2s。

| # | 候选 | 编曲 | 落点 | 权利 | 文件 |
| --- | --- | --- | --- | --- | --- |
| A | **月茧** Moon Cocoon（默认） | 八音盒主奏，低音弦铺底 | 有，9.15s | MIT（合成） | `dsh-theme-columbina/assets/opening-score.m4a` |
| B | 星落 Starfall | 钢片琴分解和弦，无落点 | 无 | MIT（合成） | `dsh-theme-columbina/assets/opening-score-starfall.m4a` |
| C | 新月的摇篮曲（其一）节选 | 官方原曲 17s | 有 | 仅本地试听 | `preview/audio/lullaby-i-excerpt.mp3` |

## 试听

```powershell
python preview/serve.py
# http://127.0.0.1:52881/preview/audition.html
```

## 结论

默认选 **A 月茧**：它是唯一既贴合「摇篮曲」意象、又能随公开仓库以 MIT 分发的选项。B 作为备选，C 只用于本地对照。

切换：`localStorage['columbina-opening-score'] = 'starfall'`（或 `'moon-cocoon'`），刷新页面生效。缺文件时会自动回退到 A。

## 重新生成

```powershell
python tools/build-score.py                  # 两套都出
python tools/build-score.py --variant starfall
```

脚本只用 numpy 与 FFmpeg（`imageio-ffmpeg` 自带），没有采样素材。
