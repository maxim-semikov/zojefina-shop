function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getSourceSpreadsheetId() {
  const id =
    PropertiesService.getScriptProperties().getProperty(
      "SOURCE_SPREADSHEET_ID",
    ) ?? "";
  return id;
}

function ensureSingleFilter(sheet) {
  const range = sheet.getDataRange();
  const existingFilter = range.getFilter();

  if (!existingFilter) {
    range.createFilter();
  }
}

function validateRow(row, headers) {
  const errors = [];

  const orderIdIdx = headers.indexOf("Номер заказа");
  const dishIdx = headers.indexOf("Блюдо");
  const qtyIdx = headers.indexOf("Кол-во");

  const orderId = orderIdIdx !== -1 ? row[orderIdIdx] : "";
  const dish = dishIdx !== -1 ? row[dishIdx] : "";
  const qty = qtyIdx !== -1 ? row[qtyIdx] : "";

  if (!orderId || String(orderId).trim() === "") {
    errors.push("Номер заказа пустой");
  }
  if (!dish || String(dish).trim() === "") {
    errors.push("Блюдо пустое");
  }
  const qtyNumber = Number(qty);
  if (!qty || Number.isNaN(qtyNumber) || qtyNumber <= 0) {
    errors.push(`Кол-во невалидно: ${qty}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Маппинг сокращений дней недели в JavaScript day index (0=Вс, 1=Пн, ..., 6=Сб)
 */
function getDayJsIndex(dayAbbr) {
  const map = { Пн: 1, Вт: 2, Ср: 3, Чт: 4, Пт: 5, Сб: 6, Вс: 0 };
  return map[dayAbbr] !== undefined ? map[dayAbbr] : -1;
}

/**
 * Маппинг для сортировки (Пн=1 ... Вс=7)
 */
function getDaySortIndex(dayAbbr) {
  const map = { Пн: 1, Вт: 2, Ср: 3, Чт: 4, Пт: 5, Сб: 6, Вс: 7 };
  return map[dayAbbr] || 99;
}

/**
 * Вычисляет ближайшую будущую дату для указанного дня недели.
 * @param {string} dayAbbr — сокращение дня (Пн, Вт, ...)
 * @param {Date} orderDate — дата заказа
 * @returns {Date|null} — ближайшая дата (не ранее следующего дня после заказа)
 */
function calculateDeliveryDate(dayAbbr, orderDate) {
  const targetDay = getDayJsIndex(dayAbbr);
  if (targetDay === -1) return null;

  const result = new Date(orderDate);
  result.setDate(result.getDate() + 1); // не ранее следующего дня

  while (result.getDay() !== targetDay) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}
