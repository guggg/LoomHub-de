---
name: slide-study
description: 把簡報 PDF、錄音、錄影或參考附件整理成一份離線單檔 HTML 研究報告，可另外產出逐字稿與 NotebookLM 產物。單一入口 create，自動判斷來源情境（簡報逐頁對照、會議章節、錄影畫面重建、附件輔助），中間素材全部走系統暫存不落地。適用於研究一場演講的簡報、把會議錄音整理成可讀報告、從螢幕錄影重建重點畫面，或以錄音為主、PDF 附件為輔的綜合分析。使用者說「研究這份簡報」「把錄影整理成報告」「整理逐字稿」「錄影轉 HTML」時使用。需要 macOS + Apple Silicon。
type: skill
category: research
tags: [presentation, transcription, whisper, html-report, meeting-notes, screencast, notebooklm]
version: 0.1.1
owner: "@Miles"
updated: 2026-07-28
---

## 用途 / What

`slide-study` 把一份素材資料夾（簡報 PDF、錄音、錄影、參考附件）變成**一份離線單檔 HTML 研究報告**：圖片與 CSS 全部內嵌，單一檔案可直接寄給別人或存檔，不依賴任何外部資源。

它只給使用者一個入口 `create`。轉錄、PDF 判斷、截幀、內容對齊這些技術流程全部隱藏在工具裡，使用者只需要回答兩件事：這是什麼情境、要哪些產出。

中間素材（ASR JSON、截幀 PNG、暫存音軌）一律寫在系統暫存目錄，結束即清除。來源資料夾與成果資料夾都不會留下 `_work/`、`assets/`、`content.json` 這類殘骸。

## 使用場景 / When

- **研究一場演講**：簡報 PDF + 錄音 → 逐頁圖文對照報告，每頁配上講者當下說了什麼。
- **整理會議錄音**：只有錄音或錄影 → 依時間切成章節式報告。
- **從螢幕錄影重建重點**：沒有簡報檔，只有畫面錄影 → 自動抓取代表畫面並配上旁白。
- **附件輔助分析**：錄音是主要內容，另有信件或需求文件 PDF 當補充材料。
- 需要**可離線傳閱**的成果：單檔 HTML，不用附一包圖片資料夾。

**不適用 / 界線：**

- **非 macOS / 非 Apple Silicon**：ASR 走 `mlx-whisper`，Intel Mac 與 Linux 跑不動。沒有媒體檔的純 PDF 流程仍可用。
- **非中文素材**：語音辨識固定以中文送出，英文或日文演講的轉錄品質不保證。
- **需要人工精修的正式交付物**：產出是自動整理的研究稿，專有名詞與數字要回看原始素材確認，不是可以直接對外的成品。
- 想要**投影片式簡報頁**（一頁一屏、鍵盤翻頁）→ 這裡產出的是長捲軸研究報告，不是簡報。

> 同類（`category: research`）目前沒有其他資產，功能不與既有資產重疊。

## 前置需求

**平台**：macOS + Apple Silicon（`mlx-whisper` 限制）。

```bash
brew install ffmpeg poppler
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install mlx-whisper
uv tool install "notebooklm-py[browser]"   # 只有要用 NotebookLM 才需要
```

裝完先自我檢查，全部 OK 再開始：

```bash
python3 <SKILL_DIR>/scripts/slide_study.py doctor
```

`<SKILL_DIR>` 是安裝後的 skill 資料夾（例如 `~/.claude/skills/slide-study`）。

## 使用方式 / How

準備一個資料夾，把素材放進去，然後：

```bash
python3 <SKILL_DIR>/scripts/slide_study.py create "<資料夾>" \
  --scenario auto \
  --outputs html,transcript
```

`--scenario auto --outputs html,transcript` 是預設值，可以整段省略。**只問使用者情境與輸出兩件事；使用者已經在需求裡講明的，直接執行，不要重問。**

### 情境

| 參數 | 適用素材 |
|---|---|
| `auto` | 自動判斷；無法安全判定時才停下來問 |
| `presentation` | 簡報 PDF＋錄音／錄影，或只有簡報 |
| `meeting` | 只有錄音／錄影，產生章節式報告 |
| `screencast` | 螢幕錄影，自動擷取代表畫面 |
| `reference` | 錄音／錄影為主，PDF 信件或附件只作補充 |

### 輸出

| 值 | 說明 |
|---|---|
| `html` | 必要；離線單檔研究報告 |
| `transcript` | 有旁白來源時產生 Markdown 逐字稿；沒有就略過，不建空檔 |
| `notebooklm` | 明確指定時才登入、上傳與生成（見下節警告） |

支援組合：`html`、`html,transcript`、`html,notebooklm`、`html,transcript,notebooklm`。

