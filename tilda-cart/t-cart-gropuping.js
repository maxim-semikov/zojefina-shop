/**
 * Script for grouping products in Tilda cart
 * Configurable version with support for various grouping fields
 */

(function (global) {
    "use strict";

    // Configuration (set during initialization)
    let config = null;

    /**
     * Extracts grouping value from product
     */
    function extractGroupValue(product) {
        if (!config) return null;

        // If custom extraction function is provided
        if (typeof config.customExtractor === "function") {
            return config.customExtractor(product);
        }

        if (!product.options || !Array.isArray(product.options)) {
            return null;
        }

        const searchField = config.caseSensitive
            ? config.groupByField
            : config.groupByField.toLowerCase();

        for (const option of product.options) {
            if (!option.option) continue;

            const optionName = config.caseSensitive
                ? option.option
                : option.option.toLowerCase();

            if (
                optionName.localeCompare(searchField, "ru", { sensitivity: "base" }) ===
                0
            ) {
                return option.variant;
            }
        }
        return null;
    }

    /**
     * Groups products by specified field
     */
    function groupProducts(products) {
        if (!config) return { grouped: {}, ungrouped: products };

        const grouped = {};
        const ungrouped = [];

        products.forEach((product, index) => {
            if (
                !product ||
                typeof product !== "object" ||
                product.deleted === "yes" ||
                product.quantity <= 0
            ) {
                return;
            }

            const groupValue = extractGroupValue(product);

            if (groupValue && config.groupOrder.includes(groupValue)) {
                if (!grouped[groupValue]) {
                    grouped[groupValue] = [];
                }
                grouped[groupValue].push({ ...product, originalIndex: index });
            } else if (config.showUngrouped) {
                ungrouped.push({ ...product, originalIndex: index });
            }
        });

        return { grouped, ungrouped };
    }

    /**
     * Extracts option value for calculation from product
     */
    function extractCalculationValue(product) {
        if (!config || !config.calculationField) return 0;

        if (!product.options || !Array.isArray(product.options)) {
            return 0;
        }

        const searchField = config.caseSensitive
            ? config.calculationField
            : config.calculationField.toLowerCase();

        for (const option of product.options) {
            if (!option.option) continue;

            const optionName = config.caseSensitive
                ? option.option
                : option.option.toLowerCase();

            if (
                optionName.localeCompare(searchField, "ru", { sensitivity: "base" }) ===
                0
            ) {
                // Пытаемся преобразовать значение в число
                const numValue = parseFloat(option.variant);
                return isNaN(numValue) ? 0 : numValue;
            }
        }
        return 0;
    }

    /**
     * Calculates total value for a group of products
     */
    function calculateGroupTotal(products) {
        if (!config || !config.calculationField) return 0;

        return products.reduce((total, product) => {
            const optionValue = extractCalculationValue(product);
            const quantity = product.quantity || 1;
            return total + optionValue * quantity;
        }, 0);
    }

    /**
     * Creates HTML for group header
     */
    function createGroupHeader(groupValue) {
        if (!config) return "";

        const groupName = config.groupNames[groupValue] || groupValue;
        return `
      <div class="${config.headerClass}">
        <h3 class="${config.titleClass}">${groupName}</h3>
      </div>
    `;
    }

    /**
     * Creates HTML for group total summary
     */
    function createGroupTotal(products, groupValue = null) {
        if (!config || !config.calculationField || !products.length) return "";

        const total = calculateGroupTotal(products);
        if (total <= 0) return "";

        const totalText = config.calculationUnit
            ? `${total} ${config.calculationUnit}`
            : total.toString();

        const summaryTitle = config.calculationTitle || config.calculationField;

        const dataGroup = groupValue
            ? `data-group="${groupValue}"`
            : 'data-group="ungrouped"';

        return `
      <div class="${config.summaryClass || "t706__group-summary"}" ${dataGroup}>
        <div class="${config.summaryTextClass || "t706__group-summary-text"}">
          ${summaryTitle}: ${totalText}
        </div>
      </div>
    `;
    }

    /**
     * Sets up DOM observer to watch for quantity changes
     */
    function setupQuantityObserver() {
        if (!config || !config.calculationField) return;

        // Watch for changes in quantity inputs
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;

            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    // Check if cart products were added/removed
                    const addedNodes = Array.from(mutation.addedNodes);
                    const removedNodes = Array.from(mutation.removedNodes);

                    if (
                        addedNodes.some(
                            (node) =>
                                node.classList && node.classList.contains("t706__product")
                        ) ||
                        removedNodes.some(
                            (node) =>
                                node.classList && node.classList.contains("t706__product")
                        )
                    ) {
                        shouldUpdate = true;
                    }
                } else if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "value"
                ) {
                    // Check if quantity input value changed
                    if (mutation.target.name === "quantity") {
                        shouldUpdate = true;
                    }
                }
            });

            if (shouldUpdate) {
                setTimeout(updateGroupTotals, 50);
            }
        });

        // Start observing
        const cartContainer =
            document.querySelector(".t706__cartwin-products") ||
            document.querySelector(".t706__sidebar-products") ||
            document.querySelector(".t706__cartpage-products");

        if (cartContainer) {
            observer.observe(cartContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["value"],
            });
            console.log("DOM observer for quantity changes set up");
        }

        // Also watch for direct changes to tcart object
        if (window.tcart && window.tcart.products) {
            const originalProducts = window.tcart.products;
            let lastProductsString = JSON.stringify(originalProducts);

            setInterval(() => {
                if (window.tcart && window.tcart.products) {
                    const currentProductsString = JSON.stringify(window.tcart.products);
                    if (currentProductsString !== lastProductsString) {
                        lastProductsString = currentProductsString;
                        updateGroupTotals();
                    }
                }
            }, 500);
        }
    }

    /**
     * Updates group totals without full redraw
     */
    function updateGroupTotals() {
        if (!config || !config.calculationField) return;

        // Get current products from cart
        if (!window.tcart || !window.tcart.products) return;

        const products = window.tcart.products;
        const activeProducts = products.filter(
            (product) =>
                product &&
                typeof product === "object" &&
                product.deleted !== "yes" &&
                product.quantity > 0
        );

        if (activeProducts.length === 0) return;

        const { grouped, ungrouped } = groupProducts(products);

        // Update grouped totals
        config.groupOrder.forEach((groupValue) => {
            if (grouped[groupValue] && grouped[groupValue].length > 0) {
                const summaryElement = document.querySelector(
                    `.${
                        config.summaryClass || "t706__group-summary"
                    }[data-group="${groupValue}"]`
                );
                if (summaryElement) {
                    const total = calculateGroupTotal(grouped[groupValue]);
                    const totalText = config.calculationUnit
                        ? `${total} ${config.calculationUnit}`
                        : total.toString();
                    const summaryTitle =
                        config.calculationTitle || config.calculationField;

                    const textElement = summaryElement.querySelector(
                        `.${config.summaryTextClass || "t706__group-summary-text"}`
                    );
                    if (textElement) {
                        textElement.textContent = `${summaryTitle}: ${totalText}`;
                    }
                }
            }
        });

        // Update ungrouped totals
        if (ungrouped.length > 0 && config.showUngrouped) {
            const summaryElement = document.querySelector(
                `.${
                    config.summaryClass || "t706__group-summary"
                }[data-group="ungrouped"]`
            );
            if (summaryElement) {
                const total = calculateGroupTotal(ungrouped);
                const totalText = config.calculationUnit
                    ? `${total} ${config.calculationUnit}`
                    : total.toString();
                const summaryTitle = config.calculationTitle || config.calculationField;

                const textElement = summaryElement.querySelector(
                    `.${config.summaryTextClass || "t706__group-summary-text"}`
                );
                if (textElement) {
                    textElement.textContent = `${summaryTitle}: ${totalText}`;
                }
            }
        }
    }

    /**
     * Main function for redrawing products with grouping
     */
    function reDrawProductsGrouped() {
        // If configuration is not set or grouping is disabled, use original function
        if (!config || !config.enabled) {
            if (window.tcart__reDrawProducts_original) {
                window.tcart__reDrawProducts_original();
            }
            return;
        }

        console.log("Starting product grouping...");
        console.log("Current configuration:", config);

        // Determine products container
        let productsContainer = document.querySelector(".t706__cartwin-products");

        if (window.tcart_fullscreen) {
            productsContainer = document.querySelector(".t706__sidebar-products");
            if (document.body.classList.contains("t706__body_cartpageshowed")) {
                productsContainer = document.querySelector(".t706__cartpage-products");
            }
        }

        if (!productsContainer || !window.tcart || !window.tcart.products) {
            console.log("Products container or cart data not found");
            return;
        }

        const products = window.tcart.products;
        console.log("Products for grouping:", products.length);

        // Filter active products
        const activeProducts = products.filter(
            (product) =>
                product &&
                typeof product === "object" &&
                product.deleted !== "yes" &&
                product.quantity > 0
        );

        if (activeProducts.length === 0) {
            // If no products, show standard message
            const emptyMessage = window.tcart_dict
                ? window.tcart_dict("empty")
                : "Cart is empty. Add at least one product to cart";
            productsContainer.innerHTML = `<div class="t-name tn-name_xs t706__cartpage-products_empty">${emptyMessage}</div>`;
            updateCartBorders();
            return;
        }

        const { grouped, ungrouped } = groupProducts(products);
        console.log("Grouping:", { grouped, ungrouped: ungrouped.length });

        // Create temporary container for HTML generation via original function
        const tempContainer = document.createElement("div");
        tempContainer.className = productsContainer.className;
        tempContainer.style.display = "none";
        document.body.appendChild(tempContainer);

        // Temporarily replace container and call original function
        const originalContainer = productsContainer;

        // Replace querySelector so original function uses our temporary container
        const originalQuerySelector = document.querySelector;
        document.querySelector = function (selector) {
            if (
                selector === ".t706__cartwin-products" ||
                selector === ".t706__sidebar-products" ||
                selector === ".t706__cartpage-products"
            ) {
                return tempContainer;
            }
            return originalQuerySelector.call(document, selector);
        };

        // Call original function to generate HTML
        if (window.tcart__reDrawProducts_original) {
            window.tcart__reDrawProducts_original();
        }

        // Restore querySelector
        document.querySelector = originalQuerySelector;

        // Get generated HTML and parse products
        const generatedProducts = Array.from(
            tempContainer.querySelectorAll(".t706__product")
        );

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Now group HTML products
        let finalHTML = "";

        // Render products by groups in specified order
        config.groupOrder.forEach((groupValue) => {
            if (grouped[groupValue] && grouped[groupValue].length > 0) {
                finalHTML += createGroupHeader(groupValue);
                grouped[groupValue].forEach((product) => {
                    const productElement = generatedProducts[product.originalIndex];
                    if (productElement) {
                        finalHTML += productElement.outerHTML;
                    }
                });
                finalHTML += createGroupTotal(grouped[groupValue], groupValue);
            }
        });

        // Add ungrouped products at the end
        if (ungrouped.length > 0 && config.showUngrouped) {
            if (finalHTML) {
                finalHTML += createGroupHeader(config.ungroupedTitle);
            }
            ungrouped.forEach((product) => {
                const productElement = generatedProducts[product.originalIndex];
                if (productElement) {
                    finalHTML += productElement.outerHTML;
                }
            });
            finalHTML += createGroupTotal(ungrouped, "ungrouped");
        }

        // Set final HTML
        originalContainer.innerHTML = finalHTML;

        // Restore event handlers
        if (window.tcart__addEvents__forProducts) {
            window.tcart__addEvents__forProducts();
        }

        // Unblock submit button
        if (window.tcart__unblockSubmitButton) {
            window.tcart__unblockSubmitButton();
        }

        // Update borders
        updateCartBorders();

        console.log("Product grouping completed");
    }

    /**
     * Updates cart borders
     */
    function updateCartBorders() {
        const topElement =
            document.querySelector(".t706__cartwin-top") ||
            document.querySelector(".t706__sidebar-top");
        const bottomElement = document.querySelector(".t706__cartwin-bottom");

        if (topElement) {
            topElement.style.borderBottomWidth = "";
        }
        if (bottomElement) {
            bottomElement.style.borderTopWidth = "";
        }
    }

    /**
     * Initialization with configuration
     */
    function init(userConfig = {}) {
        if (!userConfig || Object.keys(userConfig).length === 0) {
            console.warn(
                "Cart grouping: configuration not provided, grouping disabled"
            );
            return;
        }

        console.log("Initializing cart grouping...");

        // Set configuration with default values
        config = {
            enabled: true,
            groupByField: "day",
            groupOrder: [],
            groupNames: {},
            ungroupedTitle: "Other",
            headerClass: "t706__group-header",
            titleClass: "t706__group-title",
            summaryClass: "t706__group-summary",
            summaryTextClass: "t706__group-summary-text",
            showUngrouped: true,
            caseSensitive: false,
            calculationField: null,
            calculationUnit: null,
            calculationTitle: null,
            customExtractor: null,
            ...userConfig,
        };

        // Validate required parameters
        if (
            !config.customExtractor &&
            (!config.groupByField ||
                !config.groupOrder ||
                config.groupOrder.length === 0)
        ) {
            console.error(
                "Cart grouping: required parameters groupByField and groupOrder (or customExtractor) not specified"
            );
            config = null;
            return;
        }

        // Save original function (only once)
        if (
            window.tcart__reDrawProducts &&
            !window.tcart__reDrawProducts_original
        ) {
            window.tcart__reDrawProducts_original = window.tcart__reDrawProducts;
            console.log("Original tcart__reDrawProducts function saved");
        }

        // Replace redraw function with ours
        window.tcart__reDrawProducts = reDrawProductsGrouped;
        console.log("tcart__reDrawProducts function replaced with grouping");

        // Hook into quantity change functions to update totals
        if (
            typeof window.tcart__product__plus === "function" &&
            !window.tcart__product__plus_original
        ) {
            window.tcart__product__plus_original = window.tcart__product__plus;
            window.tcart__product__plus = function (element) {
                const result = window.tcart__product__plus_original(element);
                // Update totals after quantity change
                setTimeout(updateGroupTotals, 100);
                return result;
            };
        }

        if (
            typeof window.tcart__product__minus === "function" &&
            !window.tcart__product__minus_original
        ) {
            window.tcart__product__minus_original = window.tcart__product__minus;
            window.tcart__product__minus = function (element) {
                const result = window.tcart__product__minus_original(element);
                // Update totals after quantity change
                setTimeout(updateGroupTotals, 100);
                return result;
            };
        }

        if (
            typeof window.tcart__product__updateQuantity === "function" &&
            !window.tcart__product__updateQuantity_original
        ) {
            window.tcart__product__updateQuantity_original =
                window.tcart__product__updateQuantity;
            window.tcart__product__updateQuantity = function (
                element1,
                element2,
                index,
                quantity
            ) {
                const result = window.tcart__product__updateQuantity_original(
                    element1,
                    element2,
                    index,
                    quantity
                );
                // Update totals after quantity change
                setTimeout(updateGroupTotals, 100);
                return result;
            };
        }

        console.log(
            "Cart grouping successfully initialized with configuration:",
            config
        );

        // Set up DOM observer to watch for quantity changes
        setupQuantityObserver();
    }

    /**
     * Waits for Tilda functions to load
     */
    function waitForTildaFunctions() {
        const requiredFunctions = ["tcart__reDrawProducts"];

        function checkFunctions() {
            return requiredFunctions.every(
                (funcName) => typeof window[funcName] === "function"
            );
        }

        if (checkFunctions()) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            // Use t_onFuncLoad if available
            if (typeof window.t_onFuncLoad === "function") {
                console.log("Using t_onFuncLoad to wait for tcart__reDrawProducts");
                window.t_onFuncLoad("tcart__reDrawProducts", resolve);
            } else {
                // Fallback - wait for functions manually
                console.log("Waiting for Tilda functions to load...");
                const checkInterval = setInterval(() => {
                    if (checkFunctions()) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);

                // Timeout in case functions don't appear
                setTimeout(() => {
                    clearInterval(checkInterval);
                    console.warn("Tilda functions not found after 15 seconds of waiting");
                    resolve();
                }, 15000);
            }
        });
    }

    // Export API
    global.tildaCartGrouping = {
        init,
        groupProducts,
        extractGroupValue,
        extractCalculationValue,
        calculateGroupTotal,
        createGroupTotal,
        updateGroupTotals,
        setupQuantityObserver,
        reDrawProductsGrouped,
    };

    // Prepare Tilda functions for initialization
    function prepareInit() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                waitForTildaFunctions();
            });
        } else {
            waitForTildaFunctions();
        }
    }

    // Start preparation
    prepareInit();
})(window);

