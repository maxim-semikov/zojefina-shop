/**
 * Генерация отчёта аналитики.
 */

/**
 * Основная функция: строит отчёт за указанный период.
 * @param {Date} startDate
 * @param {Date} endDate
 */
function buildReport(startDate, endDate) {
  const { headerIndex, dataRows } = fetchRawData(startDate, endDate);

  if (dataRows.length === 0) {
    SpreadsheetApp.getUi().alert("Нет заказов за выбранный период.");
    return;
  }

  const orders = getUniqueOrders(dataRows, headerIndex);
  const sheet = prepareReportSheet();

  let row = 1;

  // === ЗАГОЛОВОК ===
  row = writeTitle(sheet, row, startDate, endDate);

  // === ОБЩИЕ ПОКАЗАТЕЛИ ===
  row = writeGeneralMetrics(sheet, row, orders);

  // === ТОП-10 БЛЮД ===
  row = writeTopDishes(sheet, row, dataRows, headerIndex);

  // === РАСПРЕДЕЛЕНИЕ ПО ДНЯМ НЕДЕЛИ ===
  row = writeDayDistribution(sheet, row, dataRows, headerIndex);

  // === ПРОМОКОДЫ ===
  row = writePromocodes(sheet, row, orders);

  // === ТИП ДОСТАВКИ ===
  row = writeDeliveryTypes(sheet, row, orders);

  // Авто-ширина
  sheet.autoResizeColumns(1, 3);

  SpreadsheetApp.getUi().alert(
    "Отчёт сформирован на листе «" + REPORT_SHEET_NAME + "».",
  );
}

// ──────────────────────────────────────────────
// Подготовка листа
// ──────────────────────────────────────────────

function prepareReportSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(REPORT_SHEET_NAME);
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(REPORT_SHEET_NAME);
  }
  return sheet;
}

// ──────────────────────────────────────────────
// Заголовок отчёта
// ──────────────────────────────────────────────

function writeTitle(sheet, row, startDate, endDate) {
  const title =
    "ОТЧЁТ ЗА ПЕРИОД: " + formatDate(startDate) + " — " + formatDate(endDate);
  sheet.getRange(row, 1, 1, 3).merge();
  sheet.getRange(row, 1).setValue(title).setFontSize(14).setFontWeight("bold");
  return row + 2;
}

// ──────────────────────────────────────────────
// Общие показатели
// ──────────────────────────────────────────────

function writeGeneralMetrics(sheet, row, orders) {
  row = writeSectionHeader(sheet, row, "ОБЩИЕ ПОКАЗАТЕЛИ");

  const orderCount = orders.size;
  let totalRevenue = 0;
  let totalDiscount = 0;

  orders.forEach(function (order) {
    totalRevenue += order.meta.finalAmount;
    totalDiscount += order.meta.discountAmount;
  });

  const avgCheck = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  const metrics = [
    ["Всего заказов:", orderCount],
    ["Общая выручка:", totalRevenue],
    ["Средний чек:", avgCheck],
    ["Общая сумма скидок:", totalDiscount],
  ];

  metrics.forEach(function (m) {
    sheet.getRange(row, 1).setValue(m[0]).setFontWeight("bold");
    sheet.getRange(row, 2).setValue(m[1]).setNumberFormat("#,##0");
    row++;
  });

  return row + 1;
}

// ──────────────────────────────────────────────
// Топ-10 блюд
// ──────────────────────────────────────────────

function writeTopDishes(sheet, row, dataRows, headerIndex) {
  row = writeSectionHeader(sheet, row, "ТОП-10 БЛЮД");

  // Подсчёт по блюдам
  const dishStats = {}; // dish -> { orderIds: Set, totalQty: number }

  dataRows.forEach(function (r) {
    const dish = getCellValue(r, headerIndex, COLUMN_MAP.dish) || "";
    const qty = Number(getCellValue(r, headerIndex, COLUMN_MAP.qty)) || 0;
    const orderId = getCellValue(r, headerIndex, COLUMN_MAP.order_id) || "";

    if (!dish) return;

    if (!dishStats[dish]) {
      dishStats[dish] = { orderIds: {}, totalQty: 0 };
    }
    dishStats[dish].orderIds[orderId] = true;
    dishStats[dish].totalQty += qty;
  });

  // Сортировка по общему кол-ву (убывание)
  const sorted = Object.keys(dishStats)
    .map(function (dish) {
      return {
        dish: dish,
        orderCount: Object.keys(dishStats[dish].orderIds).length,
        totalQty: dishStats[dish].totalQty,
      };
    })
    .sort(function (a, b) {
      return b.totalQty - a.totalQty;
    })
    .slice(0, 10);

  // Заголовки таблицы
  sheet.getRange(row, 1).setValue("Блюдо").setFontWeight("bold");
  sheet.getRange(row, 2).setValue("Кол-во заказов").setFontWeight("bold");
  sheet.getRange(row, 3).setValue("Общее кол-во").setFontWeight("bold");
  row++;

  sorted.forEach(function (item) {
    sheet.getRange(row, 1).setValue(item.dish);
    sheet.getRange(row, 2).setValue(item.orderCount);
    sheet.getRange(row, 3).setValue(item.totalQty);
    row++;
  });

  return row + 1;
}

