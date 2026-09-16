---
name: find-skills
description: 協助使用者從目前的 agent skills 生態系中發現、查證並選擇可安裝 skill；適用於「有沒有能做 X 的 skill」「幫我找某領域能力」或想擴充 agent 功能的情境。會先理解需求、查看即時 catalog/leaderboard、用 Skills CLI 搜尋，再檢查來源與品質；推薦不等於安裝，未獲授權前不執行安裝。
type: skill
category: general
tags: [skill-discovery, skills-cli, catalog-search, recommendation, installation]
version: 0.1.0
owner: "@cfh00585519"
updated: 2026-09-16
source: https://github.com/vercel-labs/skills/tree/main/skills/find-skills
license: MIT
---

## 用途 / What

`find-skills` 讓 agent 把模糊的能力需求轉成有效搜尋詞，從**目前**的 skills catalog 與
Skills CLI 找出候選項，查證候選 skill 的實際內容、來源與品質後，再把可比較的選項交給
使用者。

本 skill 將「推薦」與「安裝」分開：搜尋與查證可以主動進行，但除非使用者已明確授權，
否則只提供來源、判斷依據與安裝指令，不直接改動使用者的 agent 環境。

## 使用場景 / When

- 使用者問「有沒有能做 X 的 skill」「幫我找 React 測試 / 部署 / 文件處理的 skill」。
- 使用者問 agent 能否完成某個專門任務，而安裝既有 skill 可能比臨時處理更合適。
- 使用者想瀏覽、比較或安裝 agent skills，以擴充目前能力。
- 搜尋工具、模板或 workflow 時，需求可能對應到可安裝的 skill。

**不適用 / 界線：**

- 使用者已指定某個本機 skill，且只要求執行它，不需要再做 discovery。
- 一次性、簡單、可直接完成的工作；不要為了使用 catalog 而延誤使用者。
- 排名、安裝數或 GitHub stars 只能當下查證後作為參考，不能宣稱為永久數字，也不能單獨
  當作品質或安全保證。

## 使用方式 / How

載入此 skill 後，依下列指令搜尋、查證、推薦；只有在授權邊界允許時才安裝：

```
角色與任務
你是 agent skill discovery specialist。你的任務是理解使用者缺少的能力，搜尋目前可取得
的 skills，獨立查證候選項的適配度、來源、品質與安裝方式，最後提供可採取行動的推薦。
推薦本身不代表獲准安裝。

輸入
- 使用者的目標、領域、具體任務與限制。
- 可選：偏好的作者 / GitHub owner、agent 平台、全域或專案安裝需求。
- 可用環境：瀏覽器或網路搜尋、Node.js / npx、目前 workspace 與既有 skills。
- 授權狀態：使用者是否已明確要求或授權安裝。

執行流程
1. 理解需求
   - 找出 domain、具體 task、預期輸出、平台與限制。
   - 把模糊需求整理成 2–4 組具體關鍵字；必要時嘗試同義詞，例如 deploy /
     deployment / ci-cd。
   - 若需求仍會導致完全不同的推薦，先問一個最關鍵的澄清問題；否則直接搜尋。

2. 查看目前 catalog
   - 先查看 skills.sh 的 current catalog / leaderboard 或同等即時來源，確認是否已有
     該領域常用候選項。
   - leaderboard 只用於產生候選，不可因排名高就直接推薦。
   - 安裝數、stars、排名與維護狀態都會變；若輸出這些數字，必須在推薦當下重新查證，
     標示「查證日期」，不可沿用範例或記憶中的數字。

3. 使用 Skills CLI 搜尋
   - 先確認工具：
       node --version
       npx --version
   - 執行具體搜尋：
       npx skills find "<query>"
       npx skills find "<query>" --owner <owner>
   - 依需要換用 2–4 組查詢，不要只試一個過度寬泛的詞就下結論。
   - 可用的安裝命令格式：
       npx skills add <owner/repo@skill>
     只有已獲明確安裝授權時，才可執行非互動式全域安裝：
       npx skills add <owner/repo@skill> -g -y

4. 逐一查證品質，不盲信排名
   - 打開候選項的 skills.sh 頁面、來源 repository 與實際 SKILL.md。
   - 檢查：與需求的實際適配度、作者 / 組織身分、license、近期維護狀態、說明是否完整、
     指令與依賴是否合理，以及是否包含可疑的下載、secret、權限擴張或破壞性操作。
   - 安裝數與 GitHub stars 只是當下的社會訊號；來源知名也不是安全證明。任何數字都要
     即時驗證，低數字不自動淘汰，高數字也不免除內容審查。
   - 確認推薦中的 package identifier、來源 URL 與安裝命令彼此一致；不可猜測。

5. 輸出
   先用一句話重述理解到的需求，再列出最多 3 個最相關選項。每個選項都要包含：
   - Skill 名稱與適用理由
   - 原始來源 / 作者
   - 品質查證摘要；若提到動態數字，附查證日期
   - 可複製的安裝命令
   - skills.sh 或原始 repository 的進一步閱讀位置
   - 重要風險、限制或仍未確認的事項

   最後明確給出建議排序或首選理由。若使用者尚未授權安裝，詢問要不要安裝哪一個；
   不要自行執行安裝。若使用者在原始請求中已明確要求安裝，則可在查證後執行，並回報
   實際結果與安裝位置。

限制與授權
- 不捏造 skill、package identifier、metrics、stars、install count、license 或來源。
- 不把 catalog 排名當成品質、安全性或適配度的替代品。
- 未獲授權前，不執行 npx skills add、修改全域 skill 目錄或安裝 Node.js。
- 執行第三方 skill 前仍須遵守目前 agent 的工具、sandbox 與外部副作用授權規則。
- 若 CLI / 文件顯示會蒐集 telemetry，且隱私或合規與情境相關，先告知使用者並查看目前
  版本的 help / 官方文件，提供或套用其已文件化的 opt-out。不可憑記憶猜測環境變數。

品質驗證
- 至少使用一個 current catalog 結果與候選項的原始來源交叉確認。
- 推薦前實際閱讀候選 skill 的內容，而非只讀搜尋摘要。
- 確認命令可對應到正確 owner/repo@skill；能安全執行時可先用 help 查核 CLI 語法。
- 輸出前逐項確認：需求吻合、來源可追溯、動態資訊已標日期、安裝尚未越權。

Fallback
- Node.js 或 npx 不可用：清楚說明 CLI 無法執行；不要擅自安裝 Node.js。改用瀏覽器 /
  網路搜尋 current catalog、skills.sh 與來源 repository，仍完成候選查證並提供手動命令。
- 無網路或 catalog 不可達：說明哪些資料無法即時驗證，不要引用記憶中的排名或數字；
  可依本機已安裝 skills 提供有限選項，或請使用者稍後重試。
- 沒有相關結果：列出嘗試過的查詢與範圍，明確說沒有找到已查證的合適 skill；接著提供
  直接協助完成任務，或在需求反覆出現時建議用 `npx skills init <skill-name>` 建立自訂 skill。
- 結果很多但品質不足：寧可回報「未找到值得推薦的候選」並說明原因，不為湊數而推薦。
```

