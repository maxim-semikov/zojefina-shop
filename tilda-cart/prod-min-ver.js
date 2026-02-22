// storageVersion for clearing old cart data when updated
!(function () {
  const e = "storageVersion",
    o = "1.0.0";
  localStorage.getItem(e) !== o &&
    (localStorage.clear(), localStorage.setItem(e, o));
})();

// Main cart grouping code
!(function (t) {
  "use strict";
  let o = null;
  function r(t) {
    if (!o) return null;
    if ("function" == typeof o.customExtractor) return o.customExtractor(t);
    if (!t.options || !Array.isArray(t.options)) return null;
    const r = o.caseSensitive ? o.groupByField : o.groupByField.toLowerCase();
    for (const n of t.options) {
      if (!n.option) continue;
      if (
        0 ===
        (o.caseSensitive ? n.option : n.option.toLowerCase()).localeCompare(
          r,
          "ru",
          { sensitivity: "base" },
        )
      )
        return n.variant;
    }
    return null;
  }
  function n(t) {
    if (!o) return { grouped: {}, ungrouped: t };
    const n = {},
      e = [];
    return (
      t.forEach((t, i) => {
        if (
          !t ||
          "object" != typeof t ||
          "yes" === t.deleted ||
          t.quantity <= 0
        )
          return;
        const u = r(t);
        u && o.groupOrder.includes(u)
          ? (n[u] || (n[u] = []), n[u].push({ ...t, originalIndex: i }))
          : o.showUngrouped && e.push({ ...t, originalIndex: i });
      }),
      { grouped: n, ungrouped: e }
    );
  }
  function e(t) {
    if (!o || !o.calculationField) return 0;
    if (!t.options || !Array.isArray(t.options)) return 0;
    const r = o.caseSensitive
      ? o.calculationField
      : o.calculationField.toLowerCase();
    for (const n of t.options) {
      if (!n.option) continue;
      if (
        0 ===
        (o.caseSensitive ? n.option : n.option.toLowerCase()).localeCompare(
          r,
          "ru",
          { sensitivity: "base" },
        )
      ) {
        const t = parseFloat(n.variant);
        return isNaN(t) ? 0 : t;
      }
    }
    return 0;
  }
  function i(t) {
    return o && o.calculationField
      ? t.reduce((t, o) => t + e(o) * (o.quantity || 1), 0)
      : 0;
  }
  function u(t) {
    if (!o) return "";
    const r = o.groupNames[t] || t;
    return `\n      <div class="${o.headerClass}">\n        <h3 class="${o.titleClass}">${r}</h3>\n      </div>\n    `;
  }
  function c(t, r = null) {
    if (!o || !o.calculationField || !t.length) return "";
    const n = i(t);
    if (n <= 0) return "";
    const e = o.calculationUnit ? `${n} ${o.calculationUnit}` : n.toString(),
      u = o.calculationTitle || o.calculationField,
      c = r ? `data-group="${r}"` : 'data-group="ungrouped"';
    return `\n      <div class="${o.summaryClass || "t706__group-summary"}" ${c}>\n        <div class="${o.summaryTextClass || "t706__group-summary-text"}">\n          ${u}: ${e}\n        </div>\n      </div>\n    `;
  }
  function a() {
    if (!o || !o.calculationField) return;
    const t = new MutationObserver((t) => {
        let o = !1;
        (t.forEach((t) => {
          if ("childList" === t.type) {
            const r = Array.from(t.addedNodes),
              n = Array.from(t.removedNodes);
            (r.some(
              (t) => t.classList && t.classList.contains("t706__product"),
            ) ||
              n.some(
                (t) => t.classList && t.classList.contains("t706__product"),
              )) &&
              (o = !0);
          } else
            "attributes" === t.type &&
              "value" === t.attributeName &&
              "quantity" === t.target.name &&
              (o = !0);
        }),
          o && setTimeout(s, 50));
      }),
      r =
        document.querySelector(".t706__cartwin-products") ||
        document.querySelector(".t706__sidebar-products") ||
        document.querySelector(".t706__cartpage-products");
    if (
      (r &&
        (t.observe(r, {
          childList: !0,
          subtree: !0,
          attributes: !0,
          attributeFilter: ["value"],
        }),
        console.log("DOM observer for quantity changes set up")),
      window.tcart && window.tcart.products)
    ) {
      const t = window.tcart.products;
      let o = JSON.stringify(t);
      setInterval(() => {
        if (window.tcart && window.tcart.products) {
          const t = JSON.stringify(window.tcart.products);
          t !== o && ((o = t), s());
        }
      }, 500);
    }
  }
  function s() {
    if (!o || !o.calculationField) return;
    if (!window.tcart || !window.tcart.products) return;
    const t = window.tcart.products;
    if (
      0 ===
      t.filter(
        (t) =>
          t && "object" == typeof t && "yes" !== t.deleted && t.quantity > 0,
      ).length
    )
      return;
    const { grouped: r, ungrouped: e } = n(t);
    if (
      (o.groupOrder.forEach((t) => {
        if (r[t] && r[t].length > 0) {
          const n = document.querySelector(
            `.${o.summaryClass || "t706__group-summary"}[data-group="${t}"]`,
          );
          if (n) {
            const e = i(r[t]),
              u = o.calculationUnit
                ? `${e} ${o.calculationUnit}`
                : e.toString(),
              c = o.calculationTitle || o.calculationField,
              a = n.querySelector(
                `.${o.summaryTextClass || "t706__group-summary-text"}`,
              );
            a && (a.textContent = `${c}: ${u}`);
          }
        }
      }),
      e.length > 0 && o.showUngrouped)
    ) {
      const t = document.querySelector(
        `.${o.summaryClass || "t706__group-summary"}[data-group="ungrouped"]`,
      );
      if (t) {
        const r = i(e),
          n = o.calculationUnit ? `${r} ${o.calculationUnit}` : r.toString(),
          u = o.calculationTitle || o.calculationField,
          c = t.querySelector(
            `.${o.summaryTextClass || "t706__group-summary-text"}`,
          );
        c && (c.textContent = `${u}: ${n}`);
      }
    }
  }
  function d() {
    if (!o || !o.enabled)
      return void (
        window.tcart__reDrawProducts_original &&
        window.tcart__reDrawProducts_original()
      );
    (console.log("Starting product grouping..."),
      console.log("Current configuration:", o));
    let t = document.querySelector(".t706__cartwin-products");
    if (
      (window.tcart_fullscreen &&
        ((t = document.querySelector(".t706__sidebar-products")),
        document.body.classList.contains("t706__body_cartpageshowed") &&
          (t = document.querySelector(".t706__cartpage-products"))),
      !t || !window.tcart || !window.tcart.products)
    )
      return void console.log("Products container or cart data not found");
    const r = window.tcart.products;
    console.log("Products for grouping:", r.length);
    if (
      0 ===
      r.filter(
        (t) =>
          t && "object" == typeof t && "yes" !== t.deleted && t.quantity > 0,
      ).length
    ) {
      const o = window.tcart_dict
        ? window.tcart_dict("empty")
        : "Cart is empty. Add at least one product to cart";
      return (
        (t.innerHTML = `<div class="t-name tn-name_xs t706__cartpage-products_empty">${o}</div>`),
        void l()
      );
    }
    const { grouped: e, ungrouped: i } = n(r);
    console.log("Grouping:", { grouped: e, ungrouped: i.length });
    const a = document.createElement("div");
    ((a.className = t.className),
      (a.style.display = "none"),
      document.body.appendChild(a));
    const s = t,
      d = document.querySelector;
    ((document.querySelector = function (t) {
      return ".t706__cartwin-products" === t ||
        ".t706__sidebar-products" === t ||
        ".t706__cartpage-products" === t
        ? a
        : d.call(document, t);
    }),
      window.tcart__reDrawProducts_original &&
        window.tcart__reDrawProducts_original(),
      (document.querySelector = d));
    const _ = Array.from(a.querySelectorAll(".t706__product"));
    document.body.removeChild(a);
    let p = "";
    (o.groupOrder.forEach((t) => {
      e[t] &&
        e[t].length > 0 &&
        ((p += u(t)),
        e[t].forEach((t) => {
          const o = _[t.originalIndex];
          o && (p += o.outerHTML);
        }),
        (p += c(e[t], t)));
    }),
      i.length > 0 &&
        o.showUngrouped &&
        (p && (p += u(o.ungroupedTitle)),
        i.forEach((t) => {
          const o = _[t.originalIndex];
          o && (p += o.outerHTML);
        }),
        (p += c(i, "ungrouped"))),
      (s.innerHTML = p),
      window.tcart__addEvents__forProducts &&
        window.tcart__addEvents__forProducts(),
      window.tcart__unblockSubmitButton && window.tcart__unblockSubmitButton(),
      l(),
      console.log("Product grouping completed"));
  }
  function l() {
    const t =
        document.querySelector(".t706__cartwin-top") ||
        document.querySelector(".t706__sidebar-top"),
      o = document.querySelector(".t706__cartwin-bottom");
    (t && (t.style.borderBottomWidth = ""), o && (o.style.borderTopWidth = ""));
  }
  function _() {
    const t = ["tcart__reDrawProducts"];
    function o() {
      return t.every((t) => "function" == typeof window[t]);
    }
    return o()
      ? Promise.resolve()
      : new Promise((t) => {
          if ("function" == typeof window.t_onFuncLoad)
            (console.log(
              "Using t_onFuncLoad to wait for tcart__reDrawProducts",
            ),
              window.t_onFuncLoad("tcart__reDrawProducts", t));
          else {
            console.log("Waiting for Tilda functions to load...");
            const r = setInterval(() => {
              o() && (clearInterval(r), t());
            }, 100);
            setTimeout(() => {
              (clearInterval(r),
                console.warn(
                  "Tilda functions not found after 15 seconds of waiting",
                ),
                t());
            }, 15e3);
          }
        });
  }
  ((t.tildaCartGrouping = {
    init: function (t = {}) {
      if (t && 0 !== Object.keys(t).length) {
        if (
          (console.log("Initializing cart grouping..."),
          (o = {
            enabled: !0,
            groupByField: "day",
            groupOrder: [],
            groupNames: {},
            ungroupedTitle: "Other",
            headerClass: "t706__group-header",
            titleClass: "t706__group-title",
            summaryClass: "t706__group-summary",
            summaryTextClass: "t706__group-summary-text",
            showUngrouped: !0,
            caseSensitive: !1,
            calculationField: null,
            calculationUnit: null,
            calculationTitle: null,
            customExtractor: null,
            ...t,
          }),
          !(
            o.customExtractor ||
            (o.groupByField && o.groupOrder && 0 !== o.groupOrder.length)
          ))
        )
          return (
            console.error(
              "Cart grouping: required parameters groupByField and groupOrder (or customExtractor) not specified",
            ),
            void (o = null)
          );
        (window.tcart__reDrawProducts &&
          !window.tcart__reDrawProducts_original &&
          ((window.tcart__reDrawProducts_original =
            window.tcart__reDrawProducts),
          console.log("Original tcart__reDrawProducts function saved")),
          (window.tcart__reDrawProducts = d),
          console.log("tcart__reDrawProducts function replaced with grouping"),
          "function" != typeof window.tcart__product__plus ||
            window.tcart__product__plus_original ||
            ((window.tcart__product__plus_original =
              window.tcart__product__plus),
            (window.tcart__product__plus = function (t) {
              const o = window.tcart__product__plus_original(t);
              return (setTimeout(s, 100), o);
            })),
          "function" != typeof window.tcart__product__minus ||
            window.tcart__product__minus_original ||
            ((window.tcart__product__minus_original =
              window.tcart__product__minus),
            (window.tcart__product__minus = function (t) {
              const o = window.tcart__product__minus_original(t);
              return (setTimeout(s, 100), o);
            })),
          "function" != typeof window.tcart__product__updateQuantity ||
            window.tcart__product__updateQuantity_original ||
            ((window.tcart__product__updateQuantity_original =
              window.tcart__product__updateQuantity),
            (window.tcart__product__updateQuantity = function (t, o, r, n) {
              const e = window.tcart__product__updateQuantity_original(
                t,
                o,
                r,
                n,
              );
              return (setTimeout(s, 100), e);
            })),
          console.log(
            "Cart grouping successfully initialized with configuration:",
            o,
          ),
          a());
      } else
        console.warn(
          "Cart grouping: configuration not provided, grouping disabled",
        );
    },
    groupProducts: n,
    extractGroupValue: r,
    extractCalculationValue: e,
    calculateGroupTotal: i,
    createGroupTotal: c,
    updateGroupTotals: s,
    setupQuantityObserver: a,
    reDrawProductsGrouped: d,
  }),
    "loading" === document.readyState
      ? document.addEventListener("DOMContentLoaded", () => {
          _();
        })
      : _());
})(window);
