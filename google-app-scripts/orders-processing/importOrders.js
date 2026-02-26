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

  const mappedRows = sourceDataRows.map((row) =>
    columnMapping.map((srcIdx) => (srcIdx !== -1 ? row[srcIdx] : "")),
  );

  try {
    const targetLastRow = targetSheet.getLastRow();
    targetSheet
      .getRange(targetLastRow + 1, 1, mappedRows.length, targetHeaders.length)
      .setValues(mappedRows);

    ensureSingleFilter(targetSheet);
    colorOrdersByOrderIdBatch(targetSheet);

    // Помечаем успешно импортированные строки в источнике
    if (importStatusColIndex !== -1) {
      rowsWithOriginalIndex.forEach((item) => {
        sourceSheet
          .getRange(item.sourceRowNumber, importStatusColIndex + 1)
          .setValue("imported");
      });
    }

    Logger.log(
      `Импортировано ${mappedRows.length} строк. Строки помечены как imported.`,
    );
  } catch (e) {
    Logger.log(`Ошибка при вставке строк: ${e.message}`);
    throw e;
  }
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
