// Конфигурация группировки корзины Zojefina
// Этот файл вставляется в настройках САЙТА Tilda:
// Настройки сайта → Еще → HTML-код для вставки перед </body>
//
// ВАЖНО: основной скрипт (prod-min-ver.js) должен быть подключен раньше этого файла

document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.t_onFuncLoad === "function") {
    window.t_onFuncLoad("tcart__reDrawProducts", () => {
      tildaCartGrouping.init({
        enabled: true,
        groupByField: "День приема",

        groupOrder: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],

        groupNames: {
          Пн: "Понедельник",
          Вт: "Вторник",
          Ср: "Среда",
          Чт: "Четверг",
          Пт: "Пятница",
          Сб: "Суббота",
          Вс: "Воскресенье",
        },

        ungroupedTitle: "Другое",
        showUngrouped: true,
        caseSensitive: false,

        calculationField: "Калории",
        calculationUnit: "кКал",
        calculationTitle: "Всего",

        headerClass: "crat__group-header",
        titleClass: "crat__group-title",
        summaryClass: "group-summary",
        summaryTextClass: "group-summary-text",
      });
    });
  }
});
