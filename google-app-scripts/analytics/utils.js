/**
 * Утилиты для проекта аналитики.
 */

/**
 * Возвращает ID spreadsheet с Orders_Raw из Script Properties.
 */
function getSourceRawSpreadsheetId() {
  const id =
    PropertiesService.getScriptProperties().getProperty(
      "SOURCE_RAW_SPREADSHEET_ID",
    ) ?? "";
  if (!id) {
    throw new Error(
      "Не задан SOURCE_RAW_SPREADSHEET_ID в Script Properties. " +
        "Добавьте его: Extensions → Apps Script → Project Settings → Script Properties.",
    );
  }
  return id;
}

/**
 * Получает или создаёт лист с указанным именем в текущем spreadsheet.
 */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Форматирует Date в строку dd.MM.yyyy.
 */
function formatDate(date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return d + "." + m + "." + y;
}

/**
 * Парсит строку dd.MM.yyyy в Date.
 * Возвращает null если формат невалидный.
 */
function parseDate(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.trim().split(".");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Преобразует значение из ячейки в Date.
 * Поддерживает объект Date и строку dd.MM.yyyy.
 */
function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return parseDate(value);
  return null;
}

/**
 * Строит индекс заголовков: { label: columnIndex }.
 */
function buildHeaderIndex(headers) {
  const index = {};
  headers.forEach(function (h, i) {
    index[String(h).trim()] = i;
  });
  return index;
}

/**
 * Получает значение колонки из строки по label заголовка.
 */
function getCellValue(row, headerIndex, label) {
  const idx = headerIndex[label];
  return idx !== undefined ? row[idx] : undefined;
}

/**
 * Агрегирует строки Orders_Raw в уникальные заказы.
 * Возвращает Map<orderId, { rows: [], meta: {} }>.
 *
 * meta содержит order-level поля (берутся из первой строки заказа):
 *   finalAmount, discountAmount, promocode, discountValue, deliveryType, deliveryPrice
 *
 * rows содержит product-level данные (dish, qty, price, amount, day, calories).
 */
function getUniqueOrders(dataRows, headerIndex) {
  const orders = new Map();

  dataRows.forEach(function (row) {
    const orderId = getCellValue(row, headerIndex, COLUMN_MAP.order_id);
    if (!orderId) return;

    const key = String(orderId);

    if (!orders.has(key)) {
      orders.set(key, {
        meta: {
          orderId: key,
          orderDate: getCellValue(row, headerIndex, COLUMN_MAP.order_date),
          clientName: getCellValue(row, headerIndex, COLUMN_MAP.client_name),
          finalAmount:
            Number(getCellValue(row, headerIndex, COLUMN_MAP.final_amount)) ||
            0,
          discountAmount:
            Number(
              getCellValue(row, headerIndex, COLUMN_MAP.discount_amount),
            ) || 0,
          promocode: getCellValue(row, headerIndex, COLUMN_MAP.promocode) || "",
          discountValue:
            getCellValue(row, headerIndex, COLUMN_MAP.discount_value) || "",
          deliveryType:
            getCellValue(row, headerIndex, COLUMN_MAP.delivery_type) || "",
          deliveryPrice:
            Number(getCellValue(row, headerIndex, COLUMN_MAP.delivery_price)) ||
            0,
        },
        rows: [],
      });
    }

    orders.get(key).rows.push({
      dish: getCellValue(row, headerIndex, COLUMN_MAP.dish) || "",
      qty: Number(getCellValue(row, headerIndex, COLUMN_MAP.qty)) || 0,
      price: Number(getCellValue(row, headerIndex, COLUMN_MAP.price)) || 0,
      amount: Number(getCellValue(row, headerIndex, COLUMN_MAP.amount)) || 0,
      day: getCellValue(row, headerIndex, COLUMN_MAP.day) || "",
      calories: getCellValue(row, headerIndex, COLUMN_MAP.calories) || "",
    });
  });

  return orders;
}

/**
 * Читает данные из Orders_Raw источника, фильтрует по диапазону дат.
 * Возвращает { headers: string[], headerIndex: {}, dataRows: [][] }.
 */
function fetchRawData(startDate, endDate) {
  const sourceId = getSourceRawSpreadsheetId();
  const ss = SpreadsheetApp.openById(sourceId);
  const sheet = ss.getSheetByName(RAW_SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'Лист "' + RAW_SHEET_NAME + '" не найден в spreadsheet ' + sourceId,
    );
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return { headers: [], headerIndex: {}, dataRows: [] };
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const headerIndex = buildHeaderIndex(headers);

  const orderDateLabel = COLUMN_MAP.order_date;
  const orderDateIdx = headerIndex[orderDateLabel];

  if (orderDateIdx === undefined) {
    throw new Error(
      'Столбец "' + orderDateLabel + '" не найден в заголовках Orders_Raw',
    );
  }

  const allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // Нормализуем endDate — до конца дня
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const filtered = allData.filter(function (row) {
    const dateVal = toDate(row[orderDateIdx]);
    if (!dateVal) return false;
    return dateVal >= startDate && dateVal <= endOfDay;
  });

  return { headers: headers, headerIndex: headerIndex, dataRows: filtered };
}
