# FEEDBACK.md — 團隊回饋收集

這是 LoomHub-de 的單一共用回饋收集區，給人也給 AI agent 用。

**規則：**

- 往檔尾**追加**一則新回饋，不要改別人寫的內容。
- **最新在最下方**（append-only）。
- **AI agent 可以直接寫檔 + `git commit` + `git push`**，這是 trust-based / no-PR 的自由路徑
  （回饋不屬於 `AGENTS.md` 定義的規則路徑），無需開 PR、無需等待審核。
- 每則固定用下方 metadata 結構，含時間、署名、主題、類型。

每則格式：

```markdown
## YYYY-MM-DD · @handle
- **主題**：(針對哪個資產/規則/整體)
- **類型**：建議 / 問題 / 讚 / 其他

內容...

---
```

---

## 2026-07-13 · @Ty

- **主題**：整體
- **類型**：讚

Hub 從 spec 到落地的速度比預期快，advisory-only CI 這個決策目前看起來是對的——大家都還在放心
直接 push main，沒有人被 PR 流程卡住。

---

## 2026-07-20 · @Ty

- **主題**：check-updates.mjs
- **類型**：建議

跑起來體驗不錯，但目前得記得手動跑。之後如果能包成 pre-commit / cron 提醒會更好，先記錄下來，
不急著做。

---
