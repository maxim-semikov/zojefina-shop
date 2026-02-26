function cleanupImportedOrders() {
  const ui = SpreadsheetApp.getUi();
  const SOURCE_SPREADSHEET_ID = getSourceSpreadsheetId();
  const SOURCE_SHEET_NAME = "Orders";
  const IMPORT_STATUS_LABEL = "Статус импорта";

  const sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sourceSheet = sourceSpreadsheet.getSheetByName(SOURCE_SHEET_NAME);

  if (!sourceSheet) {
    ui.alert(
      "Ошибка",
      `Не найден лист ${SOURCE_SHEET_NAME} в источнике`,
      ui.ButtonSet.OK,
    );
    return;
  }

  const sourceLastRow = sourceSheet.getLastRow();
  if (sourceLastRow < 2) {
    ui.alert("Информация", "Нет строк для очистки.", ui.ButtonSet.OK);
    return;
  }

  const sourceLastCol = sourceSheet.getLastColumn();
  const sourceHeaders = sourceSheet
    .getRange(1, 1, 1, sourceLastCol)
    .getValues()[0];

  const importStatusColIndex = sourceHeaders.indexOf(IMPORT_STATUS_LABEL);
  if (importStatusColIndex === -1) {
    ui.alert(
      "Ошибка",
      `Столбец "${IMPORT_STATUS_LABEL}" не найден в листе ${SOURCE_SHEET_NAME}.`,
      ui.ButtonSet.OK,
    );
    return;
  }

  const allDataRows = sourceSheet
    .getRange(2, 1, sourceLastRow - 1, sourceLastCol)
    .getValues();

  // Собираем номера строк со статусом "imported" (с конца, чтобы удаление не сбивало индексы)
  const importedRowNumbers = [];
  allDataRows.forEach((row, idx) => {
    if (String(row[importStatusColIndex]).trim() === "imported") {
      importedRowNumbers.push(idx + 2); // +2: header + 0-based
    }
  });

  if (importedRowNumbers.length === 0) {
    ui.alert(
      "Информация",
      "Нет импортированных строк для удаления.",
      ui.ButtonSet.OK,
    );
    return;
  }

  const response = ui.alert(
    "Подтверждение",
    `Будет удалено ${importedRowNumbers.length} импортированных строк из листа "${SOURCE_SHEET_NAME}". Продолжить?`,
    ui.ButtonSet.YES_NO,
  );

  if (response !== ui.Button.YES) {
    return;
  }

  // Удаляем с конца, чтобы не сбивались индексы строк
  for (let i = importedRowNumbers.length - 1; i >= 0; i--) {
    sourceSheet.deleteRow(importedRowNumbers[i]);
  }

  ui.alert(
    "Готово",
    `Удалено ${importedRowNumbers.length} строк.`,
    ui.ButtonSet.OK,
  );
}
