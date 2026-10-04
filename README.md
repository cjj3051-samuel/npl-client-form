# NPL 客戶進件資料表

**用途**：NPL 不動產債權案件客戶初篩表單
**對象**：NPL 投資人、外勤業務
**最後更新**：2026/06/20

---

## 📋 專案說明

17 題進件問卷，含個資聲明、GA4 流量追蹤、Google Sheets 後端記錄、簡易風險評分。
填寫完成自動生成「進件報告」（HTML + 純文字 + 圖檔），可直接作為後續案件跟進依據。

## 📁 結構

```
npl-client-form/
├── index.html                  ← 主表單（17 題 + 個資聲明）
├── backend/apps-script.js     ← Google Apps Script 後端
├── SETUP.md                    ← 完整設定指引（請讀這份）
├── test_iife.js                ← IIFE 測試
├── NPL 客戶進件資料.gsheet     ← Google Sheets（雲端）
└── 更新日期：2026-06-20
```

## 🚀 部署選項

| 方案 | 難度 | 推薦度 |
|---|---|---|
| Linux + Nginx + SSL | 中 | ⭐⭐⭐ 最推薦 |
| Netlify（拖曳部署）| 低 | ⭐⭐ 快速測試用 |
| Vercel | 低 | ⭐⭐ |
| GitHub Pages | 低 | ⭐ 但要公開 |

**完整部署步驟**請見 `SETUP.md`。

## ✅ 已完成

- ✅ 17 題進件表單 + 個資聲明防呆
- ✅ 簡易風險評分（年收入、負債、聯徵、額度對年收入比）
- ✅ 報告自動生成（HTML + 文字 + 圖檔）
- ✅ GA4 整合（含 4 個事件：accept_privacy / generate_report / copy_text / download_image）
- ✅ Google Sheets 後端記錄

## ⏳ 待辦

- [ ] 部署到正式網域（待決定）
- [ ] 整合到恆昇新創 L3 業者方案（v3.1 規劃中）

## 🔗 相關資源

- 設定指引：`SETUP.md`（最詳盡）
- 規格書：見 `恆昇新創工作室/02_風險控制模組產品規格書_v3.md`