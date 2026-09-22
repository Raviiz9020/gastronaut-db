'use client';

import React from 'react';
import type { Vendor, MenuItem as MenuItemType } from '@/types';
import type { ActiveSpecialCategory } from './useVendorSpecials';
import { VendorSpecialBanner } from './VendorSpecialBanner';
import { MenuItemRow } from './MenuItemRow';

export interface VendorSpecialsSectionProps {
  special: ActiveSpecialCategory;
  vendor?: Vendor | null;
  getItemCartState: (itemId: string) => {
    simpleQuantity: number;
    totalQuantity: number;
    kitchenQuantity: number;
    kitchenRound?: number;
  };
  onImageClick: (item: MenuItemType, layoutId: string) => void;
  onRowClick: (item: MenuItemType) => void;
  onQuantityChange: (item: MenuItemType, delta: number) => void;
  onResetCategory: () => void;
  itemRefs?: React.RefObject<Record<string, HTMLDivElement | null>> | React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

/**
 * Dedicated section that renders dishes for an active vendor special.
 * Encapsulates the banner, theme styling, and menu item grid.
 */
export function VendorSpecialsSection({
  special,
  vendor,
  getItemCartState,
  onImageClick,
  onRowClick,
  onQuantityChange,
  onResetCategory,
  itemRefs,
}: VendorSpecialsSectionProps) {
  return (
    <div className="mb-10">
      {/* Visual banner for the special */}
      <VendorSpecialBanner special={special} onResetCategory={onResetCategory} />

      {/* Grid of dishes in this special */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {special.items.map((item) => {
          const cartState = getItemCartState(item.id);
          return (
            <MenuItemRow
              key={item.id}
              item={item}
              vendor={vendor}
              onImageClick={onImageClick}
              onRowClick={onRowClick}
              prefix="special-item-image"
              itemRef={(el) => {
                if (el && itemRefs?.current) itemRefs.current[item.id] = el;
              }}
              simpleQuantity={cartState.simpleQuantity}
              totalQuantity={cartState.totalQuantity}
              kitchenQuantity={cartState.kitchenQuantity}
              kitchenRound={cartState.kitchenRound}
              onQuantityChange={onQuantityChange}
            />
          );
        })}
      </div>
    </div>
  );
}
