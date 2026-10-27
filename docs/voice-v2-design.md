# 哥伦比娅语音 v2：素材库重建 + 场景分层（设计稿）

> 依据：columbina-voice-pro-brief.md。素材形态=整轨长音频、无台本、路径待提供（未给处标「待标」）。本稿只做设计与可执行脚本方案，不写成品代码，不合成新语音。

## A 素材契约与预处理

**开工前核对清单**（拿到素材逐项填，缺项先补）：

| 项 | 要求 |
| --- | --- |
| 编码/容器 | 待标（flac/wav/mp4 均可） |
| 采样率 | 待标（≥32k 可用；<32k 记低质，音质结论下调） |
| 声道 | 待标（多声道取人声轨；无分离则 downmix 后 UVR5 去 BGM） |
| 人声数 | 待标（>1 人标出，重叠段丢弃或降级） |
| 语种/口音 | 待标（zh；语气词按实保留） |
| 重叠 | 待标（重叠段不切，直接丢弃） |
| 台本 | 无（已确认）→ ASR 文本即真值 |

**预处理规格**（默认值，首次跑完按实测回填）：

- 转码：WAV PCM，48k mono（听）+ 16k mono（ASR）；loudnorm `I=-18:TP=-1.5:LRA=11`。
- 静音门限：能量 -38 dB，最小静音 250ms；片长 0.6–10s；前留白 50ms、后留白 80ms；淡入 25ms、淡出 40ms。
- 输出目录：`.assets-src/voice/v2/{00-normalized,01-slices,02-asr,03-tagged}`，与已发布库物理隔离。

## B 切分规则

- 整轨→句：VAD 优先（能量 + 过零率两条件同时满足才判「声」）；无台本，ASR 词级边界做第二裁决。
- 冲突裁决：VAD 边界与 ASR 词边界差 >80ms 时，以 ASR 词边界为准，向外留 50/80ms。
- 防切词尾：切点两侧 80ms 内能量高于门限则内收至最近能量谷，不硬切。
- 碎片合并：<0.6s 且相邻间隙 <250ms 的并入相邻段；间隙 >1.2s 强制断开。
- 同句多版本（重录）：取 ASR 得分高者；同分取信噪比高、时长居中者；其余进 `rejected/` 留档不删。
- 产物：`segments.tsv`（源内序号、起止、时长、留白后边界、拒绝原因）。

## C 入库校验（重建核心）

- ASR：faster-whisper small、zh、beam 1（与现环境一致）；`asrText` 为真值。
- 归一化：OpenCC t2s；去标点/空格；数字转中文读法；语气词（嗯/啊/哦）保留。
- 分数：Dice(2-gram) 0.6 + 字符包含 0.4；长度惩罚：`|len(text)-len(asrText)|/len(text) >0.35` 直接 fail。
- 门限：≥0.55 可用；0.35–0.55 待抽听；<0.35 重切一次，仍低则丢弃；内容为哼唱/笑声且无法丢弃 → 降级 `text=""`、`usable=false`、tag=hum/filler，不参与检索。
- 重复判定（不只 bigram）：归一文本相同；或 asrText 相似 ≥0.9 且时长差 <15% → 判重，留得分高者。
- `usable` 责任：脚本自动判定（门限+受控标签+名字过滤）；人工抽检 ≥10%，且每个意图前 3 段必查；结果落 `audit.json`。

## D catalog v2 结构

保留 v1 全部字段，新增：

| 字段 | 用途 |
| --- | --- |
| id | 旧段沿用旧 id；新段从 c1001 递增，永不复用 |
| text | 无台本时 = asrText，标 `textSource:"asr"` |
| asrText | 真值（检索与意图判定只用它） |
| asrScore / usable | 同 C |
| tier | L0–L4 所属层 |
| tags[] | 受控词表（见下） |
| sourceFingerprint | 源文件 sha256 + 起止 + 源内序号 |

标签词表（完整枚举）：`enable, ack, soft, error, greeting, farewell, thanks, moon, sleep, friend, traveler, apology, affirm, deny, followup, refuse, unsure, waiting, done, identity, off_topic, praise, criticize, fact, code, hum, filler, question`。

迁移策略：旧 344 段保留 id 与 `templates.json` 指向，只补新字段；仅删除 ASR fail 或重复段。破坏面=被删段，模板不失效；新素材入库后按 C 去重合并。

## E 配额与覆盖率

达标线（高频意图必须覆盖 3 个时长档）：

| 级别 | 意图 | 最少段 | 时长档覆盖 |
| --- | --- | ---: | --- |
| 高频 | affirm/deny/followup/greeting/farewell/thanks/error | ≥6 | <1.5 / 1.5–3 / 3–6 全档 |
| 中频 | refuse/unsure/waiting/done/apology/comfort/traveler/identity | ≥4 | 至少 2 档 |
| 低频 | goodnight/off_topic/praise/criticize/fact/question | ≥3 | 至少 2 档 |
| 事件 | enable | 2 | 任意 |

空表模板（05 步跑完回填，未达标格标红）：

| 意图 | 段数 | <1.5s | 1.5–3s | 3–6s | 达标 |
| --- | ---: | ---: | ---: | ---: | --- |
| affirm | 待标 | 待标 | 待标 | 待标 | — |

目标：高频意图覆盖率 ≥90%，整体 usable 率 ≥85%；不足项由 E 表倒逼 L3，并输出 `missing-intents.json`。

## F 意图表

