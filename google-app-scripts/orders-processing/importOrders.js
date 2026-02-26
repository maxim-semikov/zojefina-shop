function importOrders() {
  const SOURCE_SPREADSHEET_ID = getSourceSpreadsheetId();
  const SOURCE_SHEET_NAME = "Orders";
  const TARGET_SHEET_NAME = "Заказы";
  const IMPORT_STATUS_LABEL = "Статус импорта";

  const sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sourceSheet = sourceSpreadsheet.getSheetByName(SOURCE_SHEET_NAME);

  if (!sourceSheet) {
    throw new Error(`Не найден лист ${SOURCE_SHEET_NAME} в источнике`);
  }

  const sourceLastRow = sourceSheet.getLastRow();
  if (sourceLastRow < 2) {
    Logger.log("Нет новых данных в источнике");
    return;
  }

  const sourceLastCol = sourceSheet.getLastColumn();
  const sourceHeaders = sourceSheet
    .getRange(1, 1, 1, sourceLastCol)
    .getValues()[0];

  const importStatusColIndex = sourceHeaders.indexOf(IMPORT_STATUS_LABEL);

  const allSourceDataRows = sourceSheet
    .getRange(2, 1, sourceLastRow - 1, sourceLastCol)
    .getValues();

  // Фильтруем: берём только строки, где «Статус импорта» пустой или отсутствует
  const rowsWithOriginalIndex = [];
  allSourceDataRows.forEach((row, idx) => {
    const status = importStatusColIndex !== -1 ? row[importStatusColIndex] : "";
    if (!status || String(status).trim() === "") {
      rowsWithOriginalIndex.push({ row, sourceRowNumber: idx + 2 }); // +2: header + 0-based
    }
  });

  if (rowsWithOriginalIndex.length === 0) {
    Logger.log("Нет новых (не импортированных) данных в источнике");
    return;
  }

  const sourceDataRows = rowsWithOriginalIndex.map((r) => r.row);

  const targetSheet = getOrCreateSheet(TARGET_SHEET_NAME);

  let targetHeaders;
  if (targetSheet.getLastRow() === 0) {
    targetHeaders = sourceHeaders.filter((h) => h !== IMPORT_STATUS_LABEL);
    targetSheet
      .getRange(1, 1, 1, targetHeaders.length)
      .setValues([targetHeaders]);
    targetSheet.setFrozenRows(1);
  } else {
    targetHeaders = targetSheet
      .getRange(1, 1, 1, targetSheet.getLastColumn())
      .getValues()[0];
  }

  const columnMapping = targetHeaders.map((header) =>
    sourceHeaders.indexOf(header),
  );

  const allMappedRows = sourceDataRows.map((row) =>
    columnMapping.map((srcIdx) => (srcIdx !== -1 ? row[srcIdx] : "")),
  );

  // Валидация строк
  const validRows = [];
  const validOriginalIndices = [];
  const invalidDetails = [];

  allMappedRows.forEach((row, i) => {
    const result = validateRow(row, targetHeaders);
    if (result.valid) {
      validRows.push(row);
      validOriginalIndices.push(rowsWithOriginalIndex[i]);
    } else {
      invalidDetails.push(
        `Строка ${rowsWithOriginalIndex[i].sourceRowNumber}: ${result.errors.join(", ")}`,
      );
    }
  });

  if (invalidDetails.length > 0) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      "Невалидные строки",
      `Пропущено ${invalidDetails.length} невалидных строк:\n\n${invalidDetails.join("\n")}`,
      ui.ButtonSet.OK,
    );
  }

  if (validRows.length === 0) {
    Logger.log("Нет валидных строк для импорта");
    return;
  }

  // Заполняем дату доставки до записи в лист
  assignDeliveryDates(validRows, targetHeaders);

  try {
    const targetLastRow = targetSheet.getLastRow();
    targetSheet
      .getRange(targetLastRow + 1, 1, validRows.length, targetHeaders.length)
      .setValues(validRows);

    // Подсвечиваем автозаполненные даты доставки синим цветом текста
    const deliveryDateIdx = targetHeaders.indexOf("Дата доставки");
    if (deliveryDateIdx !== -1) {
      const AUTO_FILL_TEXT_COLOR = "#1565C0";
      const col = deliveryDateIdx + 1; // 1-based
      validRows.forEach((row, i) => {
        if (row[deliveryDateIdx]) {
          targetSheet
            .getRange(targetLastRow + 1 + i, col)
            .setFontColor(AUTO_FILL_TEXT_COLOR);
        }
      });
    }

    ensureSingleFilter(targetSheet);
    colorOrdersByOrderIdBatch(targetSheet);

    // Помечаем успешно импортированные строки в источнике
    if (importStatusColIndex !== -1) {
      validOriginalIndices.forEach((item) => {
        sourceSheet
          .getRange(item.sourceRowNumber, importStatusColIndex + 1)
          .setValue("imported");
      });
    }

    Logger.log(
      `Импортировано ${validRows.length} строк. Строки помечены как imported.`,
    );
  } catch (e) {
    Logger.log(`Ошибка при вставке строк: ${e.message}`);
    throw e;
  }
}

