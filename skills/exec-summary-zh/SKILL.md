---
name: exec-summary-zh
description: 可重用 prompt 範本，把落落長的英文技術文件濃縮成給主管看的中文摘要——貼上文件內容、受眾、想強調的重點後，產出固定格式的「三句話總結 → 關鍵風險 → 建議動作」摘要。適用於需要定期把英文技術文件（PRD、事後檢討 / postmortem、架構文件、稽核報告等）轉譯成主管易讀中文摘要、統一團隊摘要格式與風險呈現方式的場景。
type: prompt
category: docs
tags: [summarization, translation, executive-summary, zh, reporting]
version: 0.2.0
owner: "@GivorsHandsomeBoy"
updated: 2026-07-17
---

## 用途 / What

把一份落落長的英文技術文件，濃縮成主管一看就懂的中文摘要。固定輸出「三句話總結 → 關鍵
風險 → 建議動作」三段式格式，避免每次自己重新想「這次要怎麼摘」、避免漏掉風險、也讓不同
人產出的摘要格式一致，方便主管快速比較不同文件的摘要。

## 使用場景 / When

- 收到英文的技術文件（PRD、架構文件、postmortem、稽核報告、vendor 技術白皮書等），需要
  快速產出中文摘要給主管看。
- 想針對不同受眾（例如技術主管 vs 非技術主管）調整摘要的強調重點，但格式要保持一致。

**不適用**：
- 文件本身就很短（幾段內），不需要摘要框架，直接讀或簡單翻譯即可。
- 需要逐字逐句翻譯而非摘要濃縮的場景。

## 使用方式 / How

複製下方模板，填好三個變數（見「變數 / 參數」），貼給任何 agent 即可。

```
你是一位精通中英文技術寫作的分析師，負責把落落長的英文技術文件濃縮成給主管看的中文摘要。
只根據我提供的文件內容摘要，不要杜撰文件沒提到的細節。

文件內容：
{{document_content}}

受眾：{{audience}}
想強調的重點：{{emphasis}}

請輸出：
1. 三句話總結（用最精簡的中文講清楚文件在說什麼）
2. 關鍵風險（列點；若文件沒有明確風險則寫「無明確風險」）
3. 建議動作（列點，具體可執行）
```

## 變數 / 參數

| 變數 | 說明 | 範例 |
|---|---|---|
| `{{document_content}}` | 要摘要的英文技術文件全文或重點段落 | 一份關於新支付閘道遷移的英文技術規格文件 |
| `{{audience}}` | 這份摘要要給誰看，會影響用語深度 | `技術主管，熟悉系統架構但沒時間讀全文` |
| `{{emphasis}}` | 想特別強調的重點方向 | `對現有系統的相容性風險與上線時程` |

## 範例輸出

