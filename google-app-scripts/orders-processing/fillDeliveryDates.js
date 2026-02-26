/**
 * Заполняет пустые ячейки «Дата доставки» для ВСЕХ заказов в листе «Заказы».
 * Учитывает все строки каждого заказа для корректной группировки по дням,
 * но записывает даты только в пустые ячейки.
 * Автозаполненные даты подсвечиваются синим цветом текста.
 */
function fillDeliveryDatesAll() {
  _fillDeliveryDates(null);
}

/**
 * Заполняет пустые ячейки «Дата доставки» для конкретного заказа.
 * Запрашивает номер заказа через prompt.
 */
function fillDeliveryDatesById() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Заполнить день доставки",
    "Введите номер заказа:",
    ui.ButtonSet.OK_CANCEL,
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const inputOrderId = response.getResponseText().trim();
  if (!inputOrderId) {
    ui.alert("Ошибка", "Номер заказа не может быть пустым.", ui.ButtonSet.OK);
    return;
  }

  _fillDeliveryDates(inputOrderId);
}

/**
 * Общая логика заполнения дат доставки.
 * @param {string|null} filterOrderId — если задан, обрабатывает только этот заказ; null = все заказы.
 */
function _fillDeliveryDates(filterOrderId) {
  const SHEET_NAME = "Заказы";
  const AUTO_FILL_TEXT_COLOR = "#1565C0";
  const ui = SpreadsheetApp.getUi();

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    ui.alert("Ошибка", `Лист "${SHEET_NAME}" не найден.`, ui.ButtonSet.OK);
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    ui.alert("Информация", "Нет данных в листе.", ui.ButtonSet.OK);
    return;
  }

  const headers = data[0];
  const deliveryDateIdx = headers.indexOf("Дата доставки");
  const dayIdx = headers.indexOf("День према");
  const deliveryTypeIdx = headers.indexOf("Тип доставки");
  const orderIdIdx = headers.indexOf("Номер заказа");
  const orderDateIdx = headers.indexOf("Дата заказа");

  if (
    deliveryDateIdx === -1 ||
    dayIdx === -1 ||
    deliveryTypeIdx === -1 ||
    orderIdIdx === -1
  ) {
    ui.alert(
      "Ошибка",
      "Не найдены необходимые столбцы: «Дата доставки», «День према», «Тип доставки», «Номер заказа».",
      ui.ButtonSet.OK,
    );
    return;
  }

  // Собираем ВСЕ строки (или строки конкретного заказа), группируем по orderId
  // Для каждой строки помечаем, пустая ли дата
  const orderGroups = {}; // orderId -> { rows: [{ dataIdx, day, isEmpty }], deliveryType, orderDate }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const orderId = String(row[orderIdIdx]).trim();

    if (filterOrderId && orderId !== filterOrderId) continue;

    const day = String(row[dayIdx] || "").trim();
    const existingDate = row[deliveryDateIdx];
    const isEmpty =
      !(existingDate instanceof Date) &&
      (!existingDate || String(existingDate).trim() === "");

    if (!orderGroups[orderId]) {
      const orderDate =
        orderDateIdx !== -1 && row[orderDateIdx] instanceof Date
          ? row[orderDateIdx]
          : new Date();

      orderGroups[orderId] = {
        rows: [],
        deliveryType: String(row[deliveryTypeIdx] || "").trim(),
        orderDate,
      };
    }

    orderGroups[orderId].rows.push({ dataIdx: i, day, isEmpty });
  }

  const allOrderIds = Object.keys(orderGroups);

  if (filterOrderId && allOrderIds.length === 0) {
    ui.alert(
      "Информация",
      `Заказ "${filterOrderId}" не найден в листе.`,
      ui.ButtonSet.OK,
    );
    return;
  }

  if (allOrderIds.length === 0) {
    ui.alert("Информация", "Нет данных для обработки.", ui.ButtonSet.OK);
    return;
  }

  // Проверяем, есть ли вообще пустые даты
  let totalEmpty = 0;
  allOrderIds.forEach((id) => {
    totalEmpty += orderGroups[id].rows.filter((r) => r.isEmpty).length;
  });

  if (totalEmpty === 0) {
    const msg = filterOrderId
      ? `Все даты доставки для заказа "${filterOrderId}" уже заполнены.`
      : "Все даты доставки уже заполнены.";
    ui.alert("Информация", msg, ui.ButtonSet.OK);
    return;
  }

  // Вычисляем даты для каждого заказа
  const updates = []; // { sheetRow, date }

  allOrderIds.forEach((orderId) => {
    const group = orderGroups[orderId];
    const { rows, deliveryType, orderDate } = group;
    const dateByDataIdx = {};

    if (deliveryType.indexOf("Ежедневная") !== -1) {
      rows.forEach((r) => {
        if (!r.day) return;
        dateByDataIdx[r.dataIdx] = calculateDeliveryDate(r.day, orderDate);
      });
    } else if (
      deliveryType.indexOf("раз в два дня") !== -1 ||
      deliveryType.indexOf("два дня") !== -1
    ) {
      // Группируем ВСЕ строки по дню для корректной разбивки на пары
      const dayRows = {};
      rows.forEach((r) => {
        if (!r.day) return;
        if (!dayRows[r.day]) dayRows[r.day] = [];
        dayRows[r.day].push(r.dataIdx);
      });

      const sortedDays = Object.keys(dayRows).sort(
        (a, b) => getDaySortIndex(a) - getDaySortIndex(b),
      );

      for (let p = 0; p < sortedDays.length; p += 2) {
        const firstDay = sortedDays[p];
        const date = calculateDeliveryDate(firstDay, orderDate);

        dayRows[firstDay].forEach((idx) => {
          if (date) dateByDataIdx[idx] = date;
        });

        if (p + 1 < sortedDays.length) {
          const secondDay = sortedDays[p + 1];
          dayRows[secondDay].forEach((idx) => {
            if (date) dateByDataIdx[idx] = date;
          });
        }
      }
    } else if (deliveryType.indexOf("Единоразовая") !== -1) {
      let minSortIdx = 99;
      let minDayAbbr = "";

      rows.forEach((r) => {
        if (!r.day) return;
        const sortIdx = getDaySortIndex(r.day);
        if (sortIdx < minSortIdx) {
          minSortIdx = sortIdx;
          minDayAbbr = r.day;
        }
      });

      if (minDayAbbr) {
        const date = calculateDeliveryDate(minDayAbbr, orderDate);
        rows.forEach((r) => {
          if (date) dateByDataIdx[r.dataIdx] = date;
        });
      }
    }
    // Неизвестный тип — пропускаем

    // Собираем обновления только для пустых ячеек
    rows.forEach((r) => {
      if (!r.isEmpty) return;
      const date = dateByDataIdx[r.dataIdx];
      if (date) updates.push({ sheetRow: r.dataIdx + 1, date });
    });
  });

  if (updates.length === 0) {
    ui.alert(
      "Информация",
      "Не удалось вычислить даты доставки (проверьте День према / Тип доставки).",
      ui.ButtonSet.OK,
    );
    return;
  }

  // Записываем даты и подсвечиваем текст
  const col = deliveryDateIdx + 1;

  updates.forEach((upd) => {
    const cell = sheet.getRange(upd.sheetRow, col);
    cell.setValue(upd.date);
    cell.setFontColor(AUTO_FILL_TEXT_COLOR);
  });

  const msg = filterOrderId
    ? `Заказ "${filterOrderId}": заполнено ${updates.length} дат доставки.`
    : `Заполнено ${updates.length} дат доставки.`;
  ui.alert("Готово", msg, ui.ButtonSet.OK);
}
