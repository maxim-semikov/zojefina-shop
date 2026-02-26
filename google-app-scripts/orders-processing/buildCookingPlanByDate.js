function buildCookingPlanByDate() {
  const ss = SpreadsheetApp.getActive();
  const sourceSheet = ss.getSheetByName('Заказы');
  const targetSheet = getOrCreateSheet('План приготовления');

  if (!sourceSheet) {
    throw new Error('Лист Заказы не найден');
  }

  const data = sourceSheet.getDataRange().getValues();
  if (data.length < 2) return;

  // --- индексы колонок ---
  const headers = data[0];
  const dateCol = headers.indexOf('Дата доставки');
  const dishCol = headers.indexOf('Блюдо');
  const qtyCol  = headers.indexOf('Кол-во');

  if (dateCol === -1 || dishCol === -1 || qtyCol === -1) {
    throw new Error('Не найдены нужные столбцы (Дата доставки / Блюдо / Кол-во)');
  }

  // --- агрегаторы ---
  const planMap = {};     // { date: { dish: qty } }
  const noDateMap = {};   // { dish: qty }

  // --- разбор строк ---
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const date = row[dateCol];
    const dish = row[dishCol];
    const qty  = Number(row[qtyCol]) || 0;

    if (!dish || qty <= 0) continue;

    // 🟡 если нет даты доставки
    if (!date || !(date instanceof Date)) {
      if (!noDateMap[dish]) noDateMap[dish] = 0;
      noDateMap[dish] += qty;
      continue;
    }

    const dateKey = Utilities.formatDate(
      date,
      ss.getSpreadsheetTimeZone(),
      'yyyy-MM-dd'
    );

    if (!planMap[dateKey]) planMap[dateKey] = {};
    if (!planMap[dateKey][dish]) planMap[dateKey][dish] = 0;

    planMap[dateKey][dish] += qty;
  }

  // --- подготовка вывода ---
  targetSheet.clear();

  const output = [];
  const backgrounds = [];

  const TITLE_COLOR = '#34495E';
  const HEADER_COLOR = '#D5DBDB';
  const DATE_COLOR = '#EBF5FB';
  const ITEM_COLOR = '#FFFFFF';
  const NO_DATE_TITLE_COLOR = '#FADBD8';
  const NO_DATE_ROW_COLOR = '#FDEDEC';

  // Заголовок страницы
  output.push(['План приготовления', '', '']);
  backgrounds.push([TITLE_COLOR, TITLE_COLOR, TITLE_COLOR]);

  // Заголовки колонок
  output.push(['Дата доставки', 'Блюдо', 'Количество']);
  backgrounds.push([HEADER_COLOR, HEADER_COLOR, HEADER_COLOR]);

  const sortedDates = Object.keys(planMap).sort();

  sortedDates.forEach(dateKey => {
    const displayDate = Utilities.formatDate(
      new Date(dateKey),
      ss.getSpreadsheetTimeZone(),
      'dd.MM.yyyy'
    );

    // заголовок даты
    output.push([displayDate, '', '']);
    backgrounds.push([DATE_COLOR, DATE_COLOR, DATE_COLOR]);

    Object.keys(planMap[dateKey]).forEach(dish => {
      output.push(['', dish, planMap[dateKey][dish]]);
      backgrounds.push([ITEM_COLOR, ITEM_COLOR, ITEM_COLOR]);
    });

    // пустая строка между датами
    output.push(['', '', '']);
    backgrounds.push([null, null, null]);
  });

  // --- блок "Без даты доставки" ---
  const noDateDishes = Object.keys(noDateMap);
  if (noDateDishes.length > 0) {
    output.push(['⚠️ БЕЗ ДАТЫ ДОСТАВКИ', '', '']);
    backgrounds.push([
      NO_DATE_TITLE_COLOR,
      NO_DATE_TITLE_COLOR,
      NO_DATE_TITLE_COLOR
    ]);

    noDateDishes.forEach(dish => {
      output.push(['', dish, noDateMap[dish]]);
      backgrounds.push([
        NO_DATE_ROW_COLOR,
        NO_DATE_ROW_COLOR,
        NO_DATE_ROW_COLOR
      ]);
    });
  }

  // --- запись в лист ---
  targetSheet
    .getRange(1, 1, output.length, 3)
    .setValues(output)
    .setBackgrounds(backgrounds);

  // Форматирование заголовка страницы
  const titleRange = targetSheet.getRange('A1:C1');
  titleRange.merge();
  titleRange.setFontSize(14);
  titleRange.setFontWeight('bold');
  titleRange.setFontColor('#FFFFFF');
  titleRange.setHorizontalAlignment('center');
  titleRange.setVerticalAlignment('middle');

  // Форматирование заголовков колонок
  targetSheet.getRange('A2:C2').setFontWeight('bold');

  targetSheet.setFrozenRows(2);
}
