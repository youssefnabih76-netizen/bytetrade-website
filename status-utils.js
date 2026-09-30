/**
 * status-utils.js
 * Single source of truth for turning messy raw `status` strings from
 * products-data.js into exactly 3 canonical states. Used by:
 *  - script.js (browser, renders the badge on product cards)
 *  - scripts/generate-static-pages.js (Node, bakes the badge into static pages)
 *
 * Works in both environments without a bundler: it attaches itself to
 * `window` in the browser, and to `module.exports` in Node.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.StatusUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // Canonical states — change the Arabic labels here and every page
    // (cards, product pages, filters) updates automatically.
    var STATES = {
        IN_STOCK: { key: 'in_stock', label: 'متوفر', badgeClass: 'bg-emerald-100 text-emerald-700', schemaAvailability: 'https://schema.org/InStock' },
        ON_DEMAND: { key: 'on_demand', label: 'عند الطلب', badgeClass: 'bg-sky-100 text-sky-700', schemaAvailability: 'https://schema.org/PreOrder' },
        LEAD_TIME: { key: 'lead_time', label: 'خلال 2-4 أسابيع', badgeClass: 'bg-amber-100 text-amber-700', schemaAvailability: 'https://schema.org/LimitedAvailability' }
    };

    // Every raw variant seen in products-data.js maps to one canonical state.
    // Matching is case-insensitive and whitespace-trimmed, so "Order",
    // "ORDER", " order " all land on the same bucket.
    function normalizeStatus(rawStatus) {
        var raw = String(rawStatus || '').trim().toLowerCase();

        if (raw === 'stock' || raw === 'in stock' || raw === 'available') {
            return STATES.IN_STOCK;
        }
        if (raw === 'order' || raw === 'on order' || raw === 'pre-order' || raw === 'preorder') {
            return STATES.ON_DEMAND;
        }
        // Anything mentioning "lead time" / a week range / "2-4" falls here,
        // so future data-entry variants like "Lead Time 3-5 Weeks" still land
        // safely in the closest bucket instead of crashing the build.
        if (raw.indexOf('lead time') !== -1 || raw.indexOf('week') !== -1) {
            return STATES.LEAD_TIME;
        }

        // Unknown/blank status: default to the safest customer-facing claim.
        return STATES.ON_DEMAND;
    }

    return { STATES: STATES, normalizeStatus: normalizeStatus };
}));