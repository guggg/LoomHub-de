---
name: golden-qa-pipeline
description: 安裝進 agent 的 golden dataset 建置流程——依 L0-L8 複雜度等級（FinDoc-RAG 框架）建置 RAG 系統的凍結評估問答集：GMM 分群找跨文件題材（PCA 降維 + silhouette 選群數，不用 BIC）、依等級分模型產題（簡單題 Haiku、需推理/跨文件 Sonnet）、Opus 獨立驗證每題可推導性與幻覺、組裝凍結版並附溯源欄位。核心鐵則是產題與驗證必須是不同 model/agent（雙重 AI 裁判）。適用於任何要從文件集建置或擴充 RAG 評估資料集、需要系統性找跨文件題材、或要對 AI 產題做嚴格品質把關的場景。與 agent-delegation-verify-standard 的差異：後者是通用的委派實作/審查標準，本 skill 是特定於 RAG 評估資料集建置的可執行流程（含 GMM 分群方法、L0-L8 等級判準、產題 schema），產出物是凍結版 golden_qa.jsonl。
type: skill
category: development
tags: [rag, golden-dataset, evaluation, gmm-clustering, llm-judge, question-generation, dual-ai-judge]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-21
---

## 用途 / What

從一批文件建置（或擴充）RAG 系統的評估用黃金問答集（golden dataset），並用雙重 AI 裁判機制把關品質。這套流程解決三個常見痛點：

1. **跨文件題材找不全**——人工瀏覽文件集很難系統性找出「語義相關但分屬不同檔案」的內容，用來出跨文件比較題（L3/L8）。用 embedding + GMM 分群解決。
2. **AI 產題品質不可信**——單一模型產題容易出現幻覺可回答性（看似合理但原文無據的問題）、格式錯誤、或難度標錯。用「產題模型 ≠ 驗證模型」的雙重裁判機制把關。
3. **難度分級沒有一致標準**——採用 FinDoc-RAG 論文的 L0-L8 九級分類框架（事實提取／資訊整合／跨文件綜合三大類），並落實成具體的「開幾個檔案、抓幾個位置、拿到後做什麼」判準，避免每個人標的等級不一致。

## 使用場景 / When

- 要從一批業務文件（規章、SOP、知識庫文章）建置或擴充 RAG 系統的評估問答集。
- 現有 golden dataset 缺乏跨文件題型（L3/L8），需要系統性找出適合的跨文件題材。
- 要對 AI 產出的題目做嚴格品質把關，不只是「看起來合理」就採用。
- 需要依難度分級（L0-L8）分析 RAG 系統的檢索/生成表現落差（例如發現「檢索找得到但生成端會幻覺」的模式）。

**不適用**：
- 只需要少量（<10 題）人工手動出題並自行檢查，不需要系統性分群或雙重 AI 裁判的規模。
- 文件集只有 1-2 份、沒有跨文件比較的需求（直接跳過 GMM 分群階段即可，但仍建議保留產≠驗）。
- 需要財報/時序數值的密集跨文件量化推理題（L7）——本流程假設一般業務文件，若文件集本身就是財報數據，L7 判準需另外設計。

## 使用方式 / How

以下是 agent 執行本流程時應遵循的完整指令。五個階段依序執行，但階段 0（確認範圍）與階段 1（GMM 分群）在小規模文件集（<10 份、無跨文件需求）時可跳過。

