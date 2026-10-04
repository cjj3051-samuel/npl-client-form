# NPL 案件管理系統 — 規格書 v1.0

**最後更新**：2026-09-30  
**版本**：v1.0  
**負責人**：Samuel周

---

## 目錄

1. [系統概述](#1-系統概述)
2. [業務流程](#2-業務流程)
3. [網路架構](#3-網路架構)
4. [資料模型](#4-資料模型)
5. [檔案命名規則](#5-檔案命名規則)
6. [API 設計](#6-api-設計)
7. [權限設計](#7-權限設計)
8. [備份策略](#8-備份策略)
9. [監控與警報](#9-監控與警報)
10. [故障排除](#10-故障排除)
11. [網頁前端（Web App）](#11-網頁前端web-app)
12. [行動版需求](#12-行動版需求)
13. [第二版待辦功能](#13-第二版待辦功能)

---

## 1. 系統概述

### 1.1 系統目的

整合 NPL（不良資產）債務整合轉介業務的案件管理、文件追蹤、客戶資料集中管理。

### 1.2 核心功能

- 客戶資料建檔與管理
- 案件狀態追蹤（從接案到結案）
- 文件上傳、命名、歸檔
- 補件期限管理與提醒
- 行動版查詢（業務外出使用）
- 多業務員權限隔離

### 1.3 使用角色

| 角色 | 說明 | 權限範圍 |
|------|------|----------|
| admin | 老闆（Samuel周） | 全部資料、所有功能 |
| business | 業務員 | 只能看到自己承接的案件 |
| viewer | 唯讀（客戶或外部機構） | 僅能看到被授權的案件摘要 |

### 1.4 技術棧（目前規劃）

| 層次 | 技術 | 備註 |
|------|------|------|
| 資料庫 | PostgreSQL 16 / MariaDB 11 | 安裝在 Windows 11 實體主機 |
| 檔案儲存 | Windows 本地檔案系統 | `/files/` 目錄，不入 DB |
| API 層 | Node.js + Express（或 FastAPI Python） | 雲端或本地均可 |
| 前台 | React / Vue（網頁） 或 PWA | 手機優先響應式設計 |
| 網路通道 | Cloudflare Tunnel | 本地主動連出，外部不暴露 |
| SSL | Cloudflare 自動 HTTPS | 無需手動憑證 |

---

## 2. 業務流程

### 2.1 案件生命週期

```
諮詢中
  └→ 評估中（業務開始建檔）
        └→ 資料收集中（補件階段）
              └→ 送件申請中
                    └→ 照會中（銀行/機構回覆中）
                          └→ 估價中
                                └→ 對保中
                                      └→ 完件撥款
                                            └→ 結案

可能的分支：
  └→ 婉拒（案件終止）
  └→ 案件終止（客戶放棄）
```

### 2.2 案件新建流程

```
1. 業務員在系統新增案件
   └→ 選擇或新建「客戶資料」（client_id）

2. 帶入基本資訊：
   └→ 姓名、身份證、聯絡方式
   └→ 負債概況（總負債、債權人數量）
   └→ 房產資料（如有）

3. 系統自動產生案件編號
   └→ 格式：CASE-YYYY-NNNN
   └→ 例如：CASE-2026-0001

4. 業務員上傳初始文件
   └→ 系統自動命名（見第 5 章）

5. 填寫案件歷程
   └→ 「建立案件，開始評估」

6. 設定下次行動時間
   └→ 系統自動列入待辦提醒
```

### 2.3 補件流程

```
銀行/機構要求補件
      │
      ▼
業務員在系統新增「待補件」項目
      │
      ├── 選擇文件類型
      ├── 設定補件期限
      └── 系統發送提醒（Email/LINE）

客戶補件（拍照/掃描/LINE傳送）
      │
      ▼
業務員下載並上傳至系統
      │
      ├── 系統自動命名
      ├── 寫入 DB（路徑、流水號）
      └── 案件文件清單自動更新

業務員更新案件歷程
      │
      ▼
系統通知銀行/機構補件完成
（可選自動化）
```

### 2.4 案件查詢常用情境

| 情境 | 操作 |
|------|------|
| 查某客戶所有案件 | 搜尋客戶姓名或身份證 |
| 查某業務員手上的案件 | 篩選「承辦業務 = 王業務」 |
| 查逾期未補件的案件 | 篩選「狀態 = 補件中 且 期限已過」 |
| 查一個月內新案件 | 篩選「接案日期：本月」 |
| 查一個案件的完整歷史 | 進入案件 → 查看「案件歷程」分頁 |

---

## 3. 網路架構

### 3.1 架構總覽

```
外部用戶（手機 / 瀏覽器）
      │
      │  HTTPS（你的域名）
      ▼
Cloudflare（CDN + 保護）
      │
      ├── 靜態資源（CSS/JS/圖片）
      │
      └── 動態請求 → Cloudflare Tunnel（單向連線）
                          │
                          │ cloudflared 主動連出
                          ▼
                    ┌─────────────────┐
                    │  Windows 11     │
                    │  主機           │
                    │  ┌───────────┐  │
                    │  │ PostgreSQL │  │
                    │  │    DB     │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │  API 層   │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │  檔案目錄  │  │
                    │  │ /files/   │  │
                    │  └───────────┘  │
                    └─────────────────┘
```

### 3.2 關鍵原則

- **不開放任何 inbound Port**：Windows 11 主機完全隱藏在 Cloudflare Tunnel 之後
- **單向連線**：只有 cloudflared 主動連出去，外部無法直接連到主機
- **HTTPS 強制**：Cloudflare 自動提供免費 SSL 憑證
- **DDoS 保護**：Cloudflare 擋掉惡意流量

### 3.3 Cloudflare Tunnel 啟動方式

```bash
# 方式一：直接執行（測試用）
cloudflared tunnel --url http://localhost:3000

# 方式二：安裝為 Windows 服務（正式環境）
cloudflared service install
cloudflared tunnel run --token <your-token>

# 方式三：綁定自己域名
# 在 Cloudflare Dashboard 建立 Permanent Tunnel
# 設定 CNAME 指向 yourdomain.com
```

### 3.4 外部存取網址對照

| 用途 | 網址範例 |
|------|----------|
| 正式網址 | `https://npl.yourdomain.com` |
| API 端點 | `https://npl.yourdomain.com/api/` |
| 檔案下載 | `https://npl.yourdomain.com/api/files/{id}` |
| 健康檢查 | `https://npl.yourdomain.com/api/health` |

---

## 4. 資料模型

### 4.1 設計原則

- **軟刪除（Soft Delete）**：所有資料表均有 `deleted_at` 欄位，資料不物理刪除
- **資料版本（Audit Trail）**：重要變更寫入 `*_logs` 表
- **UUID 或序號**：主鍵使用 UUID（避免猜測攻擊）或系統序號
- **時區統一**：所有時間以 UTC 儲存，顯示時轉換為 Asia/Taipei

### 4.2 ER 關聯圖（概念層）

```
users ───┐
          ├── (1:N) cases ── (N:1) clients
          │                    │
          │                    ├── (1:N) properties
          │                    ├── (1:N) creditors
          │                    │
          │                    └── (1:N) cases ── (N:1) clients
          │
          ├── (1:N) case_files
          │
          └── (1:N) case_logs
```

### 4.3 資料表詳細結構

---

#### 4.3.1 `users` — 使用者（業務員/管理員）

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | 預設 uuid_generate_v4() |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 登入帳號 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| name | VARCHAR(100) | NOT NULL | 顯示名稱 |
| email | VARCHAR(255) | UNIQUE | 通知用 Email |
| phone | VARCHAR(20) | | 聯絡電話 |
| role | ENUM('admin','business','viewer') | NOT NULL, DEFAULT 'business' | 角色 |
| department | VARCHAR(100) | | 所屬部門 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 帳號啟用 |
| last_login_at | TIMESTAMPTZ | | 最後登入時間 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |
| deleted_at | TIMESTAMPTZ | | 軟刪除時間（NULL = 有效）|

---

#### 4.3.2 `clients` — 客戶基本資料

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| client_no | VARCHAR(20) | UNIQUE, NOT NULL | 客戶編號，例如 C001 |
| name | VARCHAR(100) | NOT NULL | 姓名 |
| id_card | VARCHAR(20) | UNIQUE | 身份證字號 |
| birth_date | DATE | | 出生年月日 |
| gender | ENUM('M','F','O') | | M=男，F=女，O=其他 |
| phone_primary | VARCHAR(20) | | 主要電話（手機）|
| phone_secondary | VARCHAR(20) | | 次要電話 |
| line_id | VARCHAR(100) | | LINE ID |
| email | VARCHAR(255) | | Email |
| address | TEXT | | 戶籍地址 |
| address_mailing | TEXT | | 通訊地址 |
| occupation | VARCHAR(100) | | 職業 |
| employer | VARCHAR(200) | | 服務單位 |
| income_monthly | DECIMAL(12,2) | | 月收入 |
| income_verified | BOOLEAN | DEFAULT false | 收入是否可認證 |
| has_salary_transfer | BOOLEAN | DEFAULT false | 是否有薪轉 |
| salary_account_bank | VARCHAR(100) | | 薪轉銀行 |
| referred_by | VARCHAR(100) | | 介紹來源 |
| note | TEXT | | 備註 |
| created_by | UUID | FK users(id) | 建檔業務員 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新時間 |
| deleted_at | TIMESTAMPTZ | | 軟刪除時間 |

---

#### 4.3.3 `properties` — 房產資料

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| client_id | UUID | FK clients(id), NOT NULL | 所屬客戶 |
| property_no | VARCHAR(20) | UNIQUE | 財產編號 |
| property_type | ENUM('房屋','土地','農地','車位','持分','其他') | NOT NULL | 類型 |
| address | TEXT | | 地址 |
| owner_name | VARCHAR(100) | | 所有權人 |
| owner_relationship | ENUM('本人','配偶','父母','子女','其他親屬','非親屬') | | 與客戶關係 |
| share_ratio | VARCHAR(20) | | 持分比例，例如 1/1 或 1/2 |
| current_value | DECIMAL(14,2) | | 預估市價 |
| mortgage_bank | VARCHAR(200) | | 抵押設定銀行 |
| mortgage_balance | DECIMAL(14,2) | | 房貸餘額 |
| mortgage_monthly | DECIMAL(10,2) | | 月付金 |
| rental_income | DECIMAL(10,2) | | 租金收入（月）|
| land_area | DECIMAL(10,2) | | 土地坪數 |
| building_area | DECIMAL(10,2) | | 建物的坪數 |
| note | TEXT | | 備註 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | | 軟刪除 |

**索引**：`idx_properties_client_id` ON (client_id)

---

#### 4.3.4 `creditors` — 債權人資料

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| client_id | UUID | FK clients(id), NOT NULL | 所屬客戶 |
| creditor_no | VARCHAR(20) | | 債權人編號 |
| creditor_name | VARCHAR(200) | NOT NULL | 債權人名稱 |
| creditor_type | ENUM('Bank','Finance','Individual','Other') | NOT NULL | 類型 |
| product_type | ENUM('房貸','信貸','車貸','信用卡','助學贷款','民間借贷','其他') | NOT NULL | 產品類型 |
| original_principal | DECIMAL(14,2) | | 原始本金 |
| current_balance | DECIMAL(14,2) | | 目前欠款 |
| monthly_payment | DECIMAL(10,2) | | 月付金 |
| overdue_amount | DECIMAL(14,2) | DEFAULT 0 | 逾期金額 |
| overdue_days | INTEGER | DEFAULT 0 | 逾期天數 |
| interest_rate | DECIMAL(5,3) | | 年利率 |
| contract_date | DATE | | 合約日期 |
| last_payment_date | DATE | | 最後繳款日 |
| status | ENUM('正常','警示','催收','呆账') | DEFAULT '正常' | 狀態 |
| note | TEXT | | 備註 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | | 軟刪除 |

**索引**：`idx_creditors_client_id` ON (client_id)

---

#### 4.3.5 `cases` — 案件主檔

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| case_no | VARCHAR(20) | UNIQUE, NOT NULL | 案件編號，例如 CASE-2026-0001 |
| client_id | UUID | FK clients(id), NOT NULL | 所屬客戶 |
| case_type | ENUM('債務整合','轉貸','債讓','法院協調','其他') | NOT NULL | 案件類型 |
| case_status | ENUM('諮詢中','評估中','資料收集中','送件申請中','照會中','估價中','對保中','完件撥款','婉拒','案件終止') | NOT NULL, DEFAULT '諮詢中' | 案件狀態 |
| source | ENUM('舊客介紹','網路行銷','銀行轉介','自己開發','其他') | | 案件來源 |
| business_owner_id | UUID | FK users(id) | 承辦業務員 |
| date_received | DATE | | 接案日期 |
| date_expected_close | DATE | | 預計結案日 |
| date_actual_close | DATE | | 實際結案日 |
| referral_fee | DECIMAL(10,2) | | 轉介費（給介紹人）|
| service_fee | DECIMAL(10,2) | | 服務費（向客戶收取）|
| commission_rate | DECIMAL(5,4) | | 抽成比例 |
| bank_commission | DECIMAL(10,2) | | 銀行回饋金 |
| deal_status | ENUM('待收款','已收款','已核銷') | | 收款狀態 |
| total_debt | DECIMAL(14,2) | | 案件總負債（denormalized）|
| total_creditors | INTEGER | | 債權人數量（denormalized）|
| priority | ENUM('low','normal','high','urgent') | DEFAULT 'normal' | 優先順序 |
| reminder_date | DATE | | 下次提醒日期 |
| note | TEXT | | 案件備註 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | | 軟刪除 |

**索引**：
- `idx_cases_case_no` ON (case_no)
- `idx_cases_client_id` ON (client_id)
- `idx_cases_business_owner_id` ON (business_owner_id)
- `idx_cases_case_status` ON (case_status)
- `idx_cases_reminder_date` ON (reminder_date)

---

#### 4.3.6 `case_files` — 案件附件（檔案追蹤）

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| case_id | UUID | FK cases(id), NOT NULL | 所屬案件 |
| client_id | UUID | FK clients(id) | 所屬客戶（方便直接查）|
| file_type | VARCHAR(50) | NOT NULL | 檔案類型（從預設清單選）|
| file_status | ENUM('待收集','已上傳','已補件','已確認','已作廢') | NOT NULL, DEFAULT '待收集' | 檔案狀態 |
| original_filename | VARCHAR(255) | NOT NULL | 原始檔案名稱 |
| stored_filename | VARCHAR(255) | NOT NULL | 系統命名後的檔案名 |
| stored_path | VARCHAR(500) | NOT NULL | 存放路徑（相對） |
| file_size | BIGINT | | 檔案大小（bytes）|
| file_extension | VARCHAR(10) | | 副檔名 |
| mime_type | VARCHAR(100) | | MIME 類型 |
| upload_by | UUID | FK users(id) | 上傳業務員 |
| uploaded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 上傳時間 |
| verified_at | TIMESTAMPTZ | | 確認時間 |
| verified_by | UUID | FK users(id) | 確認人 |
| required | BOOLEAN | DEFAULT false | 是否為必備文件 |
| deadline | DATE | | 補件期限 |
| note | TEXT | | 備註 |
| deleted_at | TIMESTAMPTZ | | 軟刪除時間 |

**預設 file_type 清單**：
```
身份證、健保卡、戶口名簿、所得清單、薪資單、聯徵報告、
房貸對保單、不動產權狀、車籍資料、對話截圖、收支證明、
近似照、建物測量成果圖、土地登記簿藤本、法院裁定書、
其他
```

**索引**：
- `idx_case_files_case_id` ON (case_id)
- `idx_case_files_client_id` ON (client_id)
- `idx_case_files_file_type` ON (file_type)

---

#### 4.3.7 `case_logs` — 案件歷程（Audit Trail）

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| case_id | UUID | FK cases(id), NOT NULL | 所屬案件 |
| action | VARCHAR(50) | NOT NULL | 動作類型 |
| action_category | ENUM('系統','狀態變更','補件','溝通','財務','內部') | NOT NULL | 分類 |
| note | TEXT | | 詳細說明 |
| is_internal | BOOLEAN | DEFAULT true | 是否為內部備註 |
| attachment_ref | UUID | FK case_files(id) | 關聯附件 |
| next_action | TEXT | | 後續行動 |
| next_reminder_date | DATE | | 下次提醒日期 |
| created_by | UUID | FK users(id) | 填寫人 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 填寫時間 |

**預設 action 值**：
```
建立案件、評估、資料收集、補件、送審、照會、估價、
對保、撥款、婉拒、終止、內部備註、來電、訊息通知、文件確認
```

**預設 action_category 值**：
```
系統（系統自動記錄）、狀態變更、補件、溝通、財務、內部
```

**索引**：`idx_case_logs_case_id` ON (case_id)

---

#### 4.3.8 `settings` — 系統設定（命名規則等）

| 欄位名 | 類型 | 約束 | 說明 |
|--------|------|------|------|
| id | UUID | PK | |
| key | VARCHAR(100) | UNIQUE, NOT NULL | 設定鍵 |
| value | TEXT | NOT NULL | 設定值 |
| description | TEXT | | 說明 |
| updated_by | UUID | FK users(id) | 最後修改人 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 修改時間 |

**預設資料**：

| key | 預設值 | 說明 |
|-----|--------|------|
| `file_naming_pattern` | `{CLIENT_NO}_{CASE_NO}_{FILE_TYPE}_{DATE}_{SEQ}` | 檔案命名規則 |
| `file_path_base` | `/files/` | 檔案根目錄 |
| `company_name` | `恆昇新創` | 公司名稱 |
| `reminder_days_before` | `7,3,1` | 提醒天數（幾天前）|
| `case_no_prefix` | `CASE` | 案件編號前綴 |
| `client_no_prefix` | `C` | 客戶編號前綴 |

---

### 4.4 軟刪除實作規則

```sql
-- 所有查詢預設加上這個條件
WHERE deleted_at IS NULL

-- 刪除時（不物理刪除）
UPDATE clients SET deleted_at = NOW() WHERE id = ?;

-- 老闆查看已刪除的資料（可選還原）
SELECT * FROM clients WHERE deleted_at IS NOT NULL;

-- 軟刪除 cascade：
-- 當案件軟刪除時，附屬的 case_files 和 case_logs 不刪除
-- （保留完整歷史，供日後查帳）
```

### 4.5 資料版本實作（重要變更）

```sql
-- clients 異動時同步寫入 clients_history
INSERT INTO clients_history
SELECT *, NOW(), CURRENT_USER FROM clients WHERE id = ?;

-- creditors 余額變動時寫入 creditors_history
INSERT INTO creditors_history
SELECT *, NOW(), CURRENT_USER FROM creditors WHERE id = ?;
```

---

## 5. 檔案命名規則

### 5.1 命名格式

```
{CLIENT_NO}_{CASE_NO}_{FILE_TYPE}_{DATE}_{SEQ}.{EXT}

組成說明：
- CLIENT_NO  ：客戶編號，例如 C001
- CASE_NO    ：案件編號，例如 CASE2026001
- FILE_TYPE  ：文件類型（中文，例如 身份證、薪資單）
- DATE       ：上傳日期（YYYYMMDD）
- SEQ        ：流水號（三位數，001 起算）
- EXT        ：副檔名（pdf、jpg、png）
```

### 5.2 命名範例

```
C001_CASE-2026-0001_身份證_20260915_001.pdf
C001_CASE-2026-0001_薪資單_20260916_001.jpg
C001_CASE-2026-0001_薪資單_20260916_002.jpg
C001_CASE-2026-0001_聯徵報告_20260917_001.pdf
C002_CASE-2026-0002_對話截圖_20260920_001.png
```

### 5.3 流水號重複上傳邏輯

```
同一案件、同一 FILE_TYPE、同一 DATE
  → 第三份上傳 → SEQ = 003
  → 第四份上傳 → SEQ = 004
以此類推
```

### 5.4 實際存放目錄結構

```
D:\app_data\
  ├── mysql_data\           ← PostgreSQL/MariaDB 資料檔
  ├── files\                ← 所有附件檔案（不入 DB）
  │   ├── 2024\
  │   │   └── 09\
  │   │       ├── C001_CASE-2024-0001_身份證_20240915_001.pdf
  │   │       └── C001_CASE-2024-0001_薪資單_20240916_001.jpg
  │   └── 2026\
  │       └── 09\
  │           ├── C001_CASE-2026-0001_身份證_20260915_001.pdf
  │           └── C002_CASE-2026-0002_對話截圖_20260920_001.png
  ├── backups\
  │   ├── db\               ← 每日 DB dump
  │   └── files\             ← 檔案備份（robocopy 到外接硬碟）
  └── logs\                  ← API / DB 錯誤日誌
```

### 5.5 禁止事項

- **嚴禁業務員直接操作檔案系統**：所有檔案移動、刪除必須透過系統
- **嚴禁修改已上傳檔案的實體檔名**：以 DB 記錄為準

---

## 6. API 設計

### 6.1 API 基礎設定

```
Base URL：https://npl.yourdomain.com/api/v1
認證方式：JWT（JSON Web Token）
Header：Authorization: Bearer <token>
```

### 6.2 主要端點

#### 認證

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | /auth/login | 登入 |
| POST | /auth/refresh | 刷新 Token |
| POST | /auth/logout | 登出 |

#### 客戶

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | /clients | 取得客戶列表（分頁 + 篩選）|
| GET | /clients/:id | 取得單一客戶（含房產、債權人）|
| POST | /clients | 新建客戶 |
| PUT | /clients/:id | 更新客戶 |
| DELETE | /clients/:id | 軟刪除客戶 |

#### 案件

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | /cases | 取得案件列表（支援多條件篩選）|
| GET | /cases/:id | 取得案件完整資料 |
| POST | /cases | 新建案件 |
| PUT | /cases/:id | 更新案件 |
| PATCH | /cases/:id/status | 更新案件狀態 |
| DELETE | /cases/:id | 軟刪除案件 |
| GET | /cases/:id/files | 取得案件附件清單 |
| GET | /cases/:id/logs | 取得案件歷程 |
| POST | /cases/:id/logs | 新增案件歷程 |

#### 附件（Case Files）

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | /cases/:id/files | 上傳附件（ multipart/form-data）|
| GET | /files/:id | 下載附件 |
| DELETE | /files/:id | 軟刪除附件 |
| PATCH | /files/:id/status | 更新檔案狀態 |

#### 房產與債權人

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | /clients/:id/properties | 取得客戶房產 |
| POST | /clients/:id/properties | 新增房產 |
| PUT | /properties/:id | 更新房產 |
| GET | /clients/:id/creditors | 取得客戶債權人 |
| POST | /clients/:id/creditors | 新增債權人 |
| PUT | /creditors/:id | 更新債權人 |

#### 系統

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | /health | 健康檢查（給 Cloudflare Monitor）|
| GET | /settings | 取得系統設定 |
| PUT | /settings/:key | 更新系統設定（僅 admin）|

### 6.3 錯誤回應格式

```json
{
  "success": false,
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "案件不存在或已被刪除",
    "details": {}
  },
  "timestamp": "2026-09-30T12:00:00Z"
}
```

### 6.4 分頁格式

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

## 7. 權限設計

### 7.1 JWT Token 設計

```json
{
  "sub": "user_id",
  "name": "王業務",
  "role": "business",
  "department": "北區",
  "exp": 1735689600,
  "iat": 1735603200
}
```

### 7.2 權限矩陣

| 功能 | admin | business | viewer |
|------|:-----:|:--------:|:------:|
| 看自己案件 | ✅ | ✅ | ❌ |
| 看所有案件 | ✅ | ❌ | ❌ |
| 新建案件 | ✅ | ✅ | ❌ |
| 編輯案件 | ✅ | ✅（自己）| ❌ |
| 刪除案件 | ✅ | ❌ | ❌ |
| 上傳附件 | ✅ | ✅（自己）| ❌ |
| 刪除附件 | ✅ | ✅（自己）| ❌ |
| 新建客戶 | ✅ | ✅ | ❌ |
| 查看所有客戶 | ✅ | ❌ | ❌ |
| 查看被授權客戶 | ❌ | ❌ | ✅ |
| 編輯系統設定 | ✅ | ❌ | ❌ |
| 查看所有業務員資料 | ✅ | ❌ | ❌ |
| 查看還原刪除資料 | ✅ | ❌ | ❌ |

### 7.3 業務員資料隔離實作

```sql
-- API 層統一加上下列條件
-- 業務員只能看到自己的案件
WHERE cases.business_owner_id = :current_user_id

-- admin 可以看到全部（略過過濾）
WHERE 1=1
```

---

## 8. 備份策略

### 8.1 備份層次

| 層次 | 頻率 | 工具 | 目的地 |
|------|------|------|--------|
| DB 完全備份 | 每日凌晨 3:00 | pg_dump / mysqldump | 本機 + 外接硬碟 + 雲端 |
| DB 增量備份 | 每小時 | pg_backup 或 WAL | 外接硬碟 |
| 檔案同步 | 每小時增量 | robocopy / rsync | 外接硬碟 |
| 檔案異地備份 | 每日 | rclone → Google Drive / MEGA | 雲端 |
| 版本控制 | 每次改版 | Git | GitHub / Gitea |

### 8.2 Windows 工作排程器設定

```bat
# D:\backup_scripts\daily_db_backup.bat
@echo off
set DATE=%date:~0,4%%date:~5,2%%date:~8,2%
set BACKUP_DIR=D:\app_data\backups\db
set LOG_DIR=D:\app_data\backups\logs

"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" ^
  -U postgres ^
  -d npl_db ^
  -Fc ^
  -f "%BACKUP_DIR%\npl_db_%DATE%.dump" 2>> "%LOG_DIR%\backup.log"

# 壓縮
powershell -command "Compress-Archive -Path '%BACKUP_DIR%\npl_db_%DATE%.dump' -DestinationPath '%BACKUP_DIR%\npl_db_%DATE%.zip' -Force"

# 刪除超過 30 天的備份
forfiles /p "%BACKUP_DIR%" /s /m *.zip /D -30 /C "cmd /c del @path"
```

```bat
# D:\backup_scripts\sync_files.bat
@echo off
robocopy D:\app_data\files E:\backup\files /MIR /R:3 /W:5 /LOG:D:\app_data\backups\logs\robocopy.log
```

### 8.3 還原測試（每季一次）

- 每季執行一次「災難還原演練」
- 從備份還原到測試機
- 驗證資料完整性和系統功能正常

### 8.4 檔案完整性檢查（每年一次）

```sql
-- 比對 DB 記錄的 stored_path 與實際檔案是否存在
SELECT cf.id, cf.stored_filename, cf.stored_path
FROM case_files cf
WHERE cf.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os_read_file('/path/to' || cf.stored_path) -- 外部腳本
  );
-- 產出「檔案缺失報告」，手動補救
```

---

## 9. 監控與警報

### 9.1 基本監控（必要）

| 監控項目 | 實作方式 | 警報條件 |
|----------|----------|----------|
| API 健康狀態 | Cloudflare Monitor 每天檢查 `/api/health` | 回應非 200 |
| 硬碟空間 | Windows 工作排程 + PowerShell | 低於 20GB |
| DB 連線數 | PostgreSQL `pg_stat_activity` | 超過 80% |
| 備份執行 | 檢查備份日誌是否存在 | 昨日備份不存在 |

### 9.2 Health Check 端點

```json
// GET /api/health
{
  "status": "ok",
  "timestamp": "2026-09-30T12:00:00Z",
  "uptime_seconds": 86400,
  "db": "connected",
  "db_version": "PostgreSQL 16",
  "disk_free_gb": 150.3,
  "backup_last_run": "2026-09-30T03:00:00Z"
}
```

### 9.3 慢查詢監控（PostgreSQL）

```sql
-- 開啟查詢統計（一次性執行）
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查看最慢的 10 筆查詢
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 10. 故障排除

### 10.1 常見問題快速對照

| 問題 | 可能原因 | 解決方式 |
|------|----------|----------|
| 業務員無法登入 | Token 過期 | 重新登入取得新 Token |
| 檔案上傳失敗 | 硬碟滿了 | 檢查 D:\app_data\ 剩餘空間 |
| API 回應很慢 | 硬碟 I/O 瓶頸 | 考慮升級 SSD 或優化查詢 |
| cloudflared 斷線 | 網路不穩定 | 設定 cloudflared 重啟服務 |
| DB 連線失敗 | PostgreSQL 服務停止 | 檢查服務是否 Running |
| 查不到案件 | 被軟刪除或非自己案件 | 確認案件狀態和業務員身份 |

### 10.2 PostgreSQL 緊急修復

```bash
# 查看 DB 是否運行中
sc query postgresql-x64-16

# 啟動服務
net start postgresql-x64-16

# 緊急匯出（如果 DB 還能讀）
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d npl_db -F c -f D:\emergency_backup.dump

# 查看 WAL 檔（災難復原用）
"C:\Program Files\PostgreSQL\16\bin\pg_controldata.exe" -D "D:\app_data\pgsql\data"
```

### 10.3 Cloudflare Tunnel 故障排除

```bash
# 查看 tunnel 狀態
cloudflared tunnel info <tunnel-name>

# 查看 cloudflared 日誌
cloudflared tunnel run <tunnel-name> --loglevel debug

# 重新產生 tunnel token
cloudflared tunnel token -tunnel-name <name> > token.txt

# 確認 CNAME 設定
# DNS 需有：npl.yourdomain.com CNAME <tunnel-id>.cfargotunnel.com
```

### 10.4 緊急聯絡清單（放在主機旁）

```
┌─────────────────────────────────────────┐
│  緊急維護聯絡                            │
├─────────────────────────────────────────┤
│  系統管理員：Samuel周                      │
│  手機：0912-XXX-XXX                      │
│                                         │
│  主機位置：________________（填入位置）    │
│  路由器位置：________________            │
│                                         │
│  Cloudflare Tunnel Token：               │
│  （存放在安全的密碼管理器裡）             │
│                                         │
│  備份硬碟位置：________________          │
│  最後備份時間：________________          │
└─────────────────────────────────────────┘
```

---

## 11. 網頁前端（Web App）

### 11.1 頁面結構

```
首頁儀表板（Dashboard）
  └→ 今日待辦（到期案件/待補件）
  └→ 本月新案件
  └→ 案件狀態分布（圖表）

案件列表
  └→ 搜尋列（姓名/身份證/案件編號）
  └→ 篩選（狀態/業務員/日期區間）
  └→ 列表（點擊進案件詳情）

案件詳情
  └→ 基本資料（客戶/房產/債權人）
  └→ 附件列表（可上傳/下載）
  └→ 案件歷程（時間軸）
  └→ 操作（編輯/新建補件/寫歷程）

客戶管理
  └→ 客戶列表
  └→ 客戶詳情
       └→ 基本資料
       └→ 關聯案件
       └→ 房產資料
       └→ 債權人資料

檔案上傳
  └→ 拖放上傳區
  └→ 案件選擇
  └→ 文件類型下拉選單
  └→ 自動命名預覽

管理功能（admin）
  └→ 使用者管理
  └→ 系統設定
  └→ 備份管理
  └→ 刪除資料還原
```

### 11.2 UI 設計原則

- **手機優先（Mobile First）**：主要使用情境是業務員拿手機查案件
- **離線提示**：網路斷線時顯示「離線模式，上次同步時間：14:30」
- **大觸控區域**：按鈕最小 44px，方便業務員操作
- **文件狀態色彩標記**：
  - 🔴 待收集
  - 🟡 已上傳
  - 🟢 已確認
  - ⚫ 已作廢

---

## 12. 行動版需求

### 12.1 優先功能（第一版）

1. **案件查詢**：輸入姓名或身份證，查看案件狀態
2. **案件詳情**：查看客戶基本資料、房產、債權人
3. **附件檢視**：PDF 直接在瀏覽器打開，圖片縮圖預覽
4. **基本搜尋**：姓名、手機、案件編號
5. **補件提醒**：收到系統通知後可直接在手机上查看

### 12.2 未來功能（第二版）

1. **離線快取**：PWA，業務員在地下室也能看最近案件
2. **手機上傳**：業務員在外直接拍照上傳（壓縮後上傳）
3. **LINE 通知整合**：補件提醒自動發 LINE 給業務員
4. **語音輸入**：案件歷程用講的，語音轉文字

---

## 13. 第二版待辦功能

| 功能 | 優先順序 | 說明 |
|------|----------|------|
| 全文搜尋（Elasticsearch）| 中 | 所有文字欄位可搜尋 |
| 銀行端入口（唯讀 view）| 高 | 讓銀行內部人員看案件進度 |
| LINE Bot 通知 | 中 | 補件提醒自動發 LINE |
| Excel 批次匯入/匯出 | 中 | 大量建檔時用 |
| 照片拍攝直接上傳 | 中 | 手機拍照即上傳，支援離線佇列 |
| 案件統計報表 | 低 | 產出每月新案數、成交率、營收 |
| 訊息整合（LINE 對話截圖自動下載）| 低 | Zapier/Make 自動化 |
| 多公司/多部門支援 | 低 | 如果未來擴張到其他縣市 |

---

## 附錄

### A. 資料庫初始化 SQL（PostgreSQL）

```sql
-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 底下請依序執行第 4.3 節的各 Table DDL
-- （略，見上方欄位定義）

-- 初始管理員帳號（密碼請立即修改）
INSERT INTO users (id, username, password_hash, name, role)
VALUES (
  uuid_generate_v4(),
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4p.S8xO0kC4Wx0Mm',  -- 臨時密碼：NplAdmin2026!
  'Samuel周',
  'admin'
);
```

### B. 安裝檢查清單（第一次架設時用）

```
□ Windows 11 主機已開機，遠端桌面可連線
□ PostgreSQL 16 已安裝，5432 端口可本機連線
□ cloudflared 已下載，可執行
□ Cloudflare 帳號已建立，域名已转入 Cloudflare DNS
□ 申請 Cloudflare Tunnel，綁定 npl.yourdomain.com
□ 確認路由器有連外網，cloudflared 可以連出
□ 建立第一個管理員帳號，設定強密碼
□ 執行第一次完整 DB 備份，確認可以還原
□ 測試外部網路可以打開登入頁面
□ 測試上傳一個測試檔案，確認命名正確、DB 有記錄
□ 設定 Windows 工作排程器，確認每日備份有執行
□ 通知業務員測試帳號，確認權限正確
```

---

**規格書版本歷史**：

| 版本 | 日期 | 變更內容 |
|------|------|----------|
| v1.0 | 2026-09-30 | 初次建立，涵蓋完整討論內容 |

