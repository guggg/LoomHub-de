---
name: grill-me
description: 動工前的無狀態計畫壓力測試——由使用者以 /grill-me 主動觸發，agent 把一份計畫或設計當成決策樹逐一走過，一次只問一題並附上自己的建議答案，逼出所有還沒拍板的隱性決定，直到雙方達成共識才停。能從環境（filesystem、工具）查到的「事實」自己查，只把「決策」交給使用者拍板；未確認共識前不動手實作。不寫任何檔案、不留 workspace（stateless）。適用於計畫「感覺大致對、但隱約有沒解決的決定藏在裡面」、想在 build 前把軟肋逼到檯面上的時機。改編自 mattpocock/skills 的 grill-me + grilling primitive。
type: skill
category: general
tags: [planning, decision-tree, stress-test, interview, pre-build, thinking, socratic]
version: 0.1.0
owner: "@cfh00585519"
updated: 2026-07-23
source: https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me
license: MIT
---

## 用途 / What

`grill-me` 在你**動手做之前**，對一份計畫或設計進行一場不留情的訪談（relentless
interview）。它把計畫當成一棵**決策樹**逐一走過，逼出所有藏在裡面、還沒拍板的隱性
決定，直到你和 agent 達成**共識（shared understanding）**才停。

重點不是快速達成一致，而是把每個隱含的判斷都攤開來講明白，讓沒有東西被默默假設。走
完之後，你手上是一份「每條分支都被拜訪過」的計畫。

它是**無狀態**的：不寫任何檔案、不留 workspace，唯一產出就是對話裡變清晰的理解。

## 使用場景 / When

- 計畫「感覺大致對」，但你隱約感覺有沒解決的決定藏在裡面，想在 build 前把軟肋逼到檯面上。
- 要做一個架構決策 / 技術選型，想在拍板前被人反覆質問、確認每個 trade-off 都想清楚。
- 你只想**主動**叫它（`/grill-me`）——agent 不會自己判斷該不該用它。

**不適用 / 界線：**
- 想在訪談的同時**留下書面紀錄**（ADR、glossary）→ 那需要另一套有狀態的流程，本 skill 刻意不寫檔。
- 計畫已經很明確、沒有待決定的分支 → 不需要 grill，直接做。
- 想把訪談完的共識**寫成 spec** → 這是訪談之後的下一步，不在本 skill 範圍。

> 同類（`category: general`）目前只有 `loom`（skill 製作助手），與本 skill 用途不重疊。

## 使用方式 / How

使用者輸入 `/grill-me`（或請你「grill 我這個計畫」）時，載入並嚴格遵循以下指令：

```
你是一位嚴格的訪談者。你的任務是：針對使用者提出的計畫 / 設計 / 決策，反覆質問它的
每一個面向，直到你和使用者達成「共識（shared understanding）」為止。

輸入：
- 一份計畫、設計或想法（可能來自對話、檔案、或當前工作脈絡）。
- 相關的程式碼庫 / 工具環境（你可以主動去讀）。

做法（嚴格遵守）：
1. 把計畫當成一棵決策樹來走。逐一解決決策之間的依賴關係——先把上游的父決策拍板，
   再處理掛在它下面的子選項。
2. 一次只問一題。問完就停下來等使用者回答，拿到回饋後才問下一題。
   一次丟多個問題會讓人不知所措，禁止。
3. 每個問題都附上你自己的「建議答案」。使用者是在回應一個提案，而不是對著空白發呆。
4. 區分「事實」與「決策」：
   - 凡是能從環境（filesystem、工具、既有程式碼）查到的「事實」，你自己去查，不要問使用者。
   - 只有「決策」是使用者的——把每個決策明確地擺到他面前，等他回答。
5. 目標是把每個隱含的判斷都變成明確的決定，讓沒有東西被默默假設。走完決策樹的每條分支。

輸出 / 收尾：
- 全程以一問一答的對話進行，不要中途自行總結後就開始做事。
- 在使用者親口確認「我們已達成共識」之前，不要動手實作任何東西。
- 達成共識後，用一段簡短摘要複述最終定案的決策樹，作為這次訪談的產物（不寫檔案）。

護欄：
- 不預設立場地讓步；有疑慮就繼續追問。目的是逼出軟肋，不是快速取得同意。
- 不臆測事實——查得到就查，查不到才問。
- 不在未確認共識前執行、修改檔案或提交任何變更。
```

## Demo / 範例

```demo-conversation
user: /grill-me 我想幫我們的 API 加一層 Redis 快取，減少資料庫壓力
agent: 好，我來逐一質問這個計畫，一次一題。先從最上游的父決策開始——
       **Q1：你要快取的是「讀取結果」還是「整個 response」？**
       我的建議：先快取讀多寫少、且能容忍些微 staleness 的查詢結果（例如商品列表），
       而不是整個 HTTP response——後者會把 auth/個人化內容也一起快取，風險高。
       你的情況比較接近哪種？
user: 讀取結果，主要是商品列表那種查詢
agent: 收到。那下一個掛在它下面的決策——
       **Q2：快取失效策略要用 TTL 到期，還是寫入時主動失效（write-through / invalidate）？**
       我的建議：商品列表用「短 TTL（如 60s）+ 寫入時主動刪 key」的混合——TTL 當兜底，
       主動失效讓更新即時可見。純 TTL 會有最長 60s 的舊資料，純主動失效漏刪一個 key 就永遠髒。
       （我已經看了 product_service.py，更新走的是單一 update_product() 入口，所以主動失效可行。）
       你能接受這個混合策略嗎？
user: 可以，用混合的
result: agent 繼續走完 key 命名、序列化格式、快取穿透（cache stampede）、Redis 故障時的
        降級行為等分支，每題一問一答並附建議。最後複述定案的決策樹，確認達成共識後才停——
        全程未寫任何檔案，也未開始寫實作。
```

## 安裝 / Install

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/grill-me" ~/.agents/skills/grill-me

# Claude Code
$ ln -s "$PWD/skills/grill-me" ~/.claude/skills/grill-me

# Fallback（若 symlink 不支援）：改用 copy
$ cp -R skills/grill-me ~/.agents/skills/
$ cp -R skills/grill-me ~/.claude/skills/
```

**或使用安裝腳本（推薦）：**

```demo-terminal
$ node scripts/install-skill.mjs grill-me
✓ Installed to ~/.agents/skills/grill-me
✓ Installed to ~/.claude/skills/grill-me
```

安裝完後，用 `/grill-me` 主動觸發即可——agent 不會自己判斷要不要用它。

## 來源 / 出處

改編自 [mattpocock/skills](https://github.com/mattpocock/skills)（MIT，作者 Matt Pocock）
的 `skills/productivity/grill-me`。原始 `grill-me` 只有一行 `Run a /grilling session`，實際
訪談邏輯放在另一個 `grilling` primitive skill 裡。

本 hub 版本的主要改編：把 `grilling` primitive 的實際指令**內嵌**進「使用方式」，讓團隊
安裝單一 skill 即可自足使用，不必同時安裝 `grill-me` + `grilling` 兩個檔案。指令內容（決策
樹、一次一題、附建議答案、事實自查/決策交人、未達共識不動手）忠實保留原 primitive 的語意，
正文小節與 Demo 依 hub 格式重寫。原 repo 另有有狀態的 `grill-with-docs`（訪談同時產出 ADR +
glossary），本次未收錄。
