/**
 * Конфигурация проекта аналитики.
 * SOURCE_RAW_SPREADSHEET_ID берётся из Script Properties
 * (Properties → Script Properties → SOURCE_RAW_SPREADSHEET_ID).
 */

const RAW_SHEET_NAME = "Orders_Raw";

/**
 * Маппинг ключей колонок — повторяет COLUMN_CONFIG из tilda-webhook-import-orders/config.js.
 * Используется label для поиска столбцов в Orders_Raw.
 */
const COLUMN_MAP = {
  order_date: "Дата заказа",
  order_id: "Номер заказа",
  client_name: "Клиент",
  phone: "Телефон",
  email: "Email",
  delivery_date: "Дата доставки",
  delivery_type: "Тип доставки",
  day: "День према",
  dish: "Блюдо",
  qty: "Кол-во",
  price: "Цена за шт",
  amount: "Сумма позиции",
  final_amount: "Итоговая сумма",
  promocode: "Промокод",
  discount_value: "Размер скидки (%)",
  discount_amount: "Сумма скидки",
  subtotal: "Сумма до скидки",
  delivery_price: "Стоимость доставки",
  street: "Улица",
  home: "Дом",
  flat: "Квартира",
  payment_system: "Система оплаты",
  payment_status_id: "ID транзакции",
  calories: "Калории",
  order_timestamp: "Timestamp (служебный)",
  import_status: "Статус импорта",
};

const REPORT_SHEET_NAME = "Отчёт";
