/**
 * NPL 客戶進件資料 — Google Apps Script 後端
 *
 * 設定方式：
 * 1. 前往 https://script.google.com
 * 2. 新增專案，貼上本檔案內容
 * 3. 部署 → 新部署 → 網頁應用程式
 *    → 執行身份：yself
 *    → 可存取身份：任何人
 * 4. 複製「網頁應用程式」網址
 * 5. 將網址貼到 index.html 的 TRACK_CONFIG.appsScriptUrl
 *
 * 欄位名稱（對應 index.html collectFullData() 的 key）：
 * 填報時間, 姓名, 身份證字號, 出生年月日, 年齡, 身份證換發日期,
 * 聯絡電話, 居住狀態, 居住年資, 婚姻狀況, 有無小孩, 學歷,
 * 公司名稱, 任職年資, 職稱, 年收入(萬元), 年收入(元), 負債明細,
 * 總負債(萬元), 信用卡張數, 信用卡銀行, 常用交易銀行, 流動資產明細,
 * 總資產(萬元), 近三個月聯徵, 查詢銀行數, 查詢銀行, 希望額度(萬元),
 * 希望額度(元), 用途說明, 風險分數, 風險等級, 風險安全指標,
 * 風險注意項目, 風險警示, 建議事項, 資料完成度
 */

// ── 試算表 ID（替換成你的 Google Sheets 網址中的 ID）────────────
const SHEET_ID = 'YOUR_GOOGLE_SHEETS_ID_HERE';

// ── シート名（預設）────────────────────────────────────────────
const SHEET_NAME = '潛在客戶資料';

// ── POST 接收器 ────────────────────────────────────────────────
function doPost(e) {
  try {
    const sheet = getSheet();
    const row = parseRow(e);

    if (!row || row.length === 0) {
      return jsonResponse({ status: 'error', message: '無資料' });
    }

    // 如果身份證已存在則更新，否則新增
    const idCol = 2; // B欄 = 身份證字號
    const existingRow = findRowById(sheet, row[idCol]);

    if (existingRow > 0) {
      // 更新現有列
      const now = new Date().toLocaleString('zh-TW');
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      sheet.getRange(existingRow, row.length + 1).setValue(now); // 更新時間
      return jsonResponse({ status: 'updated', row: existingRow });
    } else {
      // 新增列
      sheet.appendRow(row);
      return jsonResponse({ status: 'added', row: sheet.getLastRow() });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ── GET（測試用）────────────────────────────────────────────────
function doGet(e) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    return jsonResponse({ data: [], message: '尚無資料' });
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return jsonResponse({
    data: data.map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    })
  });
}

// ── 取得工作表 ─────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // 寫入標題列
    const headers = [
      '填報時間', '姓名', '身份證字號', '出生年月日', '年齡', '身份證換發日期',
      '聯絡電話', '居住狀態', '居住年資', '不動產地址', '婚姻狀況', '有無小孩', '學歷',
      '公司名稱', '任職年資', '職稱', '年收入(萬元)', '年收入(元)', '負債明細',
      '總負債(萬元)', '信用卡張數', '信用卡銀行', '常用交易銀行', '流動資產明細',
      '總資產(萬元)', '近三個月聯徵', '查詢銀行數', '查詢銀行', '希望額度(萬元)',
      '希望額度(元)', '用途說明', '風險分數', '風險等級', '風險安全指標',
      '風險注意項目', '風險警示', '建議事項', '資料完成度'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── 解析 POST 資料 ─────────────────────────────────────────────
function parseRow(e) {
  if (!e.postData || !e.postData.contents) return null;
  const data = JSON.parse(e.postData.contents);
  return [
    data['填報時間'] || '',
    data['姓名'] || '',
    data['身份證字號'] || '',
    data['出生年月日'] || '',
    data['年齡'] || '',
    data['身份證換發日期'] || '',
    data['聯絡電話'] || '',
    data['居住狀態'] || '',
    data['居住年資'] || '',
    data['不動產地址'] || '',
    data['婚姻狀況'] || '',
    data['有無小孩'] || '',
    data['學歷'] || '',
    data['公司名稱'] || '',
    data['任職年資'] || '',
    data['職稱'] || '',
    data['年收入(萬元)'] || '',
    data['年收入(元)'] || '',
    data['負債明細'] || '',
    data['總負債(萬元)'] || '',
    data['信用卡張數'] || '',
    data['信用卡銀行'] || '',
    data['常用交易銀行'] || '',
    data['流動資產明細'] || '',
    data['總資產(萬元)'] || '',
    data['近三個月聯徵'] || '',
    data['查詢銀行數'] || '',
    data['查詢銀行'] || '',
    data['希望額度(萬元)'] || '',
    data['希望額度(元)'] || '',
    data['用途說明'] || '',
    data['風險分數'] || '',
    data['風險等級'] || '',
    data['風險安全指標'] || '',
    data['風險注意項目'] || '',
    data['風險警示'] || '',
    data['建議事項'] || '',
    data['資料完成度'] || ''
  ];
}

// ── 以身份證查現有列 ────────────────────────────────────────────
function findRowById(sheet, id) {
  if (!id) return 0;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === id) return i + 1; // B欄 = index 2
  }
  return 0;
}

// ── JSON 回應 ──────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
