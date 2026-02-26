function promptBuildInvoice() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Сформировать накладную",
    "Введите номер заказа (orderId):",
    ui.ButtonSet.OK_CANCEL,
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const orderId = response.getResponseText().trim();
  if (!orderId) {
    ui.alert("Номер заказа не указан");
    return;
  }

  buildInvoiceByOrderId(orderId);
}

function buildInvoiceByOrderId(orderId) {
  const ss = SpreadsheetApp.getActive();
  const sourceSheet = ss.getSheetByName("Заказы");

  if (!sourceSheet) {
    throw new Error("Лист Заказы не найден");
  }

  const data = sourceSheet.getDataRange().getValues();
  const headers = data[0];
  const idx = (name) => headers.indexOf(name);

  const orderIdCol = idx("Номер заказа");
  const deliveryDateCol = idx("Дата доставки");
  const dishCol = idx("Блюдо");
  const qtyCol = idx("Кол-во");
  const priceCol = idx("Цена (общая)");
  const caloriesCol = idx("Калории");

  const nameCol = idx("Клиент");
  const phoneCol = idx("Телефон");
  const emailCol = idx("Email");
  const streetCol = idx("Улица");
  const homeCol = idx("Дом");
  const flatCol = idx("Квартира");

  const promocodeCol = idx("Промокод");
  const discountValueCol = idx("Размер скидки (%)");
  const discountAmountCol = idx("Сумма скидки");

  const rows = data
    .slice(1)
    .filter((r) => String(r[orderIdCol]) === String(orderId));

  if (!rows.length) {
    SpreadsheetApp.getUi().alert(`Заказ ${orderId} не найден`);
    return;
  }

  const first = rows[0];
  const client = {
    name: first[nameCol],
    phone: first[phoneCol],
    email: first[emailCol],
    street: first[streetCol],
    home: first[homeCol],
    flat: first[flatCol],
  };

  const orderInfo = {
    promocode: promocodeCol !== -1 ? first[promocodeCol] || "" : "",
    discountValue:
      discountValueCol !== -1 ? Number(first[discountValueCol]) || 0 : 0,
    discountAmount:
      discountAmountCol !== -1 ? Number(first[discountAmountCol]) || 0 : 0,
  };

  // --- группировка по датам
  const deliveries = {};

  rows.forEach((r) => {
    const date = r[deliveryDateCol];
    const key =
      date instanceof Date
        ? Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd")
        : "__no_date__";

    if (!deliveries[key]) {
      deliveries[key] = {
        date: date instanceof Date ? date : null,
        items: [],
      };
    }

    const dish = r[dishCol];
    const qty = Number(r[qtyCol]) || 0;
    if (!dish || qty <= 0) return;

    const price = priceCol !== -1 ? Number(r[priceCol]) || 0 : 0;
    const calories = caloriesCol !== -1 ? r[caloriesCol] || "" : "";

    deliveries[key].items.push({ dish, calories, qty, price });
  });

  createInvoiceSheet(orderId, client, deliveries, orderInfo);
}

