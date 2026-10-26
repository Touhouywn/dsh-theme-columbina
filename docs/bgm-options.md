# 开屏配乐

只有一首，**月茧 / Moon Cocoon**。

- 编曲：八音盒主奏，低音弦铺底，9.15 秒一记低频落点
- 调性 / 速度：A 小调，72 BPM，6/8
- 长度：17.2 秒，和开屏同一根时间轴（0–1.2s 留白，1.2s 起音，9.15s 落点，15.3s 收）
- 文件：`dsh-theme-columbina/assets/opening-score.m4a`
- 权利：`tools/build-score.py` 从零合成，随代码以 MIT 发布

## 为什么是它

三首候选里只有它在 9.15 秒有落点，正好压住圆窗涨满全屏的闪光；另外两首（钢片琴、圆舞曲）都已移除，不再保留。

## 重新生成

```powershell
python tools/build-score.py
```

只用 numpy 与 FFmpeg（`imageio-ffmpeg` 自带），没有采样素材。
