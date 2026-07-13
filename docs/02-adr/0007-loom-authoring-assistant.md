｀

# ADR-0007：Skill 製作助手（Loom）作為 hub skill，只 reference spec

> 狀態：Accepted ｜ 日期：2026-07-09
> 相關：[01-prd](../01-prd.md) FR-7、ADR-0002 / 0006

## Context

hub 的貢獻流程（ADR-0006 檢核 → 提交）缺一個「創作入口」——如何讓成員在日常工作中就地把可重用工作沈澱成 skill。使用者提出 **Loom**：一個裝進各成員 AI Agent（Claude Code / Codex / Gemini）的 skill 製作助手，主動偵測時機、徵詢、起草符合 hub 格式的 skill；並希望它能作為「一鍵開通」——裝了它就自動 clone repo + 安裝相關 skill。

設計張力：(1) Loom 需要「知道格式與既有 skill」，但若 Loom 自帶一套格式規則，會與 hub 的 spec/schema **雙頭馬車、易漂移**。(2) 「clone / 裝 skill」（讀）與「push / 貢獻」（寫）概念上是不同權限層級；起步階段內部完全信任，兩者皆自動不設閘門，但保留未來對 push 加核准的空間。

## Decision

- **Loom 本身是 hub 內的一個 skill**（`type: skill`，即 `skills/loom/SKILL.md`），透過 hub 的安裝機制（ADR-0002）散佈；人人自行安裝。Dogfooding。
- **職責邊界（單一真實來源）**：
  - **hub spec/schema 擁有**：格式、frontmatter 欄位、type/category 白名單、正文小節、檢核 + 重疊規則。
  - **Loom 擁有**：觸發偵測 heuristic、啟動模式、徵詢 / 同意互動、起草後的**交棒**。
  - Loom **只 reference spec/schema，絕不複製格式規則**。
- **交棒而非重造**：Loom 起草完 draft，直接呼叫既有的 §5 檢核 + 重疊偵測（ADR-0006）與提交流程（FR-2，免 PR），不自建平行檢核。
- **觸發模式**：預設主動偵測 + 可關閉 / 調頻的開關；並支援手動呼叫。
- **Loom 作為一鍵開通（bootstrap）**：安裝 Loom 後，Loom **自動 `git clone` hub repo 到本機約定位置，並自動安裝 hub 內指定的相關 skill**（含 Loom 自身更新），使用者無需手動一個個裝。clone 後即滿足 Loom 的本機依賴（可讀 `schema/` 與 `skills/`）。
- **權限（起步全開，無核准閘門）**：內部小團隊完全信任，起步階段 **clone / 裝 skill / push 貢獻皆自動、不設核准閘門**——裝了 Loom 即可讀可寫。Loom 引導流程極簡：`裝 Loom → 自動 clone + 裝相關 skill → 立即可用、可直接 push 貢獻`。
  - 未來若團隊變大 / 信任成本上升，可再收斂為「push 需 collaborator、由技術經理核准」的閘門（clone/讀仍自動）——與現流程不衝突，屆時再加。
- **本機依賴（硬性前置）**：Loom 起草前**硬性要求本機已有 hub repo clone**（正常情況由上方 bootstrap 自動完成）。若因故無 clone 且無法自動 clone，Loom **不起草、直接中止並指示先取得 repo**，不提供退化模式（確保格式與重疊偵測皆以單一真實來源為準）。

## Consequences

**正面**

- 補上創作入口，直接服務 Brief G7（低貢獻門檻）。
- **一鍵開通**：裝 Loom 即自動 clone + 裝相關 skill，成員上手成本極低，直接服務 G7。
- 單一真實來源：格式規則只有一份，Loom 不會與 spec 漂移。
- 權限起步全開（讀寫皆自動、無閘門），與免 PR 信任制自洽、上手最快；保留未來加閘門空間。
- Loom 是 hub skill → 用自身機制散佈、更新、被檢核，一致性高。

**負面 / 取捨**

- Loom 自動 clone 需約定本機位置與更新策略（如已存在則 pull）——屬 Loom 實作細節。
- 主動偵測有「打擾」風險 → 由可關 / 調頻的開關與保守 heuristic 緩解。
- 起步無 push 閘門：完全信任，有誤推 / 誤改主線的風險；緩解靠 git 歷史可回溯 + AGENTS.md 自檢，未來可加閘門。
- Loom 的偵測 heuristic 與徵詢互動需持續打磨（屬 Loom skill 自身的內容，非 hub 格式）。

## Alternatives considered

- **Loom 自帶完整格式規則、獨立於 hub**：省一次 repo 讀取，但雙頭馬車、必漂移。→ 否決。
- **不做 Loom，只靠 guideline 讓人手工建 skill**：貢獻門檻高、產量低，違背 G7。→ 否決（Loom 為主要入口，手工仍可）。
- **Loom 內建自己的檢核 / 重疊邏輯**：與 ADR-0006 重複、易分歧。→ 否決，改為交棒。
