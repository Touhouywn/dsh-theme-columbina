# 开屏配乐候选

三段都按开屏时间轴写：0–1.2s 留白，1.2s 起音，9.15s 落点，15.3s 收，总长 17.2s。

| # | 候选 | 编曲 | 落点 | 权利 | 文件 |
| --- | --- | --- | --- | --- | --- |
| A | **月茧** Moon Cocoon（默认） | 八音盒主奏，低音弦铺底 | 有，9.15s | MIT（合成） | `dsh-theme-columbina/assets/opening-score.m4a` |
| B | 星落 Starfall | 钢片琴分解和弦 | 无 | MIT（合成） | `dsh-theme-columbina/assets/opening-score-starfall.m4a` |
| C | 摇篮 Cradle | 3/4 慢圆舞，八音盒 + 钢片琴 | 无 | MIT（合成） | `dsh-theme-columbina/assets/opening-score-cradle.m4a` |

## 试听

```powershell
python preview/serve.py
# http://127.0.0.1:52881/preview/audition.html
```

也可以在侧栏「月下摇篮 → 开屏 → 配乐」里点选，下一次开屏生效。

## 结论

默认 **A 月茧**：它唯一在 9.15 秒有落点，和开屏的闪光、标题落位对得最齐；B 更空，C 最软、最像真的摇篮曲。

## 切换

```js
localStorage['columbina-opening-score'] = 'cradle'   // 'moon-cocoon' | 'starfall' | 'cradle'
```

## 重新生成

```powershell
python tools/build-score.py                  # 三套都出
python tools/build-score.py --variant cradle
```

脚本只用 numpy 与 FFmpeg（`imageio-ffmpeg` 自带），没有采样素材。
