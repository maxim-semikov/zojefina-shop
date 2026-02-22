function protectRawSheet() {
  const sheet = getOrCreateSheet(CONFIG.RAW_SHEET);
  const protection = sheet.protect();
  protection.setDescription('RAW storage - DO NOT EDIT');
  protection.removeEditors(protection.getEditors());
}