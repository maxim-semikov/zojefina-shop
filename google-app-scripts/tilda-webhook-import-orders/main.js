function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents);

    validateToken(payload);

    if(checkIsTildaWebhookTestRequest(payload)) {
      return;
    }

    checkIsTildaWebhookTestRequest(payload);

    const rows = buildRowsFromOrder(payload);

    if (rows.length === 0) {
      return jsonResponse({ status: "empty" });
    }

    const color = getNextColor();
    
    processSheet(CONFIG.RAW_SHEET, rows, color);
    processSheet(CONFIG.ORDERS_SHEET, rows, color, true);

    return jsonResponse({ status: "ok" });
  } catch (error) {
    logError(error);
    return jsonResponse({ status: "error", message: error.message });
  } finally {
    lock.releaseLock();
  }
}

function processSheet(sheetName, rows, color, withFilters) {
  const sheet = getOrCreateSheet(sheetName);
  
  ensureHeader(sheet, withFilters);

  const startRow = appendRows(sheet, rows);
  colorRows(sheet, startRow, rows.length, color);
}