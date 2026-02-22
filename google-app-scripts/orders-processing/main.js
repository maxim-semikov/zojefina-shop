function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Заказы')
    .addItem('Импорт всех заказов', 'importAllOrders')
    .addItem('Сформировать план для приготовления', 'buildCookingPlanByDate')
    .addItem('Сформировать накладную', 'promptBuildInvoice')
    .addToUi();
}