// ──────────────────────────────────────────────
// Распределение по дням недели
// ──────────────────────────────────────────────

function writeDayDistribution(sheet, row, dataRows, headerIndex) {
  row = writeSectionHeader(sheet, row, "РАСПРЕДЕЛЕНИЕ ПО ДНЯМ НЕДЕЛИ");

  const dayOrder = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const dayCounts = {};
  dayOrder.forEach(function (d) {
    dayCounts[d] = 0;
  });

  dataRows.forEach(function (r) {
    const day = String(
      getCellValue(r, headerIndex, COLUMN_MAP.day) || "",
    ).trim();
    if (dayCounts[day] !== undefined) {
      dayCounts[day]++;
    }
  });

  sheet.getRange(row, 1).setValue("День").setFontWeight("bold");
  sheet.getRange(row, 2).setValue("Кол-во позиций").setFontWeight("bold");
  row++;

  dayOrder.forEach(function (day) {
    sheet.getRange(row, 1).setValue(day);
    sheet.getRange(row, 2).setValue(dayCounts[day]);
    row++;
  });

  return row + 1;
}

// ──────────────────────────────────────────────
// Промокоды
// ──────────────────────────────────────────────

function writePromocodes(sheet, row, orders) {
  row = writeSectionHeader(sheet, row, "ПРОМОКОДЫ");

  const promoStats = {}; // code -> { count, totalDiscount }

  orders.forEach(function (order) {
    const code = order.meta.promocode;
    if (!code) return;

    if (!promoStats[code]) {
      promoStats[code] = { count: 0, totalDiscount: 0 };
    }
    promoStats[code].count++;
    promoStats[code].totalDiscount += order.meta.discountAmount;
  });

  const promoCodes = Object.keys(promoStats);

  if (promoCodes.length === 0) {
    sheet
      .getRange(row, 1)
      .setValue("Промокоды не использовались")
      .setFontColor("#999999");
    return row + 2;
  }

  sheet.getRange(row, 1).setValue("Промокод").setFontWeight("bold");
  sheet.getRange(row, 2).setValue("Использований").setFontWeight("bold");
  sheet.getRange(row, 3).setValue("Сумма скидок").setFontWeight("bold");
  row++;

  promoCodes
    .sort(function (a, b) {
      return promoStats[b].count - promoStats[a].count;
    })
    .forEach(function (code) {
      sheet.getRange(row, 1).setValue(code);
      sheet.getRange(row, 2).setValue(promoStats[code].count);
      sheet
        .getRange(row, 3)
        .setValue(promoStats[code].totalDiscount)
        .setNumberFormat("#,##0");
      row++;
    });

  return row + 1;
}

// ──────────────────────────────────────────────
// Тип доставки
// ──────────────────────────────────────────────

function writeDeliveryTypes(sheet, row, orders) {
  row = writeSectionHeader(sheet, row, "ТИП ДОСТАВКИ");

  const typeStats = {}; // type -> count

  orders.forEach(function (order) {
    const type = order.meta.deliveryType || "(не указан)";
    typeStats[type] = (typeStats[type] || 0) + 1;
  });

  sheet.getRange(row, 1).setValue("Тип").setFontWeight("bold");
  sheet.getRange(row, 2).setValue("Кол-во заказов").setFontWeight("bold");
  row++;

  Object.keys(typeStats)
    .sort(function (a, b) {
      return typeStats[b] - typeStats[a];
    })
    .forEach(function (type) {
      sheet.getRange(row, 1).setValue(type);
      sheet.getRange(row, 2).setValue(typeStats[type]);
      row++;
    });

  return row + 1;
}

// ──────────────────────────────────────────────
// Вспомогательные
// ──────────────────────────────────────────────

function writeSectionHeader(sheet, row, title) {
  const header = "═══ " + title + " ═══";
  sheet.getRange(row, 1, 1, 3).merge();
  sheet
    .getRange(row, 1)
    .setValue(header)
    .setFontSize(11)
    .setFontWeight("bold")
    .setBackground("#EBF5FB");
  return row + 1;
}
