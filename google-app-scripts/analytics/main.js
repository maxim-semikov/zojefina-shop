/**
 * Точка входа проекта аналитики.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Аналитика")
    .addItem("Сформировать отчёт", "promptBuildReport")
    .addToUi();
}

/**
 * UI prompt: ввод периода (дата начала / дата конца) в формате dd.MM.yyyy.
 */
function promptBuildReport() {
  const ui = SpreadsheetApp.getUi();

  const startResponse = ui.prompt(
    "Период отчёта",
    "Введите дату начала (dd.MM.yyyy):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (startResponse.getSelectedButton() !== ui.Button.OK) return;

  const startDate = parseDate(startResponse.getResponseText());
  if (!startDate) {
    ui.alert(
      "Ошибка",
      "Невалидный формат даты начала. Используйте dd.MM.yyyy.",
      ui.ButtonSet.OK,
    );
    return;
  }

  const endResponse = ui.prompt(
    "Период отчёта",
    "Введите дату окончания (dd.MM.yyyy):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (endResponse.getSelectedButton() !== ui.Button.OK) return;

  const endDate = parseDate(endResponse.getResponseText());
  if (!endDate) {
    ui.alert(
      "Ошибка",
      "Невалидный формат даты окончания. Используйте dd.MM.yyyy.",
      ui.ButtonSet.OK,
    );
    return;
  }

  if (startDate > endDate) {
    ui.alert(
      "Ошибка",
      "Дата начала не может быть позже даты окончания.",
      ui.ButtonSet.OK,
    );
    return;
  }

  buildReport(startDate, endDate);
}
