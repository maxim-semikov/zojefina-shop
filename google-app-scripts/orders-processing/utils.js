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
