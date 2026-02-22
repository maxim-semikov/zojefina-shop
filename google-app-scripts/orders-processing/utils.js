function getOrCreateSheet(name) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
    }
    return sheet;
}

function getSourceSpreadsheetId () {
    const id = PropertiesService.getScriptProperties().getProperty("SOURCE_SPREADSHEET_ID") ?? '';
    return id;
}


function ensureSingleFilter(sheet) {
    const range = sheet.getDataRange();
    const existingFilter = range.getFilter();

    if (!existingFilter) {
        range.createFilter();
    }
}
