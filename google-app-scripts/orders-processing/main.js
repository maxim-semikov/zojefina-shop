function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Заказы")
    .addItem("Импорт новых заказов", "importOrders")
    .addSeparator()
    .addItem("Сформировать план для приготовления", "buildCookingPlanByDate")
    .addItem("Сформировать накладную", "promptBuildInvoice")
    .addToUi();
}
