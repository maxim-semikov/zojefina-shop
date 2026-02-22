function promptBuildInvoice() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Сформировать накладную',
    'Введите номер заказа (orderId):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const orderId = response.getResponseText().trim();
  if (!orderId) {
    ui.alert('Номер заказа не указан');
    return;
  }

  buildInvoiceByOrderId(orderId);
}

function buildInvoiceByOrderId(orderId) {
  const ss = SpreadsheetApp.getActive();
  const sourceSheet = ss.getSheetByName('Заказы');

  if (!sourceSheet) {
    throw new Error('Лист Заказы не найден');
  }

  const data = sourceSheet.getDataRange().getValues();
  const headers = data[0];
  const idx = name => headers.indexOf(name);

  const orderIdCol = idx('Номер заказа');
  const deliveryDateCol = idx('Дата доставки');
  const dishCol = idx('Блюдо');
  const qtyCol = idx('Кол-во');

  const nameCol = idx('Клиент');
  const phoneCol = idx('Телефон');
  const emailCol = idx('Email');
  const streetCol = idx('Улица');
  const homeCol = idx('Дом');
  const flatCol = idx('Квартира');

  const rows = data.slice(1)
    .filter(r => String(r[orderIdCol]) === String(orderId));

  if (!rows.length) {
    SpreadsheetApp.getUi().alert(`Заказ ${orderId} не найден`);
    return;
  }

  const first = rows[0];
  const client = {
    name: first[nameCol],
    phone: first[phoneCol],
    email: first[emailCol],
    address: `ул. ${first[streetCol]}, д. ${first[homeCol]}, кв. ${first[flatCol]}`
  };

  // --- группировка по датам
  const deliveries = {};

  rows.forEach(r => {
    const date = r[deliveryDateCol];
    if (!(date instanceof Date)) return;

    const key = Utilities.formatDate(
      date,
      ss.getSpreadsheetTimeZone(),
      'yyyy-MM-dd'
    );

    if (!deliveries[key]) {
      deliveries[key] = {
        date,
        dishes: {}
      };
    }

    const dish = r[dishCol];
    const qty = Number(r[qtyCol]) || 0;
    if (!dish || qty <= 0) return;

    if (!deliveries[key].dishes[dish]) {
      deliveries[key].dishes[dish] = 0;
    }

    deliveries[key].dishes[dish] += qty;
  });

  createInvoiceSheet(orderId, client, deliveries);
}

function createInvoiceSheet(orderId, client, deliveries) {
  const ss = SpreadsheetApp.getActive();
  const sheetName = `Invoice_${orderId}`;

  const oldSheet = ss.getSheetByName(sheetName);
  if (oldSheet) ss.deleteSheet(oldSheet);

  const sheet = ss.insertSheet(sheetName);

  let row = 1;

  // --- шапка документа
  sheet.getRange(row++, 1)
    .setValue(`НАКЛАДНАЯ № ${orderId}`)
    .setFontSize(14)
    .setFontWeight('bold');

  row++;

  sheet.getRange(row++, 1).setValue(`Клиент: ${client.name}`);
  sheet.getRange(row++, 1).setValue(`Телефон: ${client.phone}`);
  sheet.getRange(row++, 1).setValue(`Email: ${client.email}`);
  row++;

  sheet.getRange(row++, 1).setValue('Адрес доставки:');
  sheet.getRange(row++, 1).setValue(client.address);

  row += 2;

  const DATE_BG = '#EBF5FB';

  Object.keys(deliveries).sort().forEach(dateKey => {
    const delivery = deliveries[dateKey];
    const displayDate = Utilities.formatDate(
      delivery.date,
      ss.getSpreadsheetTimeZone(),
      'dd.MM.yyyy'
    );

    // --- заголовок даты
    sheet.getRange(row, 1, 1, 2)
      .setValues([[`Дата доставки: ${displayDate}`, '']])
      .setFontWeight('bold')
      .setBackground(DATE_BG);

    row++;

    // --- таблица блюд
    sheet.getRange(row, 1, 1, 2)
      .setValues([['Блюдо', 'Кол-во']])
      .setFontWeight('bold');
    row++;

    Object.keys(delivery.dishes).forEach(dish => {
      sheet.getRange(row++, 1, 1, 2)
        .setValues([[dish, delivery.dishes[dish]]]);
    });

    row += 2; // отступ между датами
  });

  sheet.autoResizeColumns(1, 2);
}