// ========================================
// GROUPING CONFIGURATION
// ========================================
// REQUIRED: Change the parameters below to fit your needs
// Without configuration, grouping will not work!

// Initialize grouping with your configuration
document.addEventListener("DOMContentLoaded", () => {
    // Wait for Tilda functions to load and initialize grouping
    if (typeof window.t_onFuncLoad === "function") {
        window.t_onFuncLoad("tcart__reDrawProducts", () => {
            tildaCartGrouping.init({
                // ===== MAIN SETTINGS =====
                enabled: true, // enable/disable grouping
                groupByField: "День приема", // field for grouping (searched in product options)

                // ===== GROUP ORDER =====
                groupOrder: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],

                // ===== GROUP NAMES =====
                groupNames: {
                    Пн: "Понедельник",
                    Вт: "Вторник",
                    Ср: "Среда",
                    Чт: "Четверг",
                    Пт: "Пятница",
                    Сб: "Суббота",
                    Вс: "Воскресенье",
                },

                // ===== ADDITIONAL SETTINGS =====
                ungroupedTitle: "Other", // title for products without group
                showUngrouped: true, // whether to show products without group
                caseSensitive: false, // whether to consider case when searching field

                // ===== CSS CLASSES =====
                headerClass: "crat__group-header", // CSS class for group headers
                titleClass: "crat__group-title", // CSS class for group titles
                summaryClass: "group-summary", // CSS class for group summary container
                summaryTextClass: "group-summary-text", // CSS class for summary text

                // ===== CALCULATION SETTINGS =====
                calculationField: "Калории", // field name for calculation (e.g., "weight", "calories")
                calculationUnit: "кКал", // unit for display (e.g., "кг", "ккал", "шт")
                calculationTitle: "Всего", // title for calculation display

                // ===== CUSTOM FUNCTION (optional) =====
                customExtractor: null, // custom function for extracting grouping value
            });
        });
    }
});
