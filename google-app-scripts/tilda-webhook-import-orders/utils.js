function getDayIndex(day) {
  const order = { Пн: 1, Вт: 2, Ср: 3, Чт: 4, Пт: 5, Сб: 6, Вс: 7 };
  return order[day] || 99;
}

function ensureHeader(sheet, withFilter) {
  if (sheet.getLastRow() === 0) {
    const headers = COLUMN_CONFIG.map((c) => c.label);
    const headersCount = headers.length;

    sheet.getRange(1, 1, 1, headersCount).setValues([headers]);

    if (withFilter) {
      sheet.getRange(1, 1, 1, headersCount).createFilter();
      sheet.setFrozenRows(1);
    }
  }
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function appendRows(sheet, rows) {
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);

  return startRow;
}

function getNextColor() {
  const props = PropertiesService.getScriptProperties();
  let index = parseInt(props.getProperty("LAST_COLOR_INDEX") || "0", 10);
  const color = ORDER_COLORS[index];
  index = (index + 1) % ORDER_COLORS.length;
  props.setProperty("LAST_COLOR_INDEX", index);
  return color;
}

function colorRows(sheet, startRow, rowCount, color) {
  sheet
    .getRange(startRow, 1, rowCount, COLUMN_CONFIG.length)
    .setBackground(color);
}

/*********************************
 * BUILD ROWS
 *********************************/

function buildRowsFromOrder(data) {
  const orderMeta = extractOrderMeta(data);
  const products = data.payment?.products || [];

  return products
    .filter((product) => {
      const name = (product.name || "").trim();
      const qty = Number(product.quantity);

      if (!name) {
        logError(`Пропущен продукт без названия в заказе ${orderMeta.orderId}`);
        return false;
      }
      if (!qty || isNaN(qty) || qty <= 0) {
        logError(
          `Пропущен продукт "${name}" с невалидным кол-вом (${product.quantity}) в заказе ${orderMeta.orderId}`,
        );
        return false;
      }
      return true;
    })
    .map((product) => {
      const productMeta = extractProductMeta(product);
      const orderObject = createOrderObject(orderMeta, productMeta);

      return {
        sortIndex: getDayIndex(productMeta.day),
        values: buildRowFromObject(orderObject),
      };
    })
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((r) => r.values);
}

/*********************************
 * OBJECT BUILDING
 *********************************/

function createOrderObject(meta, product) {
  return {
    order_id: meta.orderId,
    order_date: meta.orderDate,
    client_name: meta.clientName,
    phone: meta.phone,
    final_amount: meta.finalAmount,

    promocode: meta.promocode,
    discount_value: meta.discountValue,
    discount_amount: meta.discountAmount,
    subtotal: meta.subtotal,
    street: meta.street,
    home: meta.home,
    flat: meta.flat,
    form_name: meta.formName,
    payment_system: meta.paymentSystem,
    payment_status_id: meta.paymentStatusId,
    delivery_type: meta.deliveryType,
    delivery_price: meta.deliveryPrice,
    email: meta.email,
    order_timestamp: meta.timestamp,

    day: product.day,
    dish: product.dish,
    qty: product.qty,
    price: product.price,
    amount: product.amount,
    calories: product.calories,

    delivery_date: "",
    import_status: "",
  };
}

function buildRowFromObject(orderObject) {
  return COLUMN_CONFIG.map((col) => orderObject[col.key] ?? "");
}

/*********************************
 * META EXTRACTION
 *********************************/

function extractOrderMeta(data) {
  return {
    orderId: data.payment?.orderid || "",
    orderDate: new Date(),
    timestamp: Date.now(),
    clientName: data.name || "",
    phone: data.phone || "",
    finalAmount: data.payment?.amount || 0,
    promocode: data.payment?.promocode || "",
    discountValue: data.payment?.discountvalue || "",
    discountAmount: data.payment?.discount || 0,
    subtotal: data.payment?.subtotal || 0,
    street: data.street || "",
    home: data.home || "",
    flat: data.flat || "",
    formName: data.formname || "",
    paymentSystem: data.payment?.sys || "",
    paymentStatusId: data.payment?.systranid || "",
    deliveryType: data.payment?.delivery || "",
    deliveryPrice: data.payment?.delivery_price || 0,
    email: data.email || "",
  };
}

function extractProductMeta(product) {
  let day = "";
  let calories = "";

  (product.options || []).forEach((opt) => {
    if (opt.option === "День приема") day = opt.variant;
    if (opt.option === "Калории") calories = opt.variant;
  });

  return {
    day,
    dish: product.name || "",
    qty: product.quantity || 0,
    price: product.price || 0,
    amount: product.amount || 0,
    calories,
  };
}

function logError(error) {
  const sheet = getOrCreateSheet(CONFIG.LOGS_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Дата", "Ошибка"]);
  }

  const errMessage = error.message || error;

  sheet.appendRow([new Date(), errMessage]);

  Logger.log(errMessage);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function checkIsTildaWebhookTestRequest(payload) {
  return payload && payload.test === "test";
}
