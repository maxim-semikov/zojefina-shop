function importAllOrders() {
    const SOURCE_SPREADSHEET_ID = getSourceSpreadsheetId();
    const SOURCE_SHEET_NAME = 'Orders';
    const TARGET_SHEET_NAME = 'Заказы';

    const sourceSheet = SpreadsheetApp
        .openById(SOURCE_SPREADSHEET_ID)
        .getSheetByName(SOURCE_SHEET_NAME);

    if (!sourceSheet) {
        throw new Error(`Не найден лист ${SOURCE_SHEET_NAME} в источнике`);
    }

    const targetSheet = getOrCreateSheet(TARGET_SHEET_NAME);

    const data = sourceSheet.getDataRange().getValues();
    if (data.length === 0) {
        Logger.log('Источник пуст');
        return;
    }

    targetSheet.clearContents();
    
    targetSheet
        .getRange(1, 1, data.length, data[0].length)
        .setValues(data);

    targetSheet.setFrozenRows(1);

    ensureSingleFilter(targetSheet);

    colorOrdersByOrderIdBatch(targetSheet);
}

function colorOrdersByOrderIdBatch(sheet) {
    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length < 2) return;

    const header = values[0];
    const ORDER_ID_COL = header.indexOf('Номер заказа');

    if (ORDER_ID_COL === -1) {
        throw new Error('Не найден столбец "Номер заказа"');
    }

    const COLORS = [
        '#FDEDEC',
        '#E8F8F5',
        '#EBF5FB',
        '#FEF9E7',
        '#F5EEF8'
    ];

    const bg = [];
    let lastOrderId = null;
    let colorIndex = -1;

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