```
You are a golden-dataset pipeline operator. Your job is to build or expand a frozen L0-L8
evaluation QA dataset from a document corpus, using a produce-then-verify workflow where the
verifying model is NEVER the same model/agent instance that produced the question.

## HARD RULE: produce ≠ verify
The agent/model that generates a question is never the same instance that verifies it.
- Generation: Sonnet or Haiku (assign by difficulty — simple factual = Haiku, reasoning/
  cross-document = Sonnet)
- Verification: Opus, in an independent agent call (separate session/context, not a
  self-check by the generating agent)
- Never let the same context both produce and grade its own output — self-verification
  misses hallucinations because the model trusts its own prior reasoning.

## STAGE 0 — Scope confirmation (ask, do not assume)
Before doing anything, confirm with the user:
- Where is the document corpus? How many documents currently exist?
- Is there an existing golden QA set to expand, or starting from zero?
- Connection info for any vector DB / MongoDB needed for embeddings, if semantic
  clustering is in scope?
- Target question count and difficulty ratio (a reasonable default, borrowed from the
  FinDoc-RAG paper, is 50-60% basic factual / 40% advanced+boundary — cite it as one
  paper's suggestion, not an "industry standard").

## STAGE 1 — GMM clustering (finding cross-document material)
Skip this stage if the corpus is small (<10 docs) or there's no cross-document question need.

Purpose: L3/L8 (cross-document concept combination / structural comparison) questions need
material that is "semantically related but in different files" — this is hard to find by
manual browsing and must be found systematically.

Steps:
1. Embed each document (or each chunk, depending on granularity needed).
2. PCA-reduce the embedding vectors before clustering. Do NOT run GMM directly on
   high-dimensional vectors — with too many dimensions and too few samples, BIC-based model
   selection degenerates.
3. Select the number of clusters k using SILHOUETTE SCORE, not BIC. (BIC in this
   high-dim/low-sample regime tends to pick a degenerate, too-small k — verified empirically:
   on an 83-document corpus, BIC selected k=2 with 79 documents crammed into one cluster,
   which was useless. Silhouette selected k=15 with meaningful topic clusters.)
4. After clustering, manually skim each cluster's file names to confirm they are actually
   semantically related (not noise clusters).
5. From clusters with 2+ distinct file names, select cross-document question candidates
   for L3/L8.

## STAGE 2 — Label existing questions with L0-L8
If there is an existing QA set, label each question with `difficulty_level` (L0-L8) and
`query_type` before generating new ones. Look at the distribution to find gaps — L4
(colloquial/vague phrasing) and L6 (numeric computation) are the most commonly neglected tiers.

L0-L8 difficulty judgment — three questions to ask about any candidate question:
(a) How many files does it need to open? (b) How many distinct locations inside those files
does it need? (c) What do you do with what you find — copy directly / merge into one answer /
compare / compute?

- **L0**: 1 short file, 1 location, copy directly
- **L1**: 1 long file, 1 location, copy directly
- **L2**: 1 file, 2+ locations, merged into one answer — the locations MUST be genuinely
  related and together form one coherent question (never pick two unrelated paragraphs
  just to hit "2 locations")
- **L3**: 2+ files, 1+ location each, combined into one answer
- **L4**: same underlying fact as L0/L1, but phrased colloquially/vaguely (dropped subject,
  informal nickname instead of the formal term, filler words, incomplete/emotional phrasing)
- **L5**: 1 file, several points under the same topic, listed as a summary (no inter-point
  reasoning needed)
- **L6**: 2-3 numeric values, basic computation (difference, ratio, sort/compare)
- **L7**: 3+ files, dense cross-file numeric computation
- **L8**: 2+ files, item-by-item comparison (structured as "similarities... / differences...")

Difficulty level number is a classification, not a difficulty ranking.
"Short" vs "long" file: pick a length threshold appropriate to the corpus (e.g. 3000
characters for prose documents, 5 pages for slide decks) and apply it consistently — the
exact cutoff matters less than using ONE consistent rule.

## STAGE 3 — Generate questions by tier, split across models
Assign models by tier (adjust per project, but never let one model do everything):
- Simple/factual tiers (L0/L1/L5): Haiku
- Reasoning/rewrite/cross-document tiers (L2/L3/L4/L6/L8): Sonnet
- NEVER use Opus for generation — Opus is reserved for verification only

Run tiers in parallel (one agent call per tier), and give each generation call:
- The tier's judgment criteria (from Stage 2)
- The actual source file(s) to use — name the exact file AND the exact article/page,
  do not let the agent go hunting on its own
- The output schema: question / answer / difficulty_level / query_type / source_file /
  evidence_quote

Generation requirements:
- `evidence_quote` MUST be a verbatim quote from the source — never flatten tables into
  prose, never paraphrase, never splice non-contiguous sentences together
- For L8, `evidence_quote` must be tagged per source file (e.g. `[File A] quote...`
  `[File B] quote...`) — cross-document comparison questions are the ones most likely to
  misattribute a rule from file A to file B, and per-file tagging makes that catchable
- For L4, first produce an L0/L1 question, then rewrite ONLY the question phrasing into
  a colloquial version (dropped subject, informal nickname, filler words, incomplete
  phrasing) — the answer stays identical

## STAGE 4 — Independent Opus verification
For every generated question, open an INDEPENDENT Opus agent call (never the agent that
generated it) and check:
1. **derivable** — can the answer be fully derived from the evidence_quote / source text?
   Any "hallucinated answerability" (looks plausible but has no basis in the source)?
2. **answer_accurate** — do the numbers/facts/clauses in the answer match the source verbatim?
3. **level_appropriate** — is the difficulty_level tag correct?

Verdict outcomes:
- `pass`: use as-is
- `revise`: mostly correct but flawed (e.g. evidence_quote not verbatim enough) — either fix
  or accept depending on severity
- `reject`: not derivable / hallucinated / seriously wrong — discard

Common hallucination patterns to watch for (empirically observed):
- Cross-document comparison (L8) misattributing file A's rule to file B
- Numeric questions inventing a unit or threshold the source never stated (e.g. adding
  "per semester" when the source gave no time period)
- Misjudging refusal — treating a question the knowledge base CAN actually answer as
  "no data available"

## STAGE 5 — Assemble the frozen dataset
1. Discard all `reject` questions.
2. Apply fixes for `revise` questions — if fixing, use another independent generation-model
   call following the verifier's fix_suggestion; the verifier itself should never edit its
   own verdict target (keep produce ≠ verify even for fixes).
3. Merge new questions with any existing set, unify the schema.
4. Compute final difficulty distribution and compare against the target ratio from Stage 0;
   flag if badly skewed.
5. Output the frozen `golden_qa_v{N}.jsonl`, with each row carrying provenance fields:
   `origin` (human_curated / generated), `gen_model`, `verified_by`.

## Output file layout (adapt paths, keep the structure)
golden_dataset/
├── clustering/{gmm_cluster.py, clusters_doc.json, clusters_chunk.json}   # Stage 1
├── label_existing.py, golden_qa_labeled.jsonl                            # Stage 2
├── gen/{GENSPEC.md, generated_qa.jsonl}                                  # Stage 3
├── verify/v{id}.json                                                     # Stage 4 (transient)
├── fix/f{id}.json                                                        # fix materials
└── assemble_final.py, golden_qa_v{N}.jsonl                               # Stage 5
```

