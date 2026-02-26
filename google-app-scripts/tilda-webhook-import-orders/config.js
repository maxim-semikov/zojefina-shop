const CONFIG = {
  ORDERS_SHEET: "Orders",
  LOGS_SHEET: "Logs",
  RAW_SHEET: "Orders_Raw",
};

const COLUMN_CONFIG = [
  { key: "order_date", label: "Дата заказа" },
  { key: "order_id", label: "Номер заказа" },
  { key: "client_name", label: "Клиент" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "Email" },

  // дата не приходит с tilda. Нужно в будущем при обработке заказа.
  { key: "delivery_date", label: "Дата доставки" },

  { key: "delivery_type", label: "Тип доставки" },
  { key: "day", label: "День према" },
  { key: "dish", label: "Блюдо" },
  { key: "qty", label: "Кол-во" },

  { key: "price", label: "Цена (общая)" },
  { key: "final_amount", label: "Итоговая сумма" },
  { key: "promocode", label: "Промокод" },
  { key: "discount_value", label: "Размер скидки (%)" },
  { key: "discount_amount", label: "Сумма скидки" },
  { key: "subtotal", label: "Сумма до скидки" },
  { key: "delivery_price", label: "Стоимость доставки" },

  { key: "street", label: "Улица" },
  { key: "home", label: "Дом" },
  { key: "flat", label: "Квартира" },

  { key: "payment_system", label: "Система оплаты" },
  { key: "payment_status_id", label: "ID транзакции" },
  // { key: "form_name", label: "Форма" },

  { key: "calories", label: "Калории" },
  { key: "order_timestamp", label: "Timestamp (служебный)" },
  { key: "import_status", label: "Статус импорта" },
];

const ORDER_COLORS = ["#FDEDEC", "#E8F8F5", "#EBF5FB", "#FEF9E7", "#F5EEF8"];