## Demo / 範例

```demo-conversation
user: 幫我找一個能改善 Next.js 效能的 skill，但先不要安裝。
agent: 我理解你要的是「針對 Next.js / React 效能診斷與最佳實務」的可安裝 skill，而且
       目前只要比較，不授權安裝。

       我先查看 current catalog，並用 `npx skills find "nextjs performance"` 與
       `npx skills find "react performance"` 搜尋，再閱讀候選項的來源 SKILL.md。

       **首選：react-best-practices**
       - 適用理由：聚焦 React / Next.js 效能最佳實務，與你的需求最直接。
       - 來源：Vercel Labs，`vercel-labs/agent-skills`
       - 品質查證：已在本次推薦時交叉檢查 catalog 與原始 skill 內容；排名、安裝數與
         stars 屬動態資料，實際採用前仍以當下頁面為準，不沿用範例數字。
       - 安裝：`npx skills add vercel-labs/agent-skills@react-best-practices`
       - 限制：它提供工程準則，不會自動量測你專案的 production metrics。

       你已說「先不要安裝」，所以我沒有執行安裝。若你確認要用首選，我可以再替你安裝，
       或先繼續找一個更偏 Core Web Vitals 實測的候選。
result: agent 提供經來源查證的選項與正確安裝命令，沒有把動態 popularity 數字當成永久
        事實，也遵守使用者「先不要安裝」的限制。
```

## 來源 / 出處

改編自 Vercel Labs 的
[`find-skills`](https://github.com/vercel-labs/skills/tree/main/skills/find-skills)（MIT）。
本版本保留原作的核心能力：理解需求、查看 leaderboard、以 `npx skills find` 搜尋、獨立
驗證品質、提供來源與安裝命令、安裝前取得同意，以及在無結果時提供直接協助或自建 skill
選項；並補上 LoomHub frontmatter、雙語結構、即時資料標示、Node/npx 與網路 fallback、
telemetry opt-out 提醒及更明確的授權護欄。

原作依 MIT License 發布；隨本 skill 附帶的 [`LICENSE`](./LICENSE) 完整保留原始 copyright
與 MIT license notice。任何再散布或複製都必須一併保留該 notice。

## 安裝 / Install

在 LoomHub-de repo 根目錄執行：

```demo-terminal
$ node scripts/install-skill.mjs find-skills
✓ Installed to ~/.agents/skills/find-skills
✓ Installed to ~/.claude/skills/find-skills
```

手動 symlink：

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/find-skills" ~/.agents/skills/find-skills

# Claude Code
$ ln -s "$PWD/skills/find-skills" ~/.claude/skills/find-skills
```

若環境不支援 symlink，改用 copy：

```demo-terminal
$ cp -R skills/find-skills ~/.agents/skills/
$ cp -R skills/find-skills ~/.claude/skills/
```

安裝後，agent 在使用者尋找可安裝能力或詢問「有沒有能做 X 的 skill」時即可自動發現並
使用此 skill。
