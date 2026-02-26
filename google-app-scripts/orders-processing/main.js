function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Заказы")
    .addItem("Импорт новых заказов", "importOrders")
    .addSeparator()
    .addItem("Заполнить день доставки (все)", "fillDeliveryDatesAll")
    .addItem("Заполнить день доставки (заказ)", "fillDeliveryDatesById")
    .addSeparator()
    .addItem("Сформировать план для приготовления", "buildCookingPlanByDate")
    .addItem("Сформировать накладную", "promptBuildInvoice")
    .addToUi();
}