## Demo / 範例

```demo-conversation
user: 我們有 83 份內部規章文件，想建一份 golden QA 資料集來測 RAG 系統，現有 55 題但都是很清楚的
書面問法，缺跨文件比較題跟真實口語提問。

agent: 我會走 golden-qa-pipeline 五階段。先確認範圍：83 份文件都在同一個資料夾嗎？現有 55 題
的 schema 長什麼樣？目標題數呢？

user: 都在同一個資料夾，現有題目有 question/answer/source_file 三欄，目標擴到 100 題左右。

agent: 好，開始執行。

階段 1（GMM 分群）：對 83 份文件做 embedding，PCA 降到 42 維（保留 90% variance），用
silhouette score 選群數——選出 k=15（比直接用 BIC 選出的 k=2 有意義得多，BIC 那次把 79 份文件
擠成一群）。分群後找到 12 個跨文件群，其中群 2（誠信經營守則+道德行為準則+員工行為守則）跟
群 3（國內出差+國外出差+福利保險）看起來是很好的 L8/L3 題材。

階段 2：現有 55 題補標完 L0-L8，發現 L4（口語模糊題）跟 L6（數值計算）完全是 0 題——這是最大
缺口。

階段 3：依缺口分配新題配額——L4 用 Sonnet 產 15 題（把現有清晰題改寫成口語版）、L6 用 Sonnet
產 6 題（保額/補助金額類的數值比較）、L8 用 Sonnet 產 6 題（吃階段 1 找到的跨文件群材料）。全部
用 Sonnet，因為都需要推理或改寫，沒有純事實查找的量。

階段 4：開獨立 Opus agent 逐題驗證，抓到 3 題 reject（1 題 L8 幻覺把雲端委外的風險評分數字誤植
成另一份文件的、1 題 L6 幻覺加了原文沒有的「每學期」限定詞、1 題誤判 refusal）。24 題 revise
（多是 evidence_quote 格式問題，內容大致正確）。

階段 5：剔除 3 題 reject，套用修正，組裝出 golden_qa_v2.jsonl，共 98 題，難度分布跟 FinDoc-RAG
建議的 50-60%/40% 比例大致相符。

result: 產出 98 題凍結版，含完整溯源欄位（origin/gen_model/verified_by）。
```

## 安裝 / Install

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/golden-qa-pipeline" ~/.agents/skills/golden-qa-pipeline
# Claude Code
$ ln -s "$PWD/skills/golden-qa-pipeline" ~/.claude/skills/golden-qa-pipeline
# 若該 agent 不支援 symlink，改用 copy 作為 fallback
$ cp -R skills/golden-qa-pipeline ~/.agents/skills/
$ cp -R skills/golden-qa-pipeline ~/.claude/skills/
```