/**
 * Автозаполнение даты доставки на основе «День према» и «Тип доставки».
 * Мутирует строки в массиве rows.
 */
function assignDeliveryDates(rows, headers) {
  const deliveryDateIdx = headers.indexOf("Дата доставки");
  const dayIdx = headers.indexOf("День према");
  const deliveryTypeIdx = headers.indexOf("Тип доставки");
  const orderIdIdx = headers.indexOf("Номер заказа");
  const orderDateIdx = headers.indexOf("Дата заказа");

  if (deliveryDateIdx === -1 || dayIdx === -1 || deliveryTypeIdx === -1) {
    Logger.log("assignDeliveryDates: не найдены необходимые столбцы");
    return;
  }

  // Группируем строки по номеру заказа
  const orderGroups = {};
  rows.forEach((row, i) => {
    const orderId = orderIdIdx !== -1 ? String(row[orderIdIdx]) : "unknown";
    if (!orderGroups[orderId]) {
      orderGroups[orderId] = [];
    }
    orderGroups[orderId].push(i);
  });

  Object.keys(orderGroups).forEach((orderId) => {
    const indices = orderGroups[orderId];
    const firstRow = rows[indices[0]];
    const deliveryType = String(firstRow[deliveryTypeIdx] || "").trim();
    const orderDate =
      orderDateIdx !== -1 && firstRow[orderDateIdx] instanceof Date
        ? firstRow[orderDateIdx]
        : new Date();

    if (deliveryType.indexOf("Ежедневная") !== -1) {
      // --- Ежедневная доставка: каждое блюдо получает ближайшую дату своего дня ---
      indices.forEach((i) => {
        const day = String(rows[i][dayIdx] || "").trim();
        if (!day) return; // пустой день — не трогаем
        const date = calculateDeliveryDate(day, orderDate);
        if (date) rows[i][deliveryDateIdx] = date;
      });
    } else if (
      deliveryType.indexOf("раз в два дня") !== -1 ||
      deliveryType.indexOf("два дня") !== -1
    ) {
      // --- Раз в два дня: группируем парами смежных дней ---
      // Собираем уникальные дни с их строками
      const dayRows = {};
      indices.forEach((i) => {
        const day = String(rows[i][dayIdx] || "").trim();
        if (!day) return;
        if (!dayRows[day]) dayRows[day] = [];
        dayRows[day].push(i);
      });

      const sortedDays = Object.keys(dayRows).sort(
        (a, b) => getDaySortIndex(a) - getDaySortIndex(b),
      );

      // Разбиваем на пары
      for (let p = 0; p < sortedDays.length; p += 2) {
        const firstDay = sortedDays[p];
        const date = calculateDeliveryDate(firstDay, orderDate);

        // Первый день пары
        dayRows[firstDay].forEach((i) => {
          if (date) rows[i][deliveryDateIdx] = date;
        });

        // Второй день пары (если есть)
        if (p + 1 < sortedDays.length) {
          const secondDay = sortedDays[p + 1];
          dayRows[secondDay].forEach((i) => {
            if (date) rows[i][deliveryDateIdx] = date;
          });
        }
      }
    } else if (deliveryType.indexOf("Единоразовая") !== -1) {
      // --- Единоразовая: все блюда получают одну дату (ближайший минимальный день) ---
      let minDaySortIdx = 99;
      let minDayAbbr = "";

      indices.forEach((i) => {
        const day = String(rows[i][dayIdx] || "").trim();
        if (!day) return;
        const sortIdx = getDaySortIndex(day);
        if (sortIdx < minDaySortIdx) {
          minDaySortIdx = sortIdx;
          minDayAbbr = day;
        }
      });

      if (minDayAbbr) {
        const date = calculateDeliveryDate(minDayAbbr, orderDate);
        indices.forEach((i) => {
          if (date) rows[i][deliveryDateIdx] = date;
        });
      }
    }
    // Неизвестный тип доставки — не трогаем даты
  });
}

function colorOrdersByOrderIdBatch(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) return;

  const header = values[0];
  const ORDER_ID_COL = header.indexOf("Номер заказа");

  if (ORDER_ID_COL === -1) {
    throw new Error('Не найден столбец "Номер заказа"');
  }

  const COLORS = ["#FDEDEC", "#E8F8F5", "#EBF5FB", "#FEF9E7", "#F5EEF8"];

  const bg = [];
  let lastOrderId = null;
  let colorIndex = -1;

  // шапка — без цвета
  bg.push(new Array(header.length).fill(null));

  for (let i = 1; i < values.length; i++) {
    const orderId = values[i][ORDER_ID_COL];

    if (orderId !== lastOrderId) {
      colorIndex = (colorIndex + 1) % COLORS.length;
      lastOrderId = orderId;
    }

    bg.push(new Array(header.length).fill(COLORS[colorIndex]));
  }

  range.setBackgrounds(bg);
}