### 來源衝突

資料夾裡有多個 PDF 或多個媒體檔時，工具會**停下來列出候選檔，不會自己選第一個**。把實際檔名呈現給使用者，只問必要的檔案角色，再以參數重跑：

```bash
--pdf <簡報 PDF>  --media <主要錄音或錄影>  --reference <參考附件 PDF>
```

### 成果

預設寫進來源資料夾底下的 `成果/`：

```text
成果/
├── <主題>_研究報告.html
└── <主題>_逐字稿.md
```

同名不覆寫，會自動加時間後綴。

## NotebookLM（選用）

> **⚠️ 資料外流警告**
> 加上 `--outputs notebooklm` 後，工具會用**瀏覽器自動化、以你自己的 Google 帳號**建立 notebook，並把**原始 PDF、逐字稿、逐頁說明上傳到 Google NotebookLM**。
> **內部或機密素材請勿使用這個選項。**
> 不加這個參數時，工具完全不會檢查登入、不會開瀏覽器、不會上傳任何東西。

```bash
python3 <SKILL_DIR>/scripts/slide_study.py create "<資料夾>" \
  --outputs html,transcript,notebooklm \
  --notebooklm-preset summary \
  --focus "決策、風險與後續行動"
```

套餐：`summary`（Podcast／心智圖／Briefing，預設）、`learning`（＋測驗、字卡、Study Guide）、`presentation`（Slide Deck／Briefing）、`all`、`custom`（搭配 `--notebooklm-artifacts`）。

未登入時工具會直接報錯並要求先登入，不會自己開登入流程。

## 交付前驗證

1. CLI 印出的成果檔都存在且非空。
2. HTML 不含 `assets/` 等外部圖片路徑（單檔性）。
3. 只有使用者要求的輸出被保留。
4. 未選 NotebookLM 時，過程中沒有任何 NotebookLM 動作。
5. 來源資料夾沒有殘留 `_work/`、`assets/`、`content.json`。

## Demo / 範例

```demo-conversation
user: 幫我把 ~/talks/手沖咖啡入門 這個資料夾整理成研究報告，裡面有簡報 PDF 和演講錄音
agent: 這個資料夾有 1 個 PDF、1 個錄音檔，我用 presentation 情境跑，輸出 HTML + 逐字稿。
agent: python3 ~/.claude/skills/slide-study/scripts/slide_study.py create "~/talks/手沖咖啡入門"
result: 成果/手沖咖啡入門_研究報告.html（逐頁圖文對照，圖片內嵌）
result: 成果/手沖咖啡入門_逐字稿.md（依時間分段）
```

多個候選檔時工具會停住，讓 agent 拿實際檔名回問使用者：

```demo-terminal
$ python3 ~/.claude/skills/slide-study/scripts/slide_study.py create "~/talks/產品說明會"
[slide-study][ERROR] 找到多個媒體檔，不會自動猜測：
  - 上午場.m4a
  - 下午場.m4a
請用 --media <檔名> 明確指定。

$ python3 ~/.claude/skills/slide-study/scripts/slide_study.py create "~/talks/產品說明會" --media 下午場.m4a
[slide-study] 情境：presentation；輸出：html,transcript
[slide-study] 轉錄：下午場.m4a
[slide-study] 完成，僅保留交付成果：
/Users/me/talks/產品說明會/成果/產品說明會_研究報告.html
/Users/me/talks/產品說明會/成果/產品說明會_逐字稿.md
```

只有錄影、沒有簡報時，自動走 `screencast` 擷取代表畫面：

```demo-terminal
$ python3 ~/.claude/skills/slide-study/scripts/slide_study.py create "~/talks/工具操作錄影" --scenario screencast --outputs html
[slide-study] 情境：screencast；輸出：html
[slide-study] 轉錄：工具操作錄影.mp4
[slide-study] 完成，僅保留交付成果：
/Users/me/talks/工具操作錄影/成果/工具操作錄影_研究報告.html
```

## 安裝 / Install

用 hub 的安裝腳本（同時裝進 Claude Code 與 Codex／Gemini）：

```bash
node scripts/install-skill.mjs slide-study
```

或手動 symlink：

```bash
ln -s "$PWD/skills/slide-study" ~/.claude/skills/slide-study
ln -s "$PWD/skills/slide-study" ~/.agents/skills/slide-study
```

symlink 不支援時改用複製（之後 hub 更新要重跑）：

```bash
cp -R skills/slide-study ~/.claude/skills/slide-study
cp -R skills/slide-study ~/.agents/skills/slide-study
```

裝好後 agent 會自動發現這個 skill；`scripts/slide_study.py` 會跟著資料夾一起就位。
