import type { MenuItem, CartItem } from '@/types';

/**
 * Calculates the maximum available stock for a MenuItem or CartItem,
 * taking into account variant/customization option stocks and base item stock.
 *
 * @param item - The MenuItem or CartItem
 * @param selectedOptions - Record of customization group ID to selected option ID(s)
 * @returns number of units available, or null if unlimited/untracked.
 */
export function getMaxAvailableStock(
  item: MenuItem | CartItem,
  selectedOptions?: Record<string, string | string[]>
): number | null {
  // 1. If options are selected, check the stock of the selected variant options
  if (selectedOptions && Object.keys(selectedOptions).length > 0 && item.customizations) {
    let minOptionStock: number | null = null;

    Object.entries(selectedOptions).forEach(([customizationId, selected]) => {
      const customization = item.customizations?.find((c) => c.id === customizationId);
      if (!customization) return;

      const optionIds = Array.isArray(selected) ? selected : [selected];
      optionIds.forEach((optId) => {
        const option = customization.options?.find((o) => o.id === optId);
        if (option && typeof option.stock === 'number' && !isNaN(option.stock)) {
          if (minOptionStock === null || option.stock < minOptionStock) {
            minOptionStock = option.stock;
          }
        }
      });
    });

    if (minOptionStock !== null) {
      return Math.max(0, minOptionStock);
    }
  }

  // 2. Fallback to base item stock if defined
  if (typeof item.stock === 'number' && !isNaN(item.stock)) {
    return Math.max(0, item.stock);
  }

  // 3. Unlimited / untracked stock
  return null;
}