| id | 中文 | 触发信号（文字/位置特征） | 优先级 | 段数 | 降级 |
| --- | --- | --- | --- | --- | --- |
| affirm | 肯定 | 好的/可以/没问题/行 | P0 | 1 | D→静默 |
| deny | 否定 | 不行/不能/没有/不 | P0 | 1 | D→静默 |
| followup | 追问 | 呢？/怎么/为什么 | P1 | 1–2 | D→静默 |
| refuse | 拒答 | 拒绝/不能说/不方便 | P1 | 1 | D→静默 |
| unsure | 不确定 | 不确定/也许/可能/大概 | P1 | 1 | D→静默 |
| waiting | 长任务 | 稍等/处理中/正在/马上 | P1 | 1 | D→静默 |
| error | 报错 | 失败/错误/不行/无法 | P0 | 1 | D→静默 |
| done | 完成 | 完成/好了/搞定 | P1 | 1 | D→静默 |
| greeting | 打招呼 | 你好/早上好/晚上好（回复首句） | P0 | 1–2 | D→静默 |
| farewell | 告别 | 再见/拜拜/晚安 | P0 | 1 | D→静默 |
| thanks | 致谢 | 谢谢/感谢 | P0 | 1 | D→静默 |
| apology | 道歉 | 抱歉/对不起 | P0 | 1 | D→静默 |
| comfort | 安抚 | 别急/没事/没关系/慢慢 | P1 | 1 | D→静默 |
| goodnight | 道晚安 | 晚安/睡了 | P1 | 1 | D→静默 |
| traveler | 被叫旅行者 | 旅行者 | P1 | 1 | D→静默 |
| identity | 被问身份 | 我是谁/你叫什么/哥伦比娅 | P1 | 1–2 | D→静默 |
| off_topic | 闲聊离题 | 月亮/做梦/歌 | P2 | 1 | D→静默 |
| praise | 被夸 | 厉害/漂亮/聪明 | P2 | 1 | D→静默 |
| criticize | 被批评 | 批评/不满/太差 | P2 | 1 | D→静默 |
| code | 纯代码/命令 | 代码块/命令/路径/URL | P0 | 0 | 静默 |
| fact | 纯事实查询 | 数字/日期/名词串且无语气 | P2 | 0–1 | 静默优先 |

触发判定统一放在 04 步：正则 + 位置特征（首句/尾句），不写「感觉」。

## G 分层模型 L0–L4

| 层 | 名称 | 职责 | 判定顺序 | 放弃给 |
| --- | --- | --- | --- | --- |
| L0 | 事件原声 | enable 两段、严重错误提示 | 事件时最先 | — |
| L1 | 意图模板 C′ | F 表命中 → 1–3 段整片 | 句级，L4 之后 | L2 |
| L2 | 检索 D | usable 段上比 ASR 文本 | L1 未命中 | L3 |
| L3 | 素材不足静默 | 低于阈值/配额不足 | L2 低分 | 静默 |
| L4 | 技术静默 | 代码/命令/URL/堆栈 | 句级最前 | — |

顺序：句级先过 L4，再过 L1→L2→L3。E 的配额倒逼 L3：某意图未达标 → 该意图不启用 L1，直接 L2；L2 仍低分 → 静默并计入 `missing-intents.json`。主动触发/启动开关属流水线行为，不在本稿范围。

## H 阈值与 maxClips

- `0.32` 该动，改基准 **0.42**。理由：检索对象已过 0.55 ASR 门限，0.32 会放行语义无关段。反方理由=短语气句 bigram 分低，用分句长拆开：≤12 字 **0.45**，>12 字 **0.38**，fact/code **0（不检索）**。
- 可验证落地：首次建库后取 usable 段相似分的 P50/P75，若 P75<0.42 就按 P75 取值（数据说话，可反驳）。
- maxClips：普通回复 2；意图 1；enable 2；>3 不设。

## I 脚本职责划分

| 步骤 | 输入 | 输出 | 中间产物 | 回滚 |
| --- | --- | --- | --- | --- |
| 01 转码 normalize | 原始整轨 | 48k/16k wav + loudnorm 报告 | 00-normalized/ | 重跑覆盖 |
| 02 切分 vad | 16k wav | segments.tsv + slices | 01-slices/ | 删目录重跑 |
| 03 转写 asr | slices | asr.json（句级+词级） | 02-asr/ | 删文件重跑 |
| 04 打标 tag | asr.json + 词表 | tags.tsv + missing-intents.json | 03-tagged/ | 重跑 |
| 05 建库 build | slices + asr + tags + v1 catalog | catalog v2 + clips | stage/clips/ | 删 stage 重跑 |
| 06 校验 audit | catalog v2 + clips | audit.json + coverage 表 | 04-audit/ | 重跑 |

发布=06 通过后原子替换：旧 `assets/clips` 与 `catalog.json` 打包进 `backup/v2-<ts>/`，`templates.json` 一并迁移；任一断言失败不替换。每步可独立重跑，不污染已发布库。

## J 验收

- 指标：usable 率 ≥85%；高频意图配额达标 ≥90%；重复率 ≤3%；ASR 门限通过率入报告。
- 抽听：每意图前 3 段 + 随机 5% + farewell/greeting/identity 全量。
- 发布前：smoke（`/status`、`/catalog`、`/select` 意图与 D 样例断言）+ 版本号 + 旧库 zip 回退路径；断片即回退。

## K 必须静默的反例清单

代码块、行内代码、命令、路径、URL、报错堆栈、哈希/密钥/长数字串、表格、全英文技术段落、大段引用、用户消息（只念助手）、L3 低分、重叠人声段（已丢弃）。