```demo-conversation
user: 你是一位精通中英文技術寫作的分析師，負責把落落長的英文技術文件濃縮成給主管看的中文摘要。
只根據我提供的文件內容摘要，不要杜撰文件沒提到的細節。

文件內容：
Postmortem – Payment Gateway Migration (Stripe to Adyen), Phase 1 Rollout

On 2026-06-02, we began migrating checkout traffic from Stripe to Adyen as part of the Q3
cost-reduction initiative. Phase 1 planned to cut over 10% of EU traffic. During the rollout
window, the new Adyen integration's webhook retry logic diverged from Stripe's: Adyen retries
failed webhooks up to 25 times over 72 hours with exponential backoff, while our internal
reconciliation service assumed a Stripe-like single-retry-within-1-hour pattern. This caused
~340 duplicate "payment_captured" events to be processed against orders already marked as
paid, triggering incorrect double-refund attempts on 12 orders before an on-call engineer
disabled the reconciliation worker.

Root cause: the reconciliation service's idempotency key was derived from (order_id,
event_type) rather than Adyen's provided idempotency key, so retried webhooks with the same
order_id were not deduplicated correctly under Adyen's retry semantics.

Additional findings: the data warehouse ETL job that ingests payment events has not yet been
updated to recognize Adyen's event schema (fields differ: 'pspReference' vs Stripe's
'charge_id'), meaning payment reporting dashboards for the affected 10% of EU traffic will
show gaps until the schema mapping is fixed — estimated 2 engineering days.

Remaining rollout timeline: Phase 2 (40% additional traffic) is scheduled for 2026-07-28,
contingent on the idempotency fix being deployed and verified in staging for at least 5
business days. Phase 3 (full cutover) has no committed date yet; leadership had verbally
targeted 2026-08-15 but engineering has not confirmed feasibility given the ETL schema work
still outstanding.

受眾：技術主管，熟悉系統架構但沒時間讀全文
想強調的重點：對現有系統的相容性風險與上線時程

請輸出：
1. 三句話總結（用最精簡的中文講清楚文件在說什麼）
2. 關鍵風險（列點；若文件沒有明確風險則寫「無明確風險」）
3. 建議動作（列點，具體可執行）
agent: **1. 三句話總結**
Q3 將 10% 歐洲結帳流量從 Stripe 遷移到 Adyen 的第一階段上線後，因 Adyen 的 webhook
重試機制（72 小時內最多 25 次、指數退避）與對帳服務原先假設的 Stripe 式「1 小時內單次
重試」不符，導致約 340 筆重複付款事件被誤處理、12 筆訂單觸發錯誤的重複退款，直到值班
工程師手動停用對帳服務才止血；根因是對帳服務用 (order_id, event_type) 自組
idempotency key、而非採用 Adyen 原生提供的 key，在 Adyen 的重試語意下無法正確去重。
另外資料倉儲 ETL 尚未支援 Adyen 的事件欄位命名（pspReference vs charge_id），受影響流量
的付款報表會出現缺口；Phase 2（再擴大 40% 流量，訂於 2026-07-28）綁定在 idempotency
修復需先於 staging 驗證滿 5 個工作日的前提上，Phase 3（全量切換，口頭目標 2026-08-15）
工程端尚未確認可行性。

**2. 關鍵風險**
- 相容性風險（高）：Adyen 與 Stripe 的 webhook 重試語意不同，現有對帳服務的
  idempotency 邏輯建立在 Stripe 假設上，若不修正，Phase 2 擴大流量後重複事件與誤退款
  會等比例放大。
- 資料完整性風險（中）：ETL 尚未認得 Adyen 的欄位命名，付款報表在受影響流量上會出現
  資料缺口，影響財務對帳與監控可信度。
- 上線時程風險（中）：Phase 2 綁定在 idempotency 修復完成並於 staging 驗證滿 5 個工作
  日的前提上，目前未見修復已部署的證據；Phase 3 口頭目標尚未經工程確認可行性，且 ETL
  schema 工作仍未完成，時程有跳票風險。

**3. 建議動作**
- 立即修正對帳服務的 idempotency key，改用 Adyen 原生提供的 key 而非自組
  (order_id, event_type)，並針對 Adyen 的重試語意重新設計去重邏輯。
- 啟動 Phase 2 前，要求該修復已在 staging 完整跑滿 5 個工作日並附驗證結果，作為
  go/no-go 的硬性條件。
- 排定 ETL 欄位映射工作（pspReference ↔ charge_id 等），於 2 個工程日內完成，避免報表
  缺口在 Phase 2 擴大流量後惡化。
- 針對 Phase 3 的 2026-08-15 目標，工程主管應主動與領導層對齊實際可行性，避免依賴未經
  工程確認的口頭時程。
```

## 複製 / 取用

這是一份 **prompt 範本**，不需安裝進 agent——直接複製上方「使用方式」裡的完整 prompt，
填好三個變數後貼給任何 agent（Claude、Codex、Gemini 皆可）。

**使用流程：**
1. 複製「使用方式」的 prompt 範本。
2. 填好 `{{document_content}}` / `{{audience}}` / `{{emphasis}}`（見「變數 / 參數」表）。
3. 貼給你的 agent。
4. Agent 會依照三段式格式（三句話總結 → 關鍵風險 → 建議動作）產出中文摘要。

若你發現自己每次都手動貼這個 prompt、且希望某個 agent 在偵測到「需要摘要英文技術文件」時
自動套用，可考慮之後整理成 `type: skill` 版本。
