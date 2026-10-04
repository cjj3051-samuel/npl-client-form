# NPL 客戶進件資料表 — 設定指引

---

## 檔案位置
```
G:/我的雲端硬碟/TR-HermesAgent/npl-client-form/
├── index.html              ← 主要表單
└── backend/
    └── apps-script.js     ← Google Apps Script 後端
```

---

## 一、公司名稱去識別化

本系統已完成以下去識別化：
- 網頁標題：「NPL 客戶進件資料表」
- 個資聲明內文：已移除實際公司名稱，改用「本公司」
- 聯絡資訊：公司名稱已移除

---

## 二、個資聲明（每次填寫都要顯示）

**功能說明：**
- 每次打開網頁都會顯示個資聲明 Overlay
- 必須**滾動至最底**才能點擊「我已閱讀並同意」按鈕（防呆）
- 不同意**無法填寫表單**

**報告加註：**
- 報告頂部（HTML 和純文字）都會加註：
  > 「本人已詳閱並同意《個人資料保護聲明》，授權使用本資料作為送件之用」

---

## 三、GA4 流量追蹤設定

### GA4 是什麼？
Google Analytics 4（GA4）是 Google 的**免費網站流量分析工具**。當有人訪問你的網站，GA4 會告訴你：
- 📊 有多少人來看過 / 填過
- 👤 是新客戶還是回訪
- 📱 用手機還是電腦看的
- 🔍 從哪裡來的
- 📋 **填了幾次表單**
- 🏦 客戶風險分數的平均值

### 取得 GA4 ID
1. 前往 [analytics.google.com](https://analytics.google.com)
2. 建立帳號與資源，取得「衡量ID」（格式：G-XXXXXXXXXX）

### 替換 ID
用文字編輯器打開 `index.html`，找到 `G-XXXXXXXXXX` 並替換（共 2 處）。

### 可追蹤的事件

| 事件名稱 | 觸發時機 | 可帶參數 |
|---------|---------|---------|
| `accept_privacy` | 點擊同意個資聲明 | - |
| `generate_report` | 點擊「生成進件報告」 | 姓名、年收入、風險分數、完成度 |
| `copy_text` | 點擊「複製文字」 | - |
| `download_image` | 點擊「下載圖檔報告」 | 姓名、年收入、風險分數 |

---

## 四、Google Sheets 自動記錄設定

### Step 1：建立 Google Sheets
1. 新建 Google Sheets，命名「NPL 潛在客戶資料庫」
2. 複製網址中的 ID（`/d/【ID】/edit`）

### Step 2：建立 Apps Script
1. 前往 [script.google.com](https://script.google.com)
2. 新增專案，命名「NPL 後端」
3. 貼上 `backend/apps-script.js` 的內容
4. 替換 `SHEET_ID = 'YOUR_GOOGLE_SHEETS_ID_HERE';`
5. 儲存（Ctrl+S）

### Step 3：部署為網頁應用程式
1. 點擊「部署」→「新增部署」→「網頁應用程式」
2. 執行身份：myself｜可存取身份：任何人
3. 複製網址（格式：`https://script.google.com/macros/s/.../exec`）

### Step 4：填入 index.html
```javascript
const TRACK_CONFIG = {
  appsScriptUrl: 'https://script.google.com/macros/s/.../exec', // 貼上網址
  ...
};
```

---

## 五、Linux 主機 + Nginx 架站（最推薦）

### 什麼是 Nginx？
Nginx 是一個**網頁伺服器**，放在 Linux 主機上，讓別人可以透過網址看到你的網站。

### Step 1：把檔案上傳到主機
```bash
# 在你的電腦用 Git Bash 或 PowerShell：
scp -r G:/我的雲端硬碟/TR-HermesAgent/npl-client-form user@你的主機IP:/var/www/npl-form/
```
> 需要知道：主機的 IP、SSH 帳號密碼（問你的主機商或 IT）

### Step 2：安裝 Nginx
```bash
# 登入主機後，輸入：
sudo apt update
sudo apt install nginx -y
```

### Step 3：設定 Nginx
```bash
sudo nano /etc/nginx/sites-available/npl-form
```
貼入以下內容：
```nginx
server {
    listen 80;
    server_name 你的網址或IP;

    root /var/www/npl-form;
    index index.html;

    # 預設首頁
    location / {
        try_files $uri $uri/ =404;
    }

    # 拒絕直接存取 .js 檔案（保護原始碼）
    location ~ \.js$ {
        add_header Content-Type application/javascript;
        # 可加一行：deny all; 但會讓網頁功能失效
        # 因此這裡只做基本防護
    }

    # 禁止存取隱藏檔
    location ~ /\. {
        deny all;
    }
}
```
儲存（Ctrl+O → Enter → Ctrl+X）

### Step 4：啟用設定
```bash
sudo ln -s /etc/nginx/sites-available/npl-form /etc/nginx/sites-enabled/
sudo nginx -t          # 測試設定是否正確
sudo systemctl reload nginx
```

### Step 5：申請免費 SSL（強烈建議）
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 你的網址
```
之後就可以用 `https://` 開頭，瀏覽器顯示安全鎖。

### 預計完成後
- 別人直接打 `https://你的網址/npl-form/index.html` 就能看到網站
- 重要資料在主機後端執行，前端只處理顯示
- 如果需要密碼保護，可加上 HTTP Basic Auth

---

## 六、沒有 Linux 主機怎麼辦？

**免費方案推薦（任選一）：**

| 服務 | 特色 | 限制 |
|------|------|------|
| **Netlify** | 拖曳上傳，30秒架好 | 免費版一個月 100GB 流量 |
| **Vercel** | 部署快速 | 同上 |
| **GitHub Pages** | 完全免費 | 必須公開（可設密碼） |

**最簡單：Netlify**
1. 前往 [app.netlify.com](https://app.netlify.com)
2. 把 `npl-client-form` 資料夾壓縮成 ZIP
3. 拖進 Netlify 網頁 →馬上就有一個網址
4. 在 Site settings → Domain management 設定自訂網域

---

## 七、觀看報表的位置

| 資料類型 | 查看位置 |
|---------|---------|
| GA4 流量 | analytics.google.com → 報表 |
| Sheets 資料 | 你的 Google Sheets 文件 |

---

有任何問題再跟我說！
