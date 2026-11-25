/**
 * NutriDawn — Mealime-Style Aisle Grouping & Indian Quick-Commerce Deep-Link Engine
 * Generates 1-tap search URLs for Blinkit, Zepto, Swiggy Instamart, and BigBasket
 * using clean English ingredient names even when the UI is displayed in Bengali.
 * Designed & Created by: Dr. Joydip Chandra, BRSC
 */

import { QUICK_COMMERCE_PROVIDERS } from './config.js';

/**
 * Returns quick-commerce store buttons for a single ingredient.
 * @param {string} englishSearchQuery
 */
export function getIngredientStoreLinks(englishSearchQuery) {
  const query = (englishSearchQuery || '').trim();
  if (!query) return [];

  return QUICK_COMMERCE_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    accentClass: provider.accentClass,
    url: provider.buildUrl(query)
  }));
}

/**
 * Groups ingredients by pantry aisle (e.g., Pulses & Grains, Fresh Produce, Dairy).
 * @param {Array} ingredients
 * @param {Set<number>} checkedIndices - indices of items the user ALREADY has at home
 */
export function groupIngredientsByAisle(ingredients = [], checkedIndices = new Set()) {
  const groups = new Map();

  ingredients.forEach((item, index) => {
    const aisleName = item.aisle || 'Kitchen Staples';
    if (!groups.has(aisleName)) {
      groups.set(aisleName, []);
    }
    groups.get(aisleName).push({
      ...item,
      index,
      inPantry: checkedIndices.has(index),
      storeLinks: getIngredientStoreLinks(item.englishSearchQuery || item.displayName)
    });
  });

  return Array.from(groups.entries()).map(([aisle, items]) => ({
    aisle,
    items
  }));
}

/**
 * Formats unchecked (missing) ingredients into a clean checklist string for WhatsApp / Notes copy.
 */
export function formatMissingGroceryText(dishTitle, ingredients = [], checkedIndices = new Set(), lang = 'en') {
  const missing = ingredients.filter((_, idx) => !checkedIndices.has(idx));
  const header =
    lang === 'bn'
      ? `🌅 NutriDawn বাজারের তালিকা — ${dishTitle}:`
      : `🌅 NutriDawn Grocery List — ${dishTitle}:`;

  if (missing.length === 0) {
    return lang === 'bn'
      ? `${header}\n✅ সব উপকরণ ঘরেই মজুত আছে!`
      : `${header}\n✅ All ingredients are already in your pantry!`;
  }

  const lines = missing.map(
    (item) => `• ${item.displayName} (${item.quantity}) — [${item.englishSearchQuery || item.displayName}]`
  );

  return `${header}\n${lines.join('\n')}\n\n— Generated via NutriDawn`;
}