function createInvoiceSheet(orderId, client, deliveries, orderInfo) {
  const ss = SpreadsheetApp.getActive();
  const sheetName = `Invoice_${orderId}`;
  const NUM_COLS = 5; // A–E

  const oldSheet = ss.getSheetByName(sheetName);
  if (oldSheet) ss.deleteSheet(oldSheet);

  const sheet = ss.insertSheet(sheetName);

  let row = 1;

  // ========== ШАПКА ЗАКАЗА ==========

  // Строка 1: НАКЛАДНАЯ
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet
    .getRange(row, 1)
    .setValue(`НАКЛАДНАЯ № ${orderId}`)
    .setFontSize(14)
    .setFontWeight("bold");
  row++; // 2 — пустая
  row++;

  // Строка 3: Клиент
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet.getRange(row, 1).setValue(`Клиент: ${client.name}`);
  row++;

  // Строка 4: Телефон
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet.getRange(row, 1).setValue(`Телефон: ${client.phone}`);
  row++;

  // Строка 5: Email
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet.getRange(row, 1).setValue(`Email: ${client.email}`);
  row++; // 6 — пустая
  row++;

  // Строка 7: Адрес
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet.getRange(row, 1).setValue("Адрес доставки:").setFontWeight("bold");
  row++;

  // Строка 8: Значение адреса
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet
    .getRange(row, 1)
    .setValue(`ул. ${client.street}, д. ${client.home}, кв. ${client.flat}`);
  row++; // 9 — пустая
  row++;

  // ========== БЛОКИ ДОСТАВОК ==========
  const DATE_BG = "#EBF5FB";
  const DELIVERY_COST_BG = "#FFF9C4";
  const deliveryTotalCells = []; // E-ячейки «Итого с доставкой» для итоговой формулы
  const sumDishesCells = []; // E-ячейки «Сумма блюд» для вычисления скидки

  const sortedKeys = Object.keys(deliveries).sort();

  sortedKeys.forEach((dateKey) => {
    const delivery = deliveries[dateKey];

    // --- Заголовок даты ---
    const displayDate = delivery.date
      ? Utilities.formatDate(
          delivery.date,
          ss.getSpreadsheetTimeZone(),
          "dd.MM.yyyy",
        )
      : "БЕЗ ДАТЫ";

    sheet.getRange(row, 1, 1, NUM_COLS).merge();
    sheet
      .getRange(row, 1)
      .setValue(`═══ Доставка: ${displayDate} ═══`)
      .setFontWeight("bold")
      .setBackground(DATE_BG);
    // Фон на всю merge-область
    sheet.getRange(row, 1, 1, NUM_COLS).setBackground(DATE_BG);
    row++;

    // --- Заголовок таблицы блюд ---
    const tableHeaderRow = row;
    sheet
      .getRange(row, 1, 1, NUM_COLS)
      .setValues([["Блюдо", "Калории", "Кол-во", "Цена за шт", "Сумма"]])
      .setFontWeight("bold");
    row++;

    // --- Строки блюд ---
    const firstItemRow = row;

    delivery.items.forEach((item) => {
      // price — это общая сумма позиции, вычисляем цену за штуку
      const unitPrice = item.qty > 0 ? item.price / item.qty : item.price;
      sheet
        .getRange(row, 1, 1, NUM_COLS)
        .setValues([
          [item.dish, item.calories, item.qty, unitPrice, item.price],
        ]);
      row++;
    });

    const lastItemRow = row - 1;

    // --- Сумма блюд ---
    sheet.getRange(row, 1, 1, 4).merge();
    sheet
      .getRange(row, 1)
      .setValue("Сумма блюд:")
      .setHorizontalAlignment("right");
    sheet.getRange(row, 5).setFormula(`=SUM(E${firstItemRow}:E${lastItemRow})`);
    const sumDishesRow = row;
    sumDishesCells.push(`E${row}`);
    row++;

    // --- Доставка (редактируемая) ---
    sheet.getRange(row, 1, 1, 4).merge();
    sheet
      .getRange(row, 1)
      .setValue("Доставка:")
      .setHorizontalAlignment("right");
    sheet.getRange(row, 5).setValue(0).setBackground(DELIVERY_COST_BG);
    const deliveryCostRow = row;
    row++;

    // --- Итого с доставкой ---
    sheet.getRange(row, 1, 1, 4).merge();
    sheet
      .getRange(row, 1)
      .setValue("Итого с доставкой:")
      .setHorizontalAlignment("right")
      .setFontWeight("bold");
    sheet
      .getRange(row, 5)
      .setFormula(`=E${sumDishesRow}+E${deliveryCostRow}`)
      .setFontWeight("bold");
    deliveryTotalCells.push(`E${row}`);
    row++;

    // --- пустая строка-разделитель ---
    row++;
  });

  // ========== ИТОГОВЫЙ БЛОК ==========

  // пустая строка
  row++;

  // Промокод
  sheet.getRange(row, 1, 1, 4).merge();
  const promoText = orderInfo.promocode
    ? `Промокод: ${orderInfo.promocode} (${Math.round(orderInfo.discountValue * 100)}%)`
    : "Промокод: —";
  sheet.getRange(row, 1).setValue(promoText).setHorizontalAlignment("right");
  row++;

  // Скидка (из данных заказа)
  sheet.getRange(row, 1, 1, 4).merge();
  sheet.getRange(row, 1).setValue("Скидка:").setHorizontalAlignment("right");
  sheet
    .getRange(row, 5)
    .setValue(orderInfo.discountAmount ? -orderInfo.discountAmount : 0);
  const discountRow = row;
  row++;

  // Разделитель
  sheet.getRange(row, 1, 1, NUM_COLS).merge();
  sheet.getRange(row, 1).setValue("─────────────────────────────────");
  row++;

  // ИТОГО ПО ЗАКАЗУ (формула)
  sheet.getRange(row, 1, 1, 4).merge();
  sheet
    .getRange(row, 1)
    .setValue("ИТОГО ПО ЗАКАЗУ:")
    .setHorizontalAlignment("right")
    .setFontWeight("bold")
    .setFontSize(12);

  // Формула: SUM(все «Итого с доставкой») + Скидка (скидка уже отрицательная)
  const totalFormula =
    deliveryTotalCells.length > 0
      ? `=${deliveryTotalCells.join("+")}+E${discountRow}`
      : `=E${discountRow}`;

  sheet
    .getRange(row, 5)
    .setFormula(totalFormula)
    .setFontWeight("bold")
    .setFontSize(12);

  // ========== Авто-ширина колонок ==========
  sheet.autoResizeColumns(1, NUM_COLS);
}